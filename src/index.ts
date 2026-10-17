import express from 'express';
import postgres from 'postgres';

import type { Express, Request, Response, NextFunction } from 'express';
import type { NewChirp } from './db/schema.js';

import { config } from './config.js';

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';

import {
  createUser,
  deleteAllUsers,
  getUser,
  updateUser,
  upgradeToRedStatus,
} from './db/queries/users.js';
import {
  createNewChirp,
  deleteChirp,
  getAllChirps,
  getChirpById,
} from './db/queries/chirps.js';

import {
  checkPasswordHash,
  getAPIKey,
  getBearerToken,
  hashPassword,
  makeJWT,
  makeRefreshToken,
  validateJWT,
} from './auth.js';

import {
  createRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
} from './db/queries/tokens.js';
import { SIXTY_DAYS } from './constants.js';

const migrationClient = postgres(config.db.url, { max: 1 });
await migrate(drizzle(migrationClient), config.db.migrationConfig);

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends Error {
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

    if (!userToken) {
      return res.status(401).send();
    }

    let userId: string;

    try {
      userId = validateJWT(userToken, config.api.jwtSecret);
    } catch {
      return res.status(401).send();
    }

    // const userId = validateJWT(userToken, config.api.jwtSecret);

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

        res.status(201).json(newChirpResponse);
      }
    } else {
      res.status(401).send();
    }
  }
);

// GET ALL CHIRPS

app.get('/api/chirps', async (req: Request, res: Response<NewChirp[]>) => {
  let authorId = '';
  let sort = 'asc';

  const authorIdQuery = req.query.authorId;
  const sortQuery = req.query.sort;

  if (typeof authorIdQuery === 'string') {
    authorId = authorIdQuery;
  }

  if (typeof sortQuery === 'string') {
    sort = sortQuery;
  }

  const chirps = await getAllChirps(authorId, sort);

  res.json(chirps);
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

app.post(
  '/api/login',
  async (
    req: Request<{
      password: string;
      email: string;
    }>,
    res: Response
  ) => {
    const { password, email } = req.body;

    const userData = await getUser(email);

    if (
      userData &&
      (await checkPasswordHash(password, userData.hashedPassword))
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword, ...rest } = userData;
      const jwtToken = makeJWT(rest.id, 3600, config.api.jwtSecret);
      const refreshToken = makeRefreshToken();

      await createRefreshToken({
        userId: rest.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + SIXTY_DAYS),
      });

      const userLoginData = { ...rest, token: jwtToken, refreshToken };

      res.json(userLoginData);
    } else {
      throw new UnauthorizedError('Unauthorized');
    }
  }
);

app.post('/api/refresh', async (req: Request, res: Response) => {
  const headerRefreshToken = getBearerToken(req);

  const dbRefreshToken = await getRefreshToken(headerRefreshToken);

  if (
    !dbRefreshToken ||
    dbRefreshToken.revokedAt !== null ||
    dbRefreshToken.expiresAt.getTime() <= Date.now()
  ) {
    res.status(401).send();
  } else {
    const newJWTToken = makeJWT(
      dbRefreshToken.userId,
      3600,
      config.api.jwtSecret
    );

    res.json({ token: newJWTToken });
  }
});

app.post('/api/revoke', async (req: Request, res: Response) => {
  const headerRefreshToken = getBearerToken(req);

  await revokeRefreshToken(headerRefreshToken);

  res.status(204).send();
});

app.put(
  '/api/users',
  async (req: Request<{ password: string; email: string }>, res: Response) => {
    const token = getBearerToken(req);

    if (!token || token === 'badToken') {
      res.status(401).send();
    } else {
      const userSub = validateJWT(token, config.api.jwtSecret);

      const { email, password } = req.body;
      const hashedPassword = await hashPassword(password);

      const updatedUser = await updateUser(userSub, hashedPassword, email);

      res.json(updatedUser);
    }
  }
);

app.delete('/api/chirps/:chirpId', async (req: Request, res: Response) => {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).send();
  }

  let userId: string;

  try {
    userId = validateJWT(token, config.api.jwtSecret);
  } catch {
    return res.status(401).send();
  }

  const { chirpId } = req.params;

  const chirp = await getChirpById(chirpId as string);
  if (!chirp) {
    return res.status(404).send();
  }

  if (chirp.userId !== userId) {
    return res.status(403).send();
  }

  await deleteChirp(chirpId as string, userId);
  res.status(204).send();
});

app.post('/api/polka/webhooks', async (req: Request, res: Response) => {
  const apiKey = getAPIKey(req);

  if (!apiKey) {
    throw new UnauthorizedError('API Key missing');
  } else {
    if (req.body.event !== 'user.upgraded') {
      res.status(204).send();
    } else {
      const upgradedUser = await upgradeToRedStatus(req.body.data.userId);

      if (upgradedUser) {
        res.status(204).send();
      } else {
        throw new NotFoundError('User not found');
      }
    }
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
    return res.status(400).json({
      error: err.message,
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      error: err.message,
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      error: err.message,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: err.message,
    });
  }

  res.status(500).json({
    error: 'Something went wrong on our end',
  });

  next();
}
