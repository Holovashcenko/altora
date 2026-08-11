/**
 * Thin fetch wrapper shared by every API module in the admin app.
 *
 * Left relative by default (`/api`) so the Vite dev proxy in `vite.config.ts`
 * forwards requests to `apps/api` on the same origin.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

/** A non-2xx response, carrying the status so callers can single out 401. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Bearer token; the API reads it from the `Authorization` header. */
  token?: string | null;
}

/** Nest's exception filter shape — `message` is a string or an array of them. */
interface ApiErrorBody {
  message?: string | string[];
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;

    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }

    return body.message ?? response.statusText;
  } catch {
    // Non-JSON error bodies (proxy errors, HTML pages) have nothing to unwrap.
    return response.statusText;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}
