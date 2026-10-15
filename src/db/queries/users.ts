import { getTableColumns } from 'drizzle-orm';
import { db } from '../index.js';
import { NewUser, users } from '../schema.js';

export async function createUser(user: NewUser) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hashedPassword, ...rest } = getTableColumns(users);

  const [result] = await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .returning(rest);

  return result;
}

export async function deleteAllUsers() {
  const [result] = await db.delete(users);

  return result;
}

export async function getUser(email: string) {
  return await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, email),
  });
}
