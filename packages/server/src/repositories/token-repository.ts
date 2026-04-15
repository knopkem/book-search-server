import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { and, desc, eq, isNull } from 'drizzle-orm';

import type { DbClient } from '../db/client.js';
import { apiTokens } from '../db/schema.js';

export class ApiTokenRepository {
  constructor(private readonly db: DbClient) {}

  async listByUser(userId: string) {
    return this.db.query.apiTokens.findMany({
      where: and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)),
      orderBy: [desc(apiTokens.createdAt)],
    });
  }

  async create(userId: string, name: string) {
    const tokenId = randomUUID();
    const secret = randomBytes(24).toString('base64url');
    const now = new Date();

    await this.db.insert(apiTokens).values({
      id: tokenId,
      userId,
      name,
      tokenHash: hashSecret(secret),
      tokenPreview: secret.slice(0, 8),
      createdAt: now,
    });

    const token = await this.db.query.apiTokens.findFirst({
      where: eq(apiTokens.id, tokenId),
    });

    if (!token) {
      throw new Error('Failed to create API token.');
    }

    return {
      token,
      rawToken: `${tokenId}.${secret}`,
    };
  }

  async authenticate(rawToken: string) {
    const [id, secret] = rawToken.split('.');

    if (!id || !secret) {
      return null;
    }

    const token = await this.db.query.apiTokens.findFirst({
      where: and(eq(apiTokens.id, id), isNull(apiTokens.revokedAt)),
    });

    if (!token) {
      return null;
    }

    const storedHash = Buffer.from(token.tokenHash, 'hex');
    const incomingHash = Buffer.from(hashSecret(secret), 'hex');

    if (storedHash.length !== incomingHash.length || !timingSafeEqual(storedHash, incomingHash)) {
      return null;
    }

    await this.db
      .update(apiTokens)
      .set({
        lastUsedAt: new Date(),
      })
      .where(eq(apiTokens.id, token.id));

    return token;
  }

  async revoke(userId: string, id: string) {
    const token = await this.db.query.apiTokens.findFirst({
      where: and(eq(apiTokens.id, id), eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)),
    });

    if (!token) {
      return false;
    }

    await this.db
      .update(apiTokens)
      .set({
        revokedAt: new Date(),
      })
      .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)));

    return true;
  }
}

function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}
