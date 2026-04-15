import { z } from 'zod';

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { createApiTokenSchema, tokenIdParamsSchema } from '../schemas/token.js';
import type { AppContext } from '../types.js';
import { requireSessionUserId } from '../utils/auth.js';

const tokenResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  tokenPreview: z.string(),
  createdAt: z.coerce.date(),
  lastUsedAt: z.coerce.date().nullable(),
});

export function registerUserRoutes(app: FastifyInstance, context: AppContext) {
  const userApp = app.withTypeProvider<ZodTypeProvider>();

  userApp.get('/api/me', async (request) => {
    const userId = requireSessionUserId(request);
    const user = await context.repositories.users.findById(userId);

    if (!user) {
      request.session.delete();
      throw request.server.httpErrors.unauthorized('Session is no longer valid.');
    }

    return user;
  });

  userApp.get('/api/me/tokens', async (request) => {
    const userId = requireSessionUserId(request);
    const tokens = await context.repositories.tokens.listByUser(userId);

    return tokens.map((token) => ({
      id: token.id,
      name: token.name,
      tokenPreview: token.tokenPreview,
      createdAt: token.createdAt,
      lastUsedAt: token.lastUsedAt ?? null,
    }));
  });

  userApp.post(
    '/api/me/tokens',
    {
      schema: {
        body: createApiTokenSchema,
        response: {
          201: z.object({
            token: tokenResponseSchema,
            rawToken: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const userId = requireSessionUserId(request);
      const result = await context.repositories.tokens.create(userId, request.body.name);

      reply.code(201);
      return {
        token: {
          id: result.token.id,
          name: result.token.name,
          tokenPreview: result.token.tokenPreview,
          createdAt: result.token.createdAt,
          lastUsedAt: result.token.lastUsedAt ?? null,
        },
        rawToken: result.rawToken,
      };
    },
  );

  userApp.delete(
    '/api/me/tokens/:id',
    {
      schema: {
        params: tokenIdParamsSchema,
      },
    },
    async (request, reply) => {
      const userId = requireSessionUserId(request);
      const revoked = await context.repositories.tokens.revoke(userId, request.params.id);

      if (!revoked) {
        throw request.server.httpErrors.notFound('Token not found.');
      }

      reply.code(204).send();
    },
  );
}
