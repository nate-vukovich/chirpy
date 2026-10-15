import * as argon2 from 'argon2';
import type { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';

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
