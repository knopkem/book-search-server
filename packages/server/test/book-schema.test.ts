import { describe, expect, it } from 'vitest';

import { bookInputSchema } from '../src/schemas/book.js';

describe('bookInputSchema', () => {
  it('requires both author and title', () => {
    const result = bookInputSchema.safeParse({
      name: ' ',
      description: '',
      remarks: 'optional',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      return;
    }

    expect(result.error.flatten().fieldErrors).toEqual({
      description: ['Title is required.'],
      name: ['Author is required.'],
    });
  });
});
