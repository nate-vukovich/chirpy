import { db } from '../index.js';
import { RefreshToken, refreshTokens } from '../schema.js';
import { eq } from 'drizzle-orm';

export async function createRefreshToken(refreshToken: RefreshToken) {
  console.log('refreshToken', refreshToken);

  const [result] = await db
    .insert(refreshTokens)
    .values(refreshToken)
    .onConflictDoNothing()
    .returning();

  return result;
}

export async function getRefreshToken(refreshToken: string) {
  const [result] = await db.query.refreshTokens.findMany({
    where: (refreshTokens, { eq }) => eq(refreshTokens.token, refreshToken),
  });

  return result;
}

export async function revokeRefreshToken(refreshToken: string) {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.token, refreshToken));
}
