const express = require('express');
const cors = require('cors');
const setsRoutes = require('./routes/sets');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/sets', setsRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Memory Card Generator API',
    endpoints: {
      health: 'GET /api/health',
      listSets: 'GET /api/sets',
      createSet: 'POST /api/sets',
      getSet: 'GET /api/sets/:id',
      deleteSet: 'DELETE /api/sets/:id'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Memory Card Generator API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
