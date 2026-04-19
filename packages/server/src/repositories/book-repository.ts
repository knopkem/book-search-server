import { randomUUID } from 'node:crypto';

import { and, asc, eq, like, or } from 'drizzle-orm';

import type { DbClient } from '../db/client.js';
import { books } from '../db/schema.js';
import type { BookImportSummary, BookInput, BooksQuery } from '../schemas/book.js';

export class BookRepository {
  constructor(private readonly db: DbClient) {}

  async listByUser(userId: string, filters: BooksQuery = {}) {
    const conditions = [eq(books.userId, userId)];

    if (filters.q) {
      const term = `%${escapeLike(filters.q)}%`;
      conditions.push(or(like(books.name, term), like(books.description, term), like(books.remarks, term))!);
    }

    if (filters.author) {
      conditions.push(like(books.name, `%${escapeLike(filters.author)}%`));
    }

    if (filters.title) {
      conditions.push(like(books.description, `%${escapeLike(filters.title)}%`));
    }

    if (filters.remarks) {
      conditions.push(like(books.remarks, `%${escapeLike(filters.remarks)}%`));
    }

    return this.db.query.books.findMany({
      where: and(...conditions),
      orderBy: [asc(books.name), asc(books.description), asc(books.createdAt)],
    });
  }

  async findById(userId: string, id: string) {
    return this.db.query.books.findFirst({
      where: and(eq(books.id, id), eq(books.userId, userId)),
    });
  }

  async create(userId: string, input: BookInput) {
    const now = new Date();
    const id = randomUUID();

    await this.db.insert(books).values({
      id,
      userId,
      name: input.name,
      description: input.description,
      remarks: input.remarks,
      createdAt: now,
      updatedAt: now,
    });

    const book = await this.findById(userId, id);

    if (!book) {
      throw new Error('Failed to create book.');
    }

    return book;
  }

  async update(userId: string, id: string, input: BookInput) {
    await this.db
      .update(books)
      .set({
        name: input.name,
        description: input.description,
        remarks: input.remarks,
        updatedAt: new Date(),
      })
      .where(and(eq(books.id, id), eq(books.userId, userId)));

    return this.findById(userId, id);
  }

  async delete(userId: string, id: string) {
    const existing = await this.findById(userId, id);

    if (!existing) {
      return false;
    }

    await this.db.delete(books).where(and(eq(books.id, id), eq(books.userId, userId)));
    return true;
  }

  async replaceAll(userId: string, items: BookInput[]) {
    const now = new Date();

    await this.db.transaction(async (tx) => {
      await tx.delete(books).where(eq(books.userId, userId));

      if (items.length > 0) {
        await tx.insert(books)
          .values(
            items.map((item) => ({
              id: randomUUID(),
              userId,
              name: item.name,
              description: item.description,
              remarks: item.remarks,
              createdAt: now,
              updatedAt: now,
            })),
          );
      }
    });

    return this.listByUser(userId);
  }

  async mergeImported(userId: string, items: BookInput[]): Promise<BookImportSummary> {
    const existingBooks = await this.listByUser(userId);
    const existingKeys = new Set(existingBooks.map((book) => buildMergeKey(book)));
    const seenImportKeys = new Set<string>();
    const booksToInsert: BookInput[] = [];
    let skippedExistingCount = 0;
    let skippedDuplicateCount = 0;

    for (const item of items) {
      const key = buildMergeKey(item);

      if (existingKeys.has(key)) {
        skippedExistingCount += 1;
        continue;
      }

      if (seenImportKeys.has(key)) {
        skippedDuplicateCount += 1;
        continue;
      }

      seenImportKeys.add(key);
      booksToInsert.push(item);
    }

    if (booksToInsert.length > 0) {
      const now = new Date();
      await this.db.insert(books).values(
        booksToInsert.map((item) => ({
          id: randomUUID(),
          userId,
          name: item.name,
          description: item.description,
          remarks: item.remarks,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }

    return {
      processedCount: items.length,
      importedCount: booksToInsert.length,
      skippedExistingCount,
      skippedDuplicateCount,
      totalCount: existingBooks.length + booksToInsert.length,
    };
  }
}

function escapeLike(value: string) {
  return value.replace(/[%_]/g, '\\$&');
}

function buildMergeKey(book: Pick<BookInput, 'name' | 'description'>) {
  return `${book.name.trim()}\u0000${book.description.trim()}`;
}
