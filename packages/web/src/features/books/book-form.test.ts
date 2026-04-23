import { describe, expect, it } from 'vitest';

import { normalizeBookForm, validateBookForm } from './book-form';

describe('book form helpers', () => {
  it('trims book values before submit', () => {
    expect(
      normalizeBookForm({
        name: '  Ursula K. Le Guin  ',
        description: '  A Wizard of Earthsea ',
        remarks: '  Shelf A ',
      }),
    ).toEqual({
      name: 'Ursula K. Le Guin',
      description: 'A Wizard of Earthsea',
      remarks: 'Shelf A',
    });
  });

  it('requires author and title', () => {
    expect(
      validateBookForm({
        name: ' ',
        description: '',
        remarks: 'optional',
      }),
    ).toEqual({
      name: 'Author is required.',
      description: 'Title is required.',
    });
  });
});
