import { createClient } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * HTTP client for fycho-api. Automatically attaches the Supabase JWT
 * as Authorization header on every request.
 *
 * THROWS on HTTP errors (status >= 400) or network failures, so that
 * react-query mutations properly trigger onError instead of onSuccess.
 *
 * On success, returns `{ data, status }` where `data` is the unwrapped
 * payload (i.e. `json.data ?? json`).
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; status: number }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error de red';
    throw new ApiError(message, 0);
  }

  // Try to parse JSON body (some endpoints may return empty body)
  let json: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Non-JSON response — keep as null
    }
  }

  if (!response.ok) {
    const errObj = json as { message?: string; error?: string } | null;
    const message = errObj?.message ?? errObj?.error ?? `Error ${response.status}`;
    throw new ApiError(message, response.status);
  }

  const payload = (json as { data?: T } | null);
  const data = (payload && 'data' in payload ? payload.data : json) as T;
  return { data, status: response.status };
}

// Convenience methods
export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path),

  post: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T = unknown>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T = unknown>(path: string) =>
    apiFetch<T>(path, { method: 'DELETE' }),
};
