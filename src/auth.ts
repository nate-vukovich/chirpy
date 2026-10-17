import * as argon2 from 'argon2';
import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import type { Request } from 'express';

type JwtCustomPayload = Pick<JwtPayload, 'iss' | 'sub' | 'iat' | 'exp'>;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

export function checkPasswordHash(
  password: string,
  hash: string
): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function makeJWT(
  userId: string,
  expiresIn: number,
  secret: string
): string {
  const tokenPayload: JwtCustomPayload = {
    iss: 'chirpy',
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };

  return jwt.sign(tokenPayload, secret);
}

export function validateJWT(tokenString: string, secret: string): string {
  const decoded = jwt.verify(tokenString, secret) as JwtCustomPayload;

  if (decoded && decoded.sub) {
    return decoded.sub;
  }

  return '';
}

export function getBearerToken(req: Request): string {
  const tokenBearer = req.get('Authorization');
  const [scheme, token] = tokenBearer?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return '';
  }

  return token;
}

export function makeRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function getAPIKey(req: Request) {
  const apiKeyHeader = req.get('Authorization');
  const [scheme, apiKey] = apiKeyHeader?.split(' ') ?? [];

  if (scheme !== 'ApiKey') {
    return;
  }

  return apiKey;
}
