import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const RAINFOREST_API = 'https://api.rainforestapi.com/request';

app.get('/api/rainforest', async (req, res) => {
  try {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') params.set(key, value);
    }

    const response = await fetch(`${RAINFOREST_API}?${params}`, {
      headers: { Accept: 'application/json' },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({
      request_info: {
        success: false,
        message: error instanceof Error ? error.message : 'Proxy request failed',
      },
    });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));

app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
