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

export interface ApiToken {
  id: string;
  name: string;
  tokenPreview: string;
  createdAt: string;
  lastUsedAt: string | null;
}
