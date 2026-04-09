const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/sets — list all sets with card count
router.get('/', (req, res) => {
  db.all(
    `SELECT sets.id, sets.name, sets.created_at, COUNT(cards.id) as card_count
     FROM sets
     LEFT JOIN cards ON sets.id = cards.set_id
     GROUP BY sets.id
     ORDER BY sets.created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// POST /api/sets — create a new set with cards
router.post('/', (req, res) => {
  const { name, cards } = req.body;
  if (!name || !cards || !Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ error: 'Name and at least one card are required' });
  }

  db.run('INSERT INTO sets (name) VALUES (?)', [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const setId = this.lastID;

    const stmt = db.prepare('INSERT INTO cards (set_id, question, answer) VALUES (?, ?, ?)');
    cards.forEach((card) => {
      stmt.run(setId, card.question, card.answer);
    });
    stmt.finalize((err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: setId, name, cardCount: cards.length });
    });
  });
});

// GET /api/sets/:id — get a single set with all its cards
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM sets WHERE id = ?', [req.params.id], (err, set) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!set) return res.status(404).json({ error: 'Set not found' });

    db.all(
      `SELECT id, question, answer, correct_count, incorrect_count, last_reviewed
       FROM cards WHERE set_id = ?`,
      [req.params.id],
      (err, cards) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ...set, cards });
      }
    );
  });
});

// DELETE /api/sets/:id — delete a set and its cards
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM sets WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Set not found' });
    res.json({ message: 'Set deleted' });
  });
});

// POST /api/sets/:id/review — log a card review (correct/incorrect)
router.post('/:id/review', (req, res) => {
  const { cardId, correct } = req.body;
  if (!cardId || correct === undefined) {
    return res.status(400).json({ error: 'cardId and correct are required' });
  }

  const column = correct ? 'correct_count' : 'incorrect_count';
  const now = new Date().toISOString();

  db.run(
    `UPDATE cards SET ${column} = ${column} + 1, last_reviewed = ? WHERE id = ?`,
    [now, cardId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        'INSERT INTO review_log (card_id, correct) VALUES (?, ?)',
        [cardId, correct ? 1 : 0],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Review logged' });
        }
      );
    }
  );
});

// GET /api/sets/:id/study — get cards ordered by spaced repetition priority
// Cards with more incorrect answers and older review dates appear first
router.get('/:id/study', (req, res) => {
  db.get('SELECT * FROM sets WHERE id = ?', [req.params.id], (err, set) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!set) return res.status(404).json({ error: 'Set not found' });

    db.all(
      `SELECT id, question, answer, correct_count, incorrect_count, last_reviewed,
              CASE
                WHEN incorrect_count = 0 AND correct_count = 0 THEN 0
                WHEN incorrect_count = 0 THEN 3
                WHEN correct_count > incorrect_count * 2 THEN 3
                WHEN correct_count >= incorrect_count THEN 2
                ELSE 1
              END as retention_level
       FROM cards WHERE set_id = ?
       ORDER BY
         incorrect_count DESC,
         CASE WHEN last_reviewed IS NULL THEN 0 ELSE 1 END,
         last_reviewed ASC`,
      [req.params.id],
      (err, cards) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ...set, cards });
      }
    );
  });
});

// GET /api/sets/:id/stats — get overall statistics for a set
router.get('/:id/stats', (req, res) => {
  db.get('SELECT * FROM sets WHERE id = ?', [req.params.id], (err, set) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!set) return res.status(404).json({ error: 'Set not found' });

    db.get(
      `SELECT
         COUNT(*) as total_cards,
         COALESCE(SUM(correct_count), 0) as total_correct,
         COALESCE(SUM(incorrect_count), 0) as total_incorrect,
         COUNT(CASE WHEN correct_count > incorrect_count THEN 1 END) as mastered,
         COUNT(CASE WHEN incorrect_count > correct_count THEN 1 END) as needs_review,
         COUNT(CASE WHEN correct_count = 0 AND incorrect_count = 0 THEN 1 END) as not_reviewed
       FROM cards WHERE set_id = ?`,
      [req.params.id],
      (err, stats) => {
        if (err) return res.status(500).json({ error: err.message });
        const total = stats.total_correct + stats.total_incorrect;
        stats.accuracy = total > 0 ? Math.round((stats.total_correct / total) * 100) : 0;
        res.json({ ...set, ...stats });
      }
    );
  });
});

module.exports = router;
