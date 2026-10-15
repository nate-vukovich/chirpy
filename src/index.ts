import express from 'express';
import postgres from 'postgres';

import type { Express, Request, Response, NextFunction } from 'express';
import type { NewChirp } from './db/schema.js';

import { config } from './config.js';

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';

import { createUser, deleteAllUsers, getUser } from './db/queries/users.js';
import {
  createNewChirp,
  getAllChirps,
  getChirpById,
} from './db/queries/chirps.js';

import {
  checkPasswordHash,
  getBearerToken,
  hashPassword,
  makeJWT,
  validateJWT,
} from './auth.js';

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

app.post('/admin/reset', async (_, res: Response) => {
  config.api.fileserverHits = 0;

  if (config.api.platform !== 'dev') {
    throw new ForbiddenError('Forbidden');
  }

  await deleteAllUsers();

  res.send();
});

// CREATE USER
app.post(
  '/api/users',
  async (
    req: Request<{ email: string; password: string }>,
    res: Response<{
      id: string;
      email: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  ) => {
    const { email, password } = req.body;

    const hashedPassword = await hashPassword(password);
    const createdUser = await createUser({ email, hashedPassword });

    res.status(201).json(createdUser);
  }
);

// CREATE CHIRPS
app.post(
  '/api/chirps',
  async (req: Request<{ body: string }>, res: Response<NewChirp>) => {
    const reqBody = req.body.body;
    const userToken = getBearerToken(req);
    const userId = validateJWT(userToken, config.api.jwtSecret);

    if (userToken && userId !== '') {
      if (reqBody.length > 140) {
        throw new BadRequestError('Chirp is too long. Max length is 140');
      } else {
        const bodyWords = reqBody.split(' ');

        const cleanedChirp = bodyWords
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

        const newChirpResponse = await createNewChirp({
          body: cleanedChirp,
          userId,
        });

        console.log('newChirpResponse: ', newChirpResponse);

        res.status(201).json(newChirpResponse);
      }
    }
  }
);

// GET ALL CHIRPS

app.get('/api/chirps', async (req: Request, res: Response<NewChirp[]>) => {
  const allChirps = await getAllChirps();

  res.json(allChirps);
});

// GET CHIP BY ID
app.get(
  '/api/chirps/:chirpId',
  async (req: Request<{ chirpId: string }>, res: Response) => {
    const chirpId = req.params.chirpId;
    const chirp = await getChirpById(chirpId);

    if (!chirp) {
      throw new NotFoundError('Not Found');
    }

    res.json(chirp);
  }
);

app.use(
  '/api/login',
  async (
    req: Request<{
      password: string;
      email: string;
      expiresInSeconds?: number;
    }>,
    res: Response
  ) => {
    const { password, email, expiresInSeconds } = req.body;

    const tokenExpiration =
      expiresInSeconds && expiresInSeconds > 3600 ? expiresInSeconds : 3600;

    const userData = await getUser(email);

    if (
      userData &&
      (await checkPasswordHash(password, userData.hashedPassword))
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword, ...rest } = userData;
      const jwtToken = makeJWT(rest.id, tokenExpiration, config.api.jwtSecret);
      const userWithJwt = { ...rest, token: jwtToken };

      res.json(userWithJwt);
    } else {
      throw new UnauthorizedError('Unauthorized');
    }
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
