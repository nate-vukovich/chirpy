import express from 'express';
import type { Express, Request, Response, NextFunction } from 'express';

import { config } from './config.js';

import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
  }
}

class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const app: Express = express();
const PORT = process.env.PORT || 8080;

// MIDDLEWARES
app.use(middlewareLogResponses);
app.use('/app', middlewareMetricsInc);

// EXPRESS USE CONFIGS
app.use(express.json());
app.use('/app', express.static('./src/app'));

app.get('/api/healthz', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send('OK');
});

app.get('/admin/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(`<html lang="en">
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${config.api.fileserverHits} times!</p>
  </body>
</html>`);
});

app.post('/admin/reset', (_, res: Response) => {
  config.api.fileserverHits = 0;

  res.send();
});

app.post('/api/validate_chirp', (req: Request, res: Response) => {
  const { body: parsedBody } = req.body;

  if (parsedBody.length > 140) {
    throw new BadRequestError('Chirp is too long. Max length is 140');
  } else {
    const bodyWords = parsedBody.split(' ');

    const cleanedWords = bodyWords
      .map((word: string) => {
        if (word.toLowerCase() === 'kerfuffle') {
          return '****';
        }

        if (word.toLowerCase() === 'sharbert') {
          return '****';
        }

        if (word.toLowerCase() === 'fornax') {
          return '****';
        }

        return word;
      })
      .join(' ');

    console.log('cleaned', cleanedWords);

    res.send({
      cleanedBody: cleanedWords,
    });
  }
});

// CREATE USER
app.post(
  '/api/users',
  (
    req: Request<{ email: string }>,
    res: Response<{
      id: string;
      email: string;
      createdAt: string;
      updatedAt: string;
    }>
  ) => {
    const { email } = req.body;

    console.log('email', email);



    res.status(201).send({
      id: '50746277-23c6-4d85-a890-564c0044c2fb',
      email: 'user@example.com',
      createdAt: '2021-07-07T00:00:00Z',
      updatedAt: '2021-07-07T00:00:00Z',
    });
  }
);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

function middlewareLogResponses(
  req: Request,
  res: Response,
  next: NextFunction
) {
  res.on('finish', () => {
    const statusCode = res.statusCode;

    if (statusCode !== 200) {
      console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${statusCode}`);
    }
  });

  next();
}

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
  config.api.fileserverHits += 1;

  next();
}

function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log('Error: ', err);

  if (err instanceof BadRequestError) {
    res.status(400).json({
      error: err.message,
    });
  }

  if (err instanceof UnauthorizedError) {
    res.status(401).json({
      error: err.message,
    });
  }

  if (err instanceof ForbiddenError) {
    res.status(403).json({
      error: err.message,
    });
  }
  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: err.message,
    });
  }

  res.status(500).json({
    error: 'Something went wrong on our end',
  });

  next();
}
