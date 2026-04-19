import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import secureSession from '@fastify/secure-session';
import sensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import type { FastifyRequest } from 'fastify';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { OAuth2Client } from 'google-auth-library';

import type { AppConfig } from './config.js';
import { createDatabase } from './db/client.js';
import { BookRepository } from './repositories/book-repository.js';
import { ApiTokenRepository } from './repositories/token-repository.js';
import { UserRepository } from './repositories/user-repository.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerBookRoutes } from './routes/books.js';
import { registerUserRoutes } from './routes/user.js';
import { MAX_CSV_IMPORT_BYTES } from './services/legacy-csv-import.js';
import type { AppContext } from './types.js';

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  const { db, client } = await createDatabase(config.databasePath);
  const webRoot = resolve(import.meta.dirname, '../../web/dist');

  const context: AppContext = {
    config,
    db,
    client,
    googleClient: new OAuth2Client(config.googleClientId || undefined),
    repositories: {
      users: new UserRepository(db),
      books: new BookRepository(db),
      tokens: new ApiTokenRepository(db),
    },
    webRoot: existsSync(webRoot) ? webRoot : undefined,
  };

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(sensible);
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Book Search Server API',
        version: '1.0.0',
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
  });
  await app.register(cors, {
    credentials: true,
    delegator(request, callback) {
      if (!request.url.startsWith('/api/') && request.url !== '/books') {
        callback(null, { origin: false });
        return;
      }

      callback(null, {
        credentials: true,
        origin(origin, originCallback) {
          if (!origin || isAllowedOrigin(origin, request, context.config.allowedOrigins)) {
            originCallback(null, true);
            return;
          }

          originCallback(new Error('Origin not allowed'), false);
        },
      });
    },
  });
  await app.register(helmet, {
    global: true,
    crossOriginOpenerPolicy: {
      policy: 'same-origin-allow-popups',
    },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': ["'self'", "'unsafe-inline'", 'https://accounts.google.com', 'https://apis.google.com'],
        'frame-src': ["'self'", 'https://accounts.google.com'],
        'connect-src': ["'self'", 'https://accounts.google.com'],
        'img-src': ["'self'", 'data:', 'https://*.googleusercontent.com', 'https://lh3.googleusercontent.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
      },
    },
  });
  await app.register(rateLimit, {
    global: true,
    max: context.config.rateLimitMax,
    timeWindow: context.config.rateLimitWindow,
  });
  await app.register(multipart, {
    limits: {
      files: 1,
      fields: 0,
      parts: 1,
      fileSize: MAX_CSV_IMPORT_BYTES,
    },
    throwFileSizeLimit: true,
  });
  await app.register(secureSession, {
    key: context.config.sessionKey,
    cookie: {
      path: '/',
      sameSite: 'lax',
      httpOnly: true,
      secure: context.config.isProduction,
    },
  });

  app.get('/api/health', () => ({
    status: 'ok',
  }));

  registerAuthRoutes(app, context);
  registerUserRoutes(app, context);
  registerBookRoutes(app, context);

  if (context.webRoot) {
    await app.register(fastifyStatic, {
      root: context.webRoot,
      prefix: '/',
      index: ['index.html'],
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.raw.method === 'GET' && !request.url.startsWith('/api/') && request.url !== '/books') {
        return reply.sendFile('index.html');
      }

      return reply.notFound();
    });
  }

  app.addHook('onClose', () => {
    context.client.close();
  });

  return app;
}

function isAllowedOrigin(origin: string, request: FastifyRequest, allowedOrigins: string[]) {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  const protocol = request.headers['x-forwarded-proto'] ?? request.protocol;
  const host = request.headers['x-forwarded-host'] ?? request.headers.host;

  if (typeof protocol === 'string' && typeof host === 'string' && origin === `${protocol}://${host}`) {
    return true;
  }

  return false;
}
