import { eq } from 'drizzle-orm';

import type { DbClient } from '../db/client.js';
import { users } from '../db/schema.js';

interface GoogleUserPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string | undefined;
}

export class UserRepository {
  constructor(private readonly db: DbClient) {}

  async findById(id: string) {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async upsertGoogleUser(payload: GoogleUserPayload) {
    const now = new Date();
    const existing = await this.findById(payload.sub);

    if (existing) {
      await this.db
        .update(users)
        .set({
          email: payload.email,
          displayName: payload.name,
          avatarUrl: payload.picture,
          updatedAt: now,
        })
        .where(eq(users.id, payload.sub));
    } else {
      await this.db.insert(users).values({
        id: payload.sub,
        email: payload.email,
        displayName: payload.name,
        avatarUrl: payload.picture,
        createdAt: now,
        updatedAt: now,
      });
    }

    const user = await this.findById(payload.sub);

    if (!user) {
      throw new Error('Failed to persist user.');
    }

    return user;
  }
}
