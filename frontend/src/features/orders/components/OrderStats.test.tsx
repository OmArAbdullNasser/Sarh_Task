import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../../../api/client';
import { OrderStats } from './OrderStats';
vi.mock('../../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../api/client')>()),
  api: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it('keeps other controls usable, shows failure, retries once on click, and cancels on departure', async () => {
  let reject!: (error: Error) => void;
  vi.mocked(api).mockImplementationOnce(
    () =>
      new Promise((_resolve, no) => {
        reject = no;
      }),
  );
  const action = vi.fn();
  const { unmount } = render(
    <MemoryRouter>
      <button onClick={action}>Filter orders</button>
      <OrderStats />
    </MemoryRouter>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('Loading statistics');
  fireEvent.click(screen.getByRole('button', { name: 'Filter orders' }));
  expect(action).toHaveBeenCalledOnce();
  await act(async () => reject(new Error('unavailable')));
  expect(screen.getByRole('alert')).toBeVisible();
  vi.mocked(api).mockResolvedValueOnce({
    byStatus: { pending: 10, processing: 2, completed: 3, cancelled: 1 },
    revenueTodayMinor: 12550,
    generatedAt: '2026-10-19T12:00:00Z',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('10')).toBeVisible();
  expect(vi.mocked(api)).toHaveBeenCalledTimes(2);
  vi.mocked(api).mockImplementationOnce(() => new Promise(() => {}));
  fireEvent.click(screen.getByRole('button', { name: 'Refresh statistics' }));
  const signal = vi.mocked(api).mock.calls.at(-1)![1]!.signal!;
  unmount();
  expect(signal.aborted).toBe(true);
});
