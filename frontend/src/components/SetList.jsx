import { Container, ListGroup, Button, Badge, Modal, Table } from 'react-bootstrap';
import { useState } from 'react';

function SetList({ sets, onSelect, onDelete, onCreateNew, onStudy }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisSet, setAnalysisSet] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  const handleAnalysis = (set) => {
    const key = `sessionHistory_${set.id}`;
    const saved = localStorage.getItem(key);
    setAnalysisSet(set);
    setAnalysisHistory(saved ? JSON.parse(saved) : []);
    setShowAnalysis(true);
  };

  if (sets.length === 0) {
    return (
      <Container className="text-center py-5">
        <h4 className="text-muted">No card sets yet</h4>
        <p className="text-muted">Create your first set to start learning!</p>
        <Button variant="primary" onClick={onCreateNew}>Create a Set</Button>
      </Container>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Your Sets</h5>
        <Button variant="outline-primary" size="sm" onClick={onCreateNew}>+ New Set</Button>
      </div>
      <ListGroup>
        {sets.map((set) => (
          <ListGroup.Item key={set.id} className="d-flex justify-content-between align-items-center">
            <div style={{ flex: 1 }}>
              <div
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(set.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect(set.id); }}
              >
                <strong>{set.name}</strong>{' '}
                <Badge bg="secondary">{set.card_count} card{set.card_count !== 1 ? 's' : ''}</Badge>
              </div>
              <div className="text-muted small">
                {new Date(set.created_at).toLocaleDateString()} {new Date(set.created_at).toLocaleTimeString()}
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-warning"
                size="sm"
                onClick={() => handleAnalysis(set)}
              >
                📊 Analysis
              </Button>
              <Button
                variant="outline-info"
                size="sm"
                onClick={() => onStudy(set.id)}
              >
                📖 Study
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => onDelete(set.id)}
              >
                Delete
              </Button>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>

      {/* Analysis Modal */}
      <Modal show={showAnalysis} onHide={() => setShowAnalysis(false)} centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>📊 {analysisSet?.name} — Analysis</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {analysisHistory.length === 0 ? (
            <p className="text-muted text-center">No sessions recorded yet. Review this set to see your progress.</p>
          ) : (
            <Table bordered size="sm" className="text-start">
              <thead>
                <tr>
                  <th>#</th>
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
                {analysisHistory.map((s, idx) => (
                  <tr key={idx} className={idx === 0 ? 'table-primary' : ''}>
                    <td>{analysisHistory.length - idx}</td>
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
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAnalysis(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default SetList;
