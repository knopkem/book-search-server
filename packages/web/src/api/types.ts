export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface Book {
  id: string;
  name: string;
  description: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export interface CsvImportSummary {
  processedCount: number;
  importedCount: number;
  skippedExistingCount: number;
  skippedDuplicateCount: number;
  totalCount: number;
}
