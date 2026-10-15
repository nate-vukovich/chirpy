import { db } from '../index.js';
import { NewChirp, chirps } from '../schema.js';

export async function createNewChirp(chirp: NewChirp) {
  const [result] = await db
    .insert(chirps)
    .values(chirp)
    .onConflictDoNothing()
    .returning();

  return result;
}

export async function getAllChirps() {
  return await db.query.chirps.findMany({
    orderBy: (chirps, { asc }) => [asc(chirps.createdAt)],
  });
}

export async function getChirpById(chirpId: string) {
  const [result] = await db.query.chirps.findMany({
    where: (chirps, { eq }) => eq(chirps.id, chirpId),
  });

  return result;
}
