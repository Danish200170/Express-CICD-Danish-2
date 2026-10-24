const express = require('express');
const axios = require('axios');

const app = express();
const PORT = Number(process.env.PORT || 3000);
// Compose service DNS name; localhost inside this container means the frontend itself.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'frontend' });
});

app.get('/', (_req, res) => {
  res.render('index', { result: null, error: null, form: {} });
});

app.post('/submit', async (req, res) => {
  const form = {
    name: String(req.body.name || '').trim(),
    email: String(req.body.email || '').trim(),
    message: String(req.body.message || '').trim()
  };

  if (!form.name || !form.email || !form.message) {
    return res.status(400).render('index', {
      result: null,
      error: 'Please fill in all fields before submitting.',
      form
    });
  }

  try {
    const response = await axios.post(`${BACKEND_URL}/api/submit`, form, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    return res.status(200).render('index', {
      result: response.data,
      error: null,
      form
    });
  } catch (err) {
    const backendMessage = err.response?.data?.error;
    const message = backendMessage || 'The Flask backend could not be reached. Check that both Compose services are running.';
    return res.status(502).render('index', { result: null, error: message, form });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend listening on port ${PORT}; backend URL: ${BACKEND_URL}`);
});
