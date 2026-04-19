export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => null)) as
    | { message?: string; error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
        ? data.message
        : null) ??
      response.statusText ??
      'Request failed';
    throw new ApiError(message, response.status);
  }

  return data as T;
}
