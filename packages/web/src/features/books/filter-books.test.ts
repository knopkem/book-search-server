import { describe, expect, it } from 'vitest';

import type { Book } from '../../api/types';
import { filterBooks } from './filter-books';

const books: Book[] = [
  {
    id: '1',
    name: 'Ursula K. Le Guin',
    description: 'A Wizard of Earthsea',
    remarks: 'Fantasy classic',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Frank Herbert',
    description: 'Dune',
    remarks: 'Sci-fi',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

describe('filterBooks', () => {
  it('filters on author and title', () => {
    const filtered = filterBooks(books, {
      author: 'herbert',
      title: 'dune',
      remarks: '',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('2');
  });
});
