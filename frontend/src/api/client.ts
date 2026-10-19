export class ApiError extends Error {
  constructor(public status: number, public code: string, public details?: unknown) { super(code); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(path, {
      ...options, credentials: 'same-origin',
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', 'X-SARH-Request': '1', ...options.headers },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 401 && path !== '/api/auth/login') window.dispatchEvent(new Event('sarh:unauthorized'));
      throw new ApiError(response.status, body.error?.code ?? 'INTERNAL_ERROR', body.error?.details);
    }
    return response.status === 204 ? undefined as T : await response.json();
  } catch (error) {
    if (error instanceof ApiError || options.signal?.aborted) throw error;
    throw new ApiError(0, 'NETWORK_ERROR');
  }
}
export const jsonBody = (value: unknown) => JSON.stringify(value);
