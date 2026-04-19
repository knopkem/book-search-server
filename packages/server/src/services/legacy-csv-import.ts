import { parse } from 'csv-parse/sync';

import { bookInputSchema, type BookInput } from '../schemas/book.js';

const supportedColumns = ['name', 'description', 'remarks'] as const;

export const MAX_CSV_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_IMPORT_ROWS = 10_000;

export class LegacyCsvImportError extends Error {}

export function parseLegacyBooksCsv(csvText: string) {
  const records: Record<string, unknown>[] = parse(csvText, {
    bom: true,
    columns: (headerRow) => normalizeHeaderRow(headerRow.map((column) => String(column))),
    skip_empty_lines: true,
  });

  if (records.length > MAX_CSV_IMPORT_ROWS) {
    throw new LegacyCsvImportError(`CSV import is limited to ${MAX_CSV_IMPORT_ROWS} books.`);
  }

  return records.map((record, index) => parseLegacyBookRecord(record, index));
}

function normalizeHeaderRow(headerRow: string[]) {
  const normalized = headerRow.map((column) => column.trim());
  const unexpectedColumns = normalized.filter((column) => !supportedColumns.includes(column as typeof supportedColumns[number]));
  const missingColumns = supportedColumns.filter((column) => !normalized.includes(column));

  if (unexpectedColumns.length > 0 || missingColumns.length > 0) {
    const details = [
      missingColumns.length > 0 ? `missing ${missingColumns.join(', ')}` : null,
      unexpectedColumns.length > 0 ? `unexpected ${unexpectedColumns.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('; ');

    throw new LegacyCsvImportError(`CSV headers must be exactly name, description, remarks (${details}).`);
  }

  return normalized;
}

function parseLegacyBookRecord(record: Record<string, unknown>, index: number): BookInput {
  const parsed = bookInputSchema.safeParse({
    name: toPlainText(record.name),
    description: toPlainText(record.description),
    remarks: toPlainText(record.remarks),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join(', ');
    throw new LegacyCsvImportError(`CSV row ${index + 2} is invalid: ${issues}`);
  }

  return parsed.data;
}

function toPlainText(value: unknown) {
  return typeof value === 'string' ? value : '';
}
