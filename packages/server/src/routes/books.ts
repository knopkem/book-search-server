import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  bookIdParamsSchema,
  bookInputSchema,
  booksQuerySchema,
  bulkBooksSchema,
} from '../schemas/book.js';
import type { AppContext } from '../types.js';
import { requireBearerUserId, requireSessionUserId } from '../utils/auth.js';

export function registerBookRoutes(app: FastifyInstance, context: AppContext) {
  const booksApp = app.withTypeProvider<ZodTypeProvider>();

  booksApp.get(
    '/api/books',
    {
      schema: {
        querystring: booksQuerySchema,
      },
    },
    async (request) => {
      const userId = requireSessionUserId(request);
      return context.repositories.books.listByUser(userId, request.query);
    },
  );

  booksApp.get(
    '/api/books/:id',
    {
      schema: {
        params: bookIdParamsSchema,
      },
    },
    async (request) => {
      const userId = requireSessionUserId(request);
      const book = await context.repositories.books.findById(userId, request.params.id);

      if (!book) {
        throw request.server.httpErrors.notFound('Book not found.');
      }

      return book;
    },
  );

  booksApp.post(
    '/api/books',
    {
      schema: {
        body: bookInputSchema,
      },
    },
    async (request, reply) => {
      const userId = requireSessionUserId(request);
      const book = await context.repositories.books.create(userId, request.body);
      reply.code(201);
      return book;
    },
  );

  booksApp.put(
    '/api/books/:id',
    {
      schema: {
        params: bookIdParamsSchema,
        body: bookInputSchema,
      },
    },
    async (request) => {
      const userId = requireSessionUserId(request);
      const book = await context.repositories.books.update(userId, request.params.id, request.body);

      if (!book) {
        throw request.server.httpErrors.notFound('Book not found.');
      }

      return book;
    },
  );

  booksApp.delete(
    '/api/books/:id',
    {
      schema: {
        params: bookIdParamsSchema,
      },
    },
    async (request, reply) => {
      const userId = requireSessionUserId(request);
      const deleted = await context.repositories.books.delete(userId, request.params.id);

      if (!deleted) {
        throw request.server.httpErrors.notFound('Book not found.');
      }

      reply.code(204).send();
    },
  );

  booksApp.get('/books', async (request) => {
    const userId = await requireBearerUserId(request, context);
    return context.repositories.books.listByUser(userId);
  });

  booksApp.post(
    '/books',
    {
      schema: {
        body: bulkBooksSchema,
      },
    },
    async (request, reply) => {
      const userId = await requireBearerUserId(request, context);
      const books = await context.repositories.books.replaceAll(userId, request.body);
      reply.code(200);
      return books;
    },
  );
}
