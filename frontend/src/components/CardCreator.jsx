import { useState } from 'react';
import { Form, Button, ListGroup, Row, Col, Alert } from 'react-bootstrap';

function CardCreator({ onSaved }) {
  const [setName, setSetName] = useState('');
  const [cards, setCards] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setCards((prev) => [...prev, { question: question.trim(), answer: answer.trim() }]);
    setQuestion('');
    setAnswer('');
  };

  const handleSave = async () => {
    if (!setName.trim() || cards.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: setName.trim(), cards })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeCard = (idx) => {
    setCards((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {/* Set name */}
      <Form.Group className="mb-3">
        <Form.Label>Set Name</Form.Label>
        <Form.Control
          value={setName}
          onChange={(e) => setSetName(e.target.value)}
          placeholder="e.g. Biology Chapter 5"
        />
      </Form.Group>

      {/* Manual card input */}
      <Form onSubmit={handleAddCard} className="mb-4">
        <Form.Group className="mb-3">
          <Form.Label>Question</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter question..."
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Answer</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter answer..."
          />
        </Form.Group>
        <Button type="submit" variant="secondary" disabled={!question.trim() || !answer.trim()}>
          + Add Card
        </Button>
      </Form>

      {cards.length > 0 && (
        <>
          <h5 className="mb-3">Cards in this set ({cards.length})</h5>
          <ListGroup className="mb-3">
            {cards.map((card, idx) => (
              <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Q:</strong> {card.question}{' '}
                  <span className="text-muted">|</span>{' '}
                  <strong>A:</strong> {card.answer}
                </div>
                <Button variant="outline-danger" size="sm" onClick={() => removeCard(idx)}>×</Button>
              </ListGroup.Item>
            ))}
          </ListGroup>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!setName.trim() || saving}
            className="me-2"
          >
            {saving ? 'Saving...' : 'Save Set to Database'}
          </Button>
          <Button variant="outline-danger" onClick={() => { setCards([]); setSetName(''); }}>
            Clear
          </Button>
        </>
      )}

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
    </div>
  );
}

export default CardCreator;
