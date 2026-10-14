import express from 'express';

import type { Express, Request, Response, NextFunction } from 'express';

import { config } from './config.js';

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
    <p>Chirpy has been visited ${config.fileserverHits} times!</p>
  </body>
</html>`);
});

app.post('/admin/reset', (_, res: Response) => {
  config.fileserverHits = 0;

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
  config.fileserverHits += 1;

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
