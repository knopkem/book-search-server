import { OAuth2Client } from 'google-auth-library';

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { googleAuthSchema } from '../schemas/auth.js';
import type { AppContext } from '../types.js';

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
