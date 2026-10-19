import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useRemote } from './useRemote';
vi.mock('../api/client', () => ({ api: vi.fn() }));
afterEach(cleanup);
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
describe('latest selection wins, even when a transport ignores cancellation', () => {
  it('three rapid filters resolve in reverse order without older data overwriting latest', async () => {
    const pending = deferred<string>();
    const processing = deferred<string>();
    const cancelled = deferred<string>();
    vi.mocked(api).mockImplementation(
      (url: string) =>
        ({ pending, processing, cancelled })[url as 'pending'].promise as Promise<never>,
    );
    const { result, rerender } = renderHook(({ url }) => useRemote<string>(url), {
      initialProps: { url: 'pending' },
    });
    const firstSignal = vi.mocked(api).mock.calls.at(-1)![1]!.signal!;
    rerender({ url: 'processing' });
    rerender({ url: 'cancelled' });
    expect(firstSignal.aborted).toBe(true);
    await act(async () => {
      cancelled.resolve('cancelled rows');
    });
    expect(result.current.data).toBe('cancelled rows');
    await act(async () => {
      processing.resolve('processing rows');
      pending.resolve('pending rows');
    });
    expect(result.current.data).toBe('cancelled rows');
    expect(result.current.loading).toBe(false);
  });
  it('hides previous rows and ignores an old failure while the current response succeeds', async () => {
    const old = deferred<string>();
    const current = deferred<string>();
    vi.mocked(api).mockImplementation(
      (url: string) => (url === 'old' ? old.promise : current.promise) as Promise<never>,
    );
    const { result, rerender } = renderHook(({ url }) => useRemote<string>(url), {
      initialProps: { url: 'old' },
    });
    rerender({ url: 'current' });
    expect(result.current.data).toBeUndefined();
    expect(result.current.loading).toBe(true);
    await act(async () => {
      current.resolve('current rows');
      old.reject(new Error('outdated failure'));
    });
    expect(result.current.data).toBe('current rows');
    expect(result.current.error).toBeUndefined();
  });
  it('aborts on unmount and retry recovers the current failed request', async () => {
    vi.mocked(api)
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce('retried');
    const { result, unmount } = renderHook(() => useRemote<string>('orders'));
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toBe('retried'));
    const signal = vi.mocked(api).mock.calls.at(-1)![1]!.signal!;
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
