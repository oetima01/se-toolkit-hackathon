import { useState, useEffect } from 'react';
import { Container, Nav, Button, Modal } from 'react-bootstrap';
import SetList from './components/SetList';
import CardCreator from './components/CardCreator';
import FlashcardView from './components/FlashcardView';
import './App.css';

function App() {
  const [view, setView] = useState('home');
  const [sets, setSets] = useState([]);
  const [currentSet, setCurrentSet] = useState(null);
  const [reviewLevel, setReviewLevel] = useState('flip');
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [pendingSet, setPendingSet] = useState(null);
  const [pendingMode, setPendingMode] = useState('review');

  const fetchSets = async () => {
    try {
      const res = await fetch('/api/sets');
      const data = await res.json();
      setSets(data);
    } catch (err) {
      console.error('Failed to fetch sets:', err);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const handleSelectSet = (setId, mode = 'review') => {
    const selectedSet = sets.find(s => s.id === setId);
    setPendingSet(selectedSet);
    setPendingMode(mode);
    setShowModeSelect(true);
  };

  const handleStartReview = async (level) => {
    setShowModeSelect(false);
    setReviewLevel(level);
    try {
      if (pendingMode === 'study') {
        const res = await fetch(`/api/sets/${pendingSet.id}/study`);
        const data = await res.json();
        setCurrentSet(data);
      } else {
        const res = await fetch(`/api/sets/${pendingSet.id}`);
        const data = await res.json();
        setCurrentSet(data);
      }
      setView(pendingMode === 'study' ? 'study' : 'review');
    } catch (err) {
      console.error('Failed to fetch set:', err);
    }
    setPendingSet(null);
  };

  const handleStudy = (setId) => {
    handleSelectSet(setId, 'study');
  };

  const handleNextLevel = async () => {
    let nextLevel = 'type';
    if (reviewLevel === 'flip') nextLevel = 'choose';
    else if (reviewLevel === 'choose') nextLevel = 'type';

    setReviewLevel(nextLevel);
    try {
      const res = await fetch(`/api/sets/${currentSet.id}`);
      const data = await res.json();
      setCurrentSet(data);
    } catch (err) {
      console.error('Failed to reload set:', err);
    }
  };

  const handleDeleteSet = async (setId) => {
    try {
      await fetch(`/api/sets/${setId}`, { method: 'DELETE' });
      fetchSets();
      if (currentSet && currentSet.id === setId) {
        setCurrentSet(null);
        setView('home');
      }
    } catch (err) {
      console.error('Failed to delete set:', err);
    }
  };

  const handleSetSaved = () => {
    fetchSets();
    setView('home');
  };

  return (
    <div className="min-vh-100 bg-light">
      <Container className="py-4">
        <h1 className="text-center mb-4">Memory Card Generator</h1>
        <Nav
          variant="tabs"
          className="justify-content-center mb-4"
          activeKey={view === 'review' || view === 'study' ? 'home' : view}
          onSelect={(key) => {
            if (key === 'create') setView('create');
            else if (key === 'home') {
              setView('home');
              setCurrentSet(null);
            }
          }}
        >
          <Nav.Item>
            <Nav.Link eventKey="home">My Sets</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="create">Create New Set</Nav.Link>
          </Nav.Item>
        </Nav>

        {view === 'home' && (
          <SetList
            sets={sets}
            onSelect={handleSelectSet}
            onDelete={handleDeleteSet}
            onCreateNew={() => setView('create')}
            onStudy={handleStudy}
          />
        )}
        {view === 'create' && <CardCreator onSaved={handleSetSaved} />}
        {view === 'review' && currentSet && (
          <FlashcardView key={`${currentSet.id}-${reviewLevel}`} set={currentSet} onBack={() => { setCurrentSet(null); setView('home'); }} reviewLevel={reviewLevel} onNextLevel={handleNextLevel} />
        )}
        {view === 'study' && currentSet && (
          <FlashcardView key={`${currentSet.id}-${reviewLevel}`} set={currentSet} onBack={() => { setCurrentSet(null); setView('home'); }} studyMode="study" reviewLevel={reviewLevel} onNextLevel={handleNextLevel} />
        )}

        {/* Review Level Selection Modal */}
        <Modal show={showModeSelect} onHide={() => setShowModeSelect(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Choose Review Mode</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center">
            <p className="text-muted mb-3">How do you want to review <strong>{pendingSet?.name}</strong>?</p>
            <Button
              variant="outline-primary"
              className="w-100 mb-2 p-3"
              onClick={() => handleStartReview('flip')}
            >
              <div className="fw-bold">🔄 Flip Cards</div>
              <small className="text-muted">Click to flip and self-rate</small>
            </Button>
            <Button
              variant="outline-info"
              className="w-100 mb-2 p-3"
              onClick={() => handleStartReview('choose')}
            >
              <div className="fw-bold">🔘 Choose Answer</div>
              <small className="text-muted">Pick the correct answer from 4 options</small>
            </Button>
            <Button
              variant="outline-success"
              className="w-100 p-3"
              onClick={() => handleStartReview('type')}
            >
              <div className="fw-bold">✍️ Type Answer</div>
              <small className="text-muted">Write your answer from memory</small>
            </Button>
          </Modal.Body>
        </Modal>
      </Container>
    </div>
  );
}

export default App;
