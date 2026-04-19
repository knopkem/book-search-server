import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createDatabase } from '../src/db/client.js';
import { BookRepository } from '../src/repositories/book-repository.js';
import { UserRepository } from '../src/repositories/user-repository.js';
import { LegacyCsvImportError, parseLegacyBooksCsv } from '../src/services/legacy-csv-import.js';

describe('legacy csv import', () => {
  it('parses the Electron CSV format', () => {
    const books = parseLegacyBooksCsv('name,description,remarks\nAuthor One,Title One,Remark One\n');

    expect(books).toEqual([
      {
        name: 'Author One',
        description: 'Title One',
        remarks: 'Remark One',
      },
    ]);
  });

  it('rejects unexpected CSV headers', () => {
    expect(() => parseLegacyBooksCsv('author,title,remarks\nA,T,R\n')).toThrow(LegacyCsvImportError);
  });

  it('rejects invalid rows', () => {
    expect(() => parseLegacyBooksCsv('name,description,remarks\n,,remark only\n')).toThrow(
      'CSV row 2 is invalid: Author or title is required.',
    );
  });

  describe('mergeImported', () => {
    let repository: BookRepository;
    let users: UserRepository;
    let closeClient: (() => Promise<void>) | undefined;

    beforeAll(async () => {
      const { db, client } = await createDatabase(':memory:');
      repository = new BookRepository(db);
      users = new UserRepository(db);
      closeClient = async () => {
        client.close();
      };
    });

    afterAll(async () => {
      await closeClient?.();
    });

    it('imports new books while keeping existing exact author-title matches unchanged', async () => {
      const userId = 'user-1';
      await users.upsertGoogleUser({
        sub: userId,
        email: 'user-1@example.com',
        name: 'User 1',
      });
      const existing = await repository.create(userId, {
        name: 'Existing Author',
        description: 'Existing Title',
        remarks: 'Keep this remark',
      });

      const summary = await repository.mergeImported(userId, [
        {
          name: 'Existing Author',
          description: 'Existing Title',
          remarks: 'Imported remark should not overwrite',
        },
        {
          name: 'New Author',
          description: 'New Title',
          remarks: 'Imported new row',
        },
        {
          name: 'New Author',
          description: 'New Title',
          remarks: 'Duplicate row in file',
        },
      ]);

      const books = await repository.listByUser(userId);

      expect(summary).toEqual({
        processedCount: 3,
        importedCount: 1,
        skippedExistingCount: 1,
        skippedDuplicateCount: 1,
        totalCount: 2,
      });
      expect(books).toHaveLength(2);
      expect(books.find((book) => book.id === existing.id)?.remarks).toBe('Keep this remark');
      expect(books.some((book) => book.name === 'New Author' && book.description === 'New Title')).toBe(true);
    });
  });
});
