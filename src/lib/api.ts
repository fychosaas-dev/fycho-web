import { createClient } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * HTTP client for fycho-api. Automatically attaches the Supabase JWT
 * as Authorization header on every request.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null; status: number }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        data: null,
        error: json.message ?? json.error ?? 'Error desconocido',
        status: response.status,
      };
    }

    return { data: json.data ?? json, error: null, status: response.status };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error de red';
    return { data: null, error: message, status: 0 };
  }
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
