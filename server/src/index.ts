import express from 'express';

const app = express();
const PORT = 3000;

app.set('json spaces', 2)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
