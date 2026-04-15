import type { FastifyRequest } from 'fastify';

import type { AppContext } from '../types.js';

export function getSessionUserId(request: FastifyRequest) {
  const userId = request.session.get('userId');
  return typeof userId === 'string' ? userId : null;
}

export function requireSessionUserId(request: FastifyRequest) {
  const userId = getSessionUserId(request);

  if (!userId) {
    throw request.server.httpErrors.unauthorized('Authentication required.');
  }

  return userId;
}

export async function requireBearerUserId(
  request: FastifyRequest,
  context: AppContext,
) {
  const token = await requireBearerToken(request, context);
  return token.userId;
}

export async function requireBearerToken(
  request: FastifyRequest,
  context: AppContext,
) {
  const header = request.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw request.server.httpErrors.unauthorized('Bearer token required.');
  }

  const token = await context.repositories.tokens.authenticate(header.slice('Bearer '.length));

  if (!token) {
    throw request.server.httpErrors.unauthorized('Invalid API token.');
  }

  return token;
}
