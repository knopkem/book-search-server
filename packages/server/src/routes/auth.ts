import { OAuth2Client } from 'google-auth-library';

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { googleAuthSchema, mobileGoogleAuthSchema } from '../schemas/auth.js';
import type { AppContext } from '../types.js';
import { requireBearerToken } from '../utils/auth.js';

const userResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export function registerAuthRoutes(app: FastifyInstance, context: AppContext) {
  const authApp = app.withTypeProvider<ZodTypeProvider>();

  authApp.get('/api/auth/google/config', () => ({
    clientId: context.config.googleClientId,
    enabled: Boolean(context.config.googleClientId),
  }));

  authApp.post(
    '/api/auth/google',
    {
      schema: {
        body: googleAuthSchema,
      },
    },
    async (request) => {
      if (!context.config.googleClientId) {
        throw request.server.httpErrors.serviceUnavailable('Google auth is not configured.');
      }

      const ticket = await verifyCredential(context.googleClient, request.body.credential, context.config.googleClientId);
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || !payload.email_verified) {
        throw request.server.httpErrors.unauthorized(
          'Google account is missing a verified email address.',
        );
      }

      const user = await context.repositories.users.upsertGoogleUser({
        sub: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email,
        picture: payload.picture,
      });

      request.session.set('userId', user.id);

      return {
        user,
      };
    },
  );

  authApp.post(
    '/api/auth/google/mobile',
    {
      schema: {
        body: mobileGoogleAuthSchema,
        response: {
          201: z.object({
            rawToken: z.string(),
            user: userResponseSchema,
          }),
        },
      },
    },
    async (request, reply) => {
      if (!context.config.googleClientId) {
        throw request.server.httpErrors.serviceUnavailable('Google auth is not configured.');
      }

      const ticket = await verifyCredential(context.googleClient, request.body.credential, context.config.googleClientId);
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || !payload.email_verified) {
        throw request.server.httpErrors.unauthorized(
          'Google account is missing a verified email address.',
        );
      }

      const user = await context.repositories.users.upsertGoogleUser({
        sub: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email,
        picture: payload.picture,
      });
      const result = await context.repositories.tokens.replaceNamedToken(
        user.id,
        request.body.deviceName ?? 'Mobile app',
      );

      reply.code(201);
      return {
        rawToken: result.rawToken,
        user,
      };
    },
  );

  authApp.post('/api/auth/mobile/logout', async (request, reply) => {
    const token = await requireBearerToken(request, context);
    await context.repositories.tokens.revoke(token.userId, token.id);
    reply.code(204).send();
  });

  authApp.post('/api/auth/logout', (request, reply) => {
    request.session.delete();
    reply.code(204).send();
  });
}

async function verifyCredential(client: OAuth2Client, credential: string, clientId: string) {
  return client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });
}
