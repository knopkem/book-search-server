import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  bookIdParamsSchema,
  bookImportSummarySchema,
  bookInputSchema,
  booksQuerySchema,
  bulkBooksSchema,
} from '../schemas/book.js';
import { LegacyCsvImportError, parseLegacyBooksCsv } from '../services/legacy-csv-import.js';
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
    '/api/books/import/csv',
    {
      schema: {
        consumes: ['multipart/form-data'],
        response: {
          200: bookImportSummarySchema,
        },
      },
    },
    async (request) => {
      const userId = requireSessionUserId(request);
      const csvText = await readCsvUpload(request);
      let items: ReturnType<typeof parseLegacyBooksCsv>;

      try {
        items = parseLegacyBooksCsv(csvText);
      } catch (error) {
        if (error instanceof LegacyCsvImportError) {
          throw request.server.httpErrors.badRequest(error.message);
        }

        throw error;
      }

      return context.repositories.books.mergeImported(userId, items);
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

async function readCsvUpload(request: FastifyRequest) {
  if (!request.isMultipart()) {
    throw request.server.httpErrors.badRequest('Upload one CSV file using multipart/form-data.');
  }

  let csvText: string | null = null;

  for await (const part of request.parts()) {
    if (part.type !== 'file') {
      throw request.server.httpErrors.badRequest('Only a single CSV file upload is allowed.');
    }

    if (part.fieldname !== 'file') {
      throw request.server.httpErrors.badRequest('Upload field must be named "file".');
    }

    if (csvText !== null) {
      throw request.server.httpErrors.badRequest('Only one CSV file can be uploaded at a time.');
    }

    const chunks: Uint8Array[] = [];

    for await (const chunk of part.file) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (part.file.truncated) {
      throw request.server.httpErrors.payloadTooLarge('CSV upload exceeds the size limit.');
    }

    if (chunks.length === 0) {
      throw request.server.httpErrors.badRequest('Uploaded CSV file is empty.');
    }

    try {
      const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
      csvText = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(buffer));
    } catch {
      throw request.server.httpErrors.badRequest('CSV upload must be valid UTF-8 text.');
    }
  }

  if (!csvText) {
    throw request.server.httpErrors.badRequest('A CSV file is required.');
  }

  return csvText;
}
