import { describe, it, expect, beforeAll } from 'vitest';
import {
  checkPasswordHash,
  hashPassword,
  makeJWT,
  validateJWT,
} from '../src/auth.js';

describe('Password Hashing', () => {
  const password1 = 'correctPassword123!';
  const password2 = 'anotherPassword456!';
  let hash1: string;
  let hash2: string;

  beforeAll(async () => {
    hash1 = await hashPassword(password1);
    hash2 = await hashPassword(password2);
  });

  it('should return true for the correct password', async () => {
    const result = await checkPasswordHash(password1, hash1);
    expect(result).toBe(true);
  });

  it('should correctly validate jwt', async () => {
    const jwtToken = makeJWT('someId', 50_000, 'SOME_STRING_123_!');
    const validatedJwt = validateJWT(jwtToken, 'SOME_STRING_123_!');

    console.log('validatedJwt: ', validatedJwt);

    expect(validatedJwt).toBe('someId');
  });
});
