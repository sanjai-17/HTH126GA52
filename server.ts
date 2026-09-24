import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Request parsing
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Mount backend API routes under /api
  app.use('/api', apiRouter);

  // In production, serve Vite build artifacts from /dist
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // In development, mount Vite's dev server middleware
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Code Review & Release-Risk Assistant] running on http://0.0.0.0:${PORT}`);
    console.log(`- LLM Provider: ${process.env.LLM_PROVIDER || 'ollama'}`);
    console.log(`- Ollama Base URL: ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}`);
    console.log(`- Demo Mode: ${process.env.DEMO_MODE || 'true'}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting application server:', err);
  process.exit(1);
});
