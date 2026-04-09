import { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Container, Badge, Table, Alert } from 'react-bootstrap';

const RETENTION_COLORS = {
  0: { bg: '#6c757d', label: 'Not reviewed' },
  1: { bg: '#dc3545', label: 'Struggling' },
  2: { bg: '#ffc107', label: 'Learning' },
  3: { bg: '#198754', label: 'Mastered' }
};

function FlashcardView({ set, onBack, studyMode = 'normal', reviewLevel = 'flip', onNextLevel }) {
  const initialCards = set.cards || [];
  const [cards, setCards] = useState(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
  const [sessionResults, setSessionResults] = useState([]);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [incorrectCards, setIncorrectCards] = useState([]);
  const [round, setRound] = useState(1);
  const [round1Results, setRound1Results] = useState([]);

  // Multiple choice state
  const [selectedOption, setSelectedOption] = useState(null);
  const [optionChecked, setOptionChecked] = useState(false);
  const isProcessing = useRef(false);

  useEffect(() => {
    const key = `sessionHistory_${set.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      setSessionHistory(JSON.parse(saved));
    }
  }, [set.id]);

  const current = cards[currentIndex];
  const total = cards.length;

  if (!current || total === 0) {
    return (
      <Container className="text-center py-5">
        <h4 className="text-muted">No cards in this set</h4>
        <Button variant="primary" onClick={onBack}>Back to Sets</Button>
      </Container>
    );
  }

  const retention = getRetention(current);

  const handleFlip = () => setFlipped((prev) => !prev);

  // Generate options for current card using useMemo
  const options = useMemo(() => {
    if (reviewLevel !== 'choose' || !current) return [];
    const correctAnswer = current.answer;
    const otherAnswers = cards
      .filter((c) => c.id !== current.id)
      .map((c) => c.answer)
      .filter((a, i, arr) => a !== correctAnswer && arr.indexOf(a) === i);

    const shuffled = otherAnswers.sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, 1);

    while (distractors.length < 1) {
      distractors.push(`Option ${distractors.length + 1}`);
    }

    const allOptions = [correctAnswer, ...distractors];
    allOptions.sort(() => Math.random() - 0.5);
    return allOptions;
  }, [currentIndex, reviewLevel, cards.length]);

  // Reset selection when options change
  useEffect(() => {
    setSelectedOption(null);
    setOptionChecked(false);
  }, [currentIndex, reviewLevel]);

  const handleOptionClick = (option) => {
    if (optionChecked || isProcessing.current) return;
    setSelectedOption(option);
    setOptionChecked(true);
    const isCorrect = option === current.answer;
    handleRating(isCorrect);
  };

  const handleRating = async (correct) => {
    if (isProcessing.current) return;
    isProcessing.current = true;

    setSessionResults((prev) => [...prev, { question: current.question, correct }]);

    setStats((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1)
    }));
    setReviewed((prev) => prev + 1);

    setCards((prev) =>
      prev.map((c, i) =>
        i === currentIndex
          ? {
              ...c,
              correct_count: c.correct_count + (correct ? 1 : 0),
              incorrect_count: c.incorrect_count + (correct ? 0 : 1),
              last_reviewed: new Date().toISOString()
            }
          : c
      )
    );

    try {
      await fetch(`/api/sets/${set.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: current.id, correct })
      });
    } catch (err) {
      console.error('Failed to log review:', err);
    }

    if (currentIndex === total - 1) {
      // Check if there are incorrect cards to review
      setSessionResults((prev) => {
        const wrongAnswers = prev.filter((r) => !r.correct);
        if (wrongAnswers.length > 0 && round === 1) {
          // Save round 1 results
          setRound1Results([...prev]);
          // Collect incorrect cards for re-review
          const wrongIds = new Set(wrongAnswers.map((r) => r.question));
          const wrongCards = initialCards.filter((c) => wrongIds.has(c.question));
          setIncorrectCards(wrongCards);
          // Start round 2 with incorrect cards
          setTimeout(() => {
            setCards(wrongCards);
            setCurrentIndex(0);
            setRound(2);
            setReviewed(0);
            setStats({ correct: 0, incorrect: 0 });
            setSessionResults([]);
            setFlipped(false);
            setUserAnswer('');
            setAnswerSubmitted(false);
            setSelectedOption(null);
            setOptionChecked(false);
            isProcessing.current = false;
          }, 1200);
        } else {
          setDone(true);
          setTimeout(() => {
            isProcessing.current = false;
          }, 100);
        }
        return prev;
      });
    } else {
      setTimeout(() => {
        isProcessing.current = false;
        setCurrentIndex((prev) => prev + 1);
        setFlipped(false);
        setUserAnswer('');
        setAnswerSubmitted(false);
        setSelectedOption(null);
        setOptionChecked(false);
      }, 1200);
    }
  };

  const handleSubmitAnswer = () => {
    const userAns = userAnswer.trim().toLowerCase().replace(/[.!?]$/, '');
    const correctAns = current.answer.trim().toLowerCase().replace(/[.!?]$/, '');
    const isCorrect = userAns === correctAns || levenshteinSimilarity(userAns, correctAns) > 0.75;
    handleRating(isCorrect);
  };

  const handleRestart = () => {
    isProcessing.current = false;
    // Save current session to history before restarting
    const totalRated = stats.correct + stats.incorrect;
    const currentAccuracy = totalRated > 0 ? Math.round((stats.correct / totalRated) * 100) : 0;
    const levelNames = { flip: 'Flip', choose: 'Choose', type: 'Written' };

    const session = {
      date: new Date().toLocaleString(),
      correct: stats.correct,
      incorrect: stats.incorrect,
      accuracy: currentAccuracy,
      total,
      level: levelNames[reviewLevel] || 'Flip'
    };
    const updatedHistory = [session, ...sessionHistory].slice(0, 5);
    const key = `sessionHistory_${set.id}`;
    localStorage.setItem(key, JSON.stringify(updatedHistory));
    setSessionHistory(updatedHistory);

    setDone(false);
    setCurrentIndex(0);
    setRound(1);
    setCards(initialCards);
    setIncorrectCards([]);
    setRound1Results([]);
    setReviewed(0);
    setStats({ correct: 0, incorrect: 0 });
    setFlipped(false);
    setSessionResults([]);
    setUserAnswer('');
    setAnswerSubmitted(false);
    setSelectedOption(null);
    setOptionChecked(false);
  };

  if (done) {
    // Combine results from all rounds
    const allResults = round === 2 ? [...round1Results, ...sessionResults] : sessionResults;
    const totalRated = allResults.length;
    const totalCorrect = allResults.filter((r) => r.correct).length;
    const totalIncorrect = totalRated - totalCorrect;
    const currentAccuracy = totalRated > 0 ? Math.round((totalCorrect / totalRated) * 100) : 0;
    const lastAccuracy = initialCards.length > 0 ? getSessionAccuracy(initialCards) : 0;

    const levelNames = { flip: 'Flip', choose: 'Choose', type: 'Written' };

    const session = {
      date: new Date().toLocaleString(),
      correct: totalCorrect,
      incorrect: totalIncorrect,
      accuracy: currentAccuracy,
      total: initialCards.length,
      level: levelNames[reviewLevel] || 'Flip',
      rounds: round
    };

    // Check if this session was already saved (by handleRestart or previous render)
    const alreadySaved = sessionHistory.length > 0 && sessionHistory[0]?.date === session.date;
    const updatedHistory = alreadySaved ? sessionHistory : [session, ...sessionHistory].slice(0, 5);
    const key = `sessionHistory_${set.id}`;
    localStorage.setItem(key, JSON.stringify(updatedHistory));
    if (!alreadySaved) setSessionHistory(updatedHistory);

    return (
      <Container className="text-center py-3">
        <h3>🎉 Session Complete!</h3>
        <p className="fs-6 text-muted">
          {round} round{round > 1 ? 's' : ''} — {initialCards.length} card{initialCards.length !== 1 ? 's' : ''} reviewed.
        </p>

        <div className="d-flex justify-content-center gap-4 my-3">
          {lastAccuracy > 0 && (
            <div className="text-muted">Last time: <strong>{lastAccuracy}%</strong></div>
          )}
          <div>Overall: <strong className={currentAccuracy >= lastAccuracy ? 'text-success' : 'text-danger'}>{currentAccuracy}%</strong></div>
        </div>

        {round === 2 && (
          <>
            <h6 className="text-start mt-4 mb-2">Round 1 — All Cards ({round1Results.length})</h6>
            <Table bordered size="sm" className="text-start mb-3">
              <tbody>
                {round1Results.map((r, idx) => (
                  <tr key={idx} className={r.correct ? 'table-success' : 'table-danger'}>
                    <td>{idx + 1}</td>
                    <td>{r.question}</td>
                    <td>{r.correct ? '✓' : '✗'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <h6 className="text-start mt-3 mb-2">Round 2 — Re-review ({sessionResults.length})</h6>
          </>
        )}

        <h6 className="text-start mt-4 mb-2">Round {round} Results</h6>
        <Table bordered hover size="sm" className="text-start">
          <thead>
            <tr>
              <th>#</th>
              <th>Question</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {sessionResults.map((r, idx) => (
              <tr key={idx} className={r.correct ? 'table-success' : 'table-danger'}>
                <td>{idx + 1}</td>
                <td>{r.question}</td>
                <td>{r.correct ? '✓ Correct' : '✗ Wrong'}</td>
              </tr>
            ))}
          </tbody>
        </Table>

        {round === 2 && sessionResults.some((r) => !r.correct) && (
          <Alert variant="warning" className="mt-3">
            Some cards still answered incorrectly. Try "Review Again" to practice more.
          </Alert>
        )}

        {updatedHistory.length > 0 && (
          <>
            <h6 className="text-start mt-4 mb-2">Last {updatedHistory.length} session{updatedHistory.length > 1 ? 's' : ''}</h6>
            <Table bordered size="sm" className="text-start">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Cards</th>
                  <th>Correct</th>
                  <th>Incorrect</th>
                  <th>Accuracy</th>
                  <th>Mode</th>
                  <th>Rounds</th>
                </tr>
              </thead>
              <tbody>
                {updatedHistory.map((s, idx) => (
                  <tr key={idx} className={idx === 0 ? 'table-primary' : ''}>
                    <td>{s.date}</td>
                    <td>{s.total}</td>
                    <td>{s.correct}</td>
                    <td>{s.incorrect}</td>
                    <td><strong>{s.accuracy}%</strong></td>
                    <td>{s.level || 'Flip'}</td>
                    <td>{s.rounds || 1}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}

        <div className="mt-3 d-flex flex-wrap justify-content-center gap-2">
          <Button variant="primary" onClick={onBack}>Back to Sets</Button>
          <Button variant="outline-primary" onClick={handleRestart}>Review Again</Button>
          {reviewLevel === 'flip' && onNextLevel && (
            <Button variant="outline-info" onClick={onNextLevel}>🔘 Next: Choose Answer</Button>
          )}
          {reviewLevel === 'choose' && onNextLevel && (
            <Button variant="success" onClick={onNextLevel}>✍️ Next: Type Answer</Button>
          )}
        </div>
      </Container>
    );
  }

  return (
    <Container className="text-center">
      <h4 className="mb-1">{set.name}</h4>
      {studyMode === 'study' && <Badge bg="info" className="mb-2">Study Mode — Weakest cards first</Badge>}
      {round === 2 && (
        <Badge bg="warning" text="dark" className="mb-2">Round 2 — Re-reviewing incorrect cards</Badge>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button variant="outline-secondary" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <span className="text-muted">
          Card {currentIndex + 1} of {total}
        </span>
        <span className="text-muted small">Reviewed: {reviewed}</span>
      </div>

      {/* LEVEL 1: Flip card mode */}
      {reviewLevel === 'flip' && (
        <div
          className={`flashcard ${flipped ? 'flipped' : ''}`}
          onClick={handleFlip}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFlip(); }}
          aria-label={flipped ? 'Showing answer' : 'Showing question'}
          style={{ borderColor: RETENTION_COLORS[retention].bg, borderWidth: 3, borderStyle: 'solid' }}
        >
          <div className="flashcard-inner">
            <div className="flashcard-front">
              <div className="d-flex justify-content-between w-100 px-3 mb-2">
                <Badge style={{ backgroundColor: RETENTION_COLORS[retention].bg }}>
                  {RETENTION_COLORS[retention].label}
                </Badge>
              </div>
              <h6 className="text-muted mb-2">Question:</h6>
              <p className="fs-5">{current.question}</p>
              <small className="text-muted">Click to reveal answer</small>
              {current.correct_count + current.incorrect_count > 0 && (
                <small className="text-muted mt-2">
                  Previous: {getCardAccuracy(current)}%
                </small>
              )}
            </div>
            <div className="flashcard-back">
              <h6 className="mb-2">Answer:</h6>
              <p className="fs-5">{current.answer}</p>
              <small>Click to see question</small>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 2: Multiple choice mode */}
      {reviewLevel === 'choose' && (
        <div
          className="flashcard"
          style={{ borderColor: RETENTION_COLORS[retention].bg, borderWidth: 3, borderStyle: 'solid', cursor: 'default' }}
        >
          <div className="flashcard-inner">
            <div className="flashcard-front" style={{ justifyContent: 'flex-start' }}>
              <div className="d-flex justify-content-between w-100 px-3 mb-2">
                <Badge style={{ backgroundColor: RETENTION_COLORS[retention].bg }}>
                  {RETENTION_COLORS[retention].label}
                </Badge>
              </div>
              <h6 className="text-muted mb-3">Question:</h6>
              <p className="fs-5">{current.question}</p>

              <div className="w-100 px-2 mt-3">
                {options.map((option, idx) => {
                  let btnVariant = 'outline-secondary';
                  if (optionChecked) {
                    if (option === current.answer) {
                      btnVariant = 'success';
                    } else if (option === selectedOption) {
                      btnVariant = 'danger';
                    }
                  }
                  return (
                    <Button
                      key={idx}
                      variant={btnVariant}
                      className="w-100 mb-2 text-start"
                      onClick={() => handleOptionClick(option)}
                      disabled={optionChecked}
                      style={{ whiteSpace: 'normal', height: 'auto' }}
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 3: Type answer mode */}
      {reviewLevel === 'type' && (
        <div
          className="flashcard"
          style={{ borderColor: RETENTION_COLORS[retention].bg, borderWidth: 3, borderStyle: 'solid', cursor: 'default' }}
        >
          <div className="flashcard-inner">
            <div className="flashcard-front" style={{ justifyContent: 'flex-start' }}>
              <div className="d-flex justify-content-between w-100 px-3 mb-2">
                <Badge style={{ backgroundColor: RETENTION_COLORS[retention].bg }}>
                  {RETENTION_COLORS[retention].label}
                </Badge>
              </div>
              <h6 className="text-muted mb-2">Question:</h6>
              <p className="fs-5">{current.question}</p>

              {!answerSubmitted ? (
                <div className="w-100 px-3 mt-3">
                  <textarea
                    className="form-control mb-2"
                    rows={3}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    style={{ fontSize: '1rem' }}
                  />
                  <Button variant="primary" onClick={handleSubmitAnswer} disabled={!userAnswer.trim()}>
                    Submit Answer
                  </Button>
                </div>
              ) : (
                <div className="w-100 px-3 mt-3">
                  <div className="p-2 border rounded bg-light mb-2 text-start">
                    <strong>Your answer:</strong> {userAnswer}
                  </div>
                  <div className="p-2 border rounded text-start" style={{ borderColor: RETENTION_COLORS[3].bg, backgroundColor: '#e8f5e9' }}>
                    <strong>Correct answer:</strong> {current.answer}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rating buttons for flip mode */}
      {reviewLevel === 'flip' && flipped && (
        <div className="d-flex justify-content-center gap-3 mt-4">
          <Button variant="outline-danger" onClick={() => handleRating(false)}>
            ✗ Still Learning
          </Button>
          <Button variant="outline-success" onClick={() => handleRating(true)}>
            ✓ Got It
          </Button>
        </div>
      )}

      {/* Result for type mode (auto-checked) */}
      {reviewLevel === 'type' && answerSubmitted && (
        <div className="mt-4">
          {sessionResults.length > 0 && sessionResults[sessionResults.length - 1]?.correct !== undefined && (
            <div className={`alert ${sessionResults[sessionResults.length - 1].correct ? 'alert-success' : 'alert-danger'} py-2`}>
              {sessionResults[sessionResults.length - 1].correct ? '✓ Correct!' : '✗ Wrong'}
            </div>
          )}
        </div>
      )}
    </Container>
  );
}

function getRetention(card) {
  if (!card || (card.correct_count === 0 && card.incorrect_count === 0)) return 0;
  if (card.incorrect_count === 0) return 3;
  if (card.correct_count > card.incorrect_count * 2) return 3;
  if (card.correct_count >= card.incorrect_count) return 2;
  return 1;
}

function getCardAccuracy(card) {
  const total = card.correct_count + card.incorrect_count;
  if (total === 0) return 0;
  return Math.round((card.correct_count / total) * 100);
}

function getSessionAccuracy(cards) {
  const totalCorrect = cards.reduce((sum, c) => sum + c.correct_count, 0);
  const totalIncorrect = cards.reduce((sum, c) => sum + c.incorrect_count, 0);
  const total = totalCorrect + totalIncorrect;
  if (total === 0) return 0;
  return Math.round((totalCorrect / total) * 100);
}

function levenshteinSimilarity(a, b) {
  const lenA = a.length;
  const lenB = b.length;
  if (lenA === 0) return lenB === 0 ? 1 : 0;
  if (lenB === 0) return 0;

  const dp = Array.from({ length: lenA + 1 }, () => Array(lenB + 1).fill(0));
  for (let i = 0; i <= lenA; i++) dp[i][0] = i;
  for (let j = 0; j <= lenB; j++) dp[0][j] = j;

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  const maxLen = Math.max(lenA, lenB);
  return 1 - dp[lenA][lenB] / maxLen;
}

export default FlashcardView;
