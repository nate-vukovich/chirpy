import { db } from '../index.js';
import { NewChirp, chirps } from '../schema.js';
import { and, eq } from 'drizzle-orm';

export async function createNewChirp(chirp: NewChirp) {
  const [result] = await db
    .insert(chirps)
    .values(chirp)
    .onConflictDoNothing()
    .returning();

  return result;
}

export async function getAllChirps(authorId?: string) {
  const where = authorId ? eq(chirps.userId, authorId) : undefined;

  return await db.query.chirps.findMany({
    where,
    orderBy: (chirps, { asc }) => [asc(chirps.createdAt)],
  });
}

export async function getChirpById(chirpId: string) {
  const [result] = await db.query.chirps.findMany({
    where: (chirps, { eq }) => eq(chirps.id, chirpId),
  });

  return result;
}

export async function deleteChirp(chirpId: string, userId: string) {
  const [result] = await db
    .delete(chirps)
    .where(and(eq(chirps.id, chirpId), eq(chirps.userId, userId)))
    .returning();

  return result;
}
