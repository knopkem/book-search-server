import type { Book } from '../../api/types';

export interface BookFilters {
  author: string;
  title: string;
  remarks: string;
}

export function filterBooks(books: Book[], filters: BookFilters) {
  const author = filters.author.trim().toLowerCase();
  const title = filters.title.trim().toLowerCase();
  const remarks = filters.remarks.trim().toLowerCase();

  return books.filter((book) => {
    const authorMatch = !author || book.name.toLowerCase().includes(author);
    const titleMatch = !title || book.description.toLowerCase().includes(title);
    const remarksMatch = !remarks || book.remarks.toLowerCase().includes(remarks);

    return authorMatch && titleMatch && remarksMatch;
  });
}
