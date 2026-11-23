import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { serverConfig } from './src/server/config';
import { apiRouter, handleStripeWebhook } from './src/server/routes';

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Stripe webhook requires the raw unparsed request body for signature verification
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    (req, res) => {
      void handleStripeWebhook(req, res);
    },
  );

  app.use(express.json({ limit: '1mb' }));
  app.use('/api', apiRouter);

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(serverConfig.port, '0.0.0.0', () => {
    console.log(`Botanical Roast server running on http://0.0.0.0:${serverConfig.port}`);
  });
}

void startServer();
