import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { api, ApiError } from '../../api/client';
import { CreateOrderPage } from './CreateOrderPage';
vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  api: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const product = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Keyboard',
  sku: 'TEST-1',
  unitPriceMinor: 12550,
};
const attempt = {
  _id: '507f1f77bcf86cd799439012',
  operationKey: '4eb8f3c7-9579-4a3e-9a14-8e9209091fca',
  state: 'draft',
};
it('timeout freezes the form and retries the same key and payload without a second operation', async () => {
  const creates: RequestInit[] = [];
  let prepareCount = 0;
  vi.mocked(api).mockImplementation(async (url: string, options?: RequestInit) => {
    if (url === '/api/products') return { data: [product] };
    if (url === '/api/orders/attempts') {
      prepareCount++;
      return {
        attempt:
          prepareCount === 1
            ? attempt
            : {
                ...attempt,
                _id: '507f1f77bcf86cd799439013',
                operationKey: 'cff8a7f2-e9ae-4a25-ad38-c7e8a32682ae',
              },
      };
    }
    if (url === '/api/orders') {
      creates.push(options!);
      if (creates.length === 1) throw new ApiError(0, 'NETWORK_ERROR');
      return { order: { _id: attempt._id, deletedAt: null }, replayed: true };
    }
    throw new Error(`Unexpected ${url}`);
  });
  render(
    <MemoryRouter initialEntries={['/orders/new?lang=en']}>
      <CreateOrderPage />
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: 'Choose a product' });
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Omar Hassan' } });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'omar@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Choose a product' }));
  fireEvent.click(screen.getByRole('button', { name: /Keyboard/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Create order' }));
  await screen.findByText('Let’s check before trying again');
  expect(screen.getByLabelText('Full name')).toBeDisabled();
  expect(prepareCount).toBe(1);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Retry same submission' }));
  });
  await screen.findByText('Order created successfully');
  expect(creates).toHaveLength(2);
  expect(creates[0].headers).toEqual(creates[1].headers);
  expect(creates[0].body).toBe(creates[1].body);
  await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveValue(''));
  expect(prepareCount).toBe(2);
});

it('shows translated field errors and never creates an invalid order', async () => {
  vi.mocked(api).mockImplementation(async (url: string) => {
    if (url === '/api/products') return { data: [product] };
    if (url === '/api/orders/attempts') return { attempt };
    throw new Error(`Invalid order must not reach ${url}`);
  });
  const { container } = render(
    <MemoryRouter initialEntries={['/orders/new?lang=en']}>
      <CreateOrderPage />
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: 'Choose a product' });
  expect(container.querySelector('form')).toHaveAttribute('novalidate');
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'invalid' } });
  fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create order' }));
  await screen.findByText('Enter a valid email address.');
  expect(screen.getByText('Enter a whole number from 1 to 1,000.')).toBeVisible();
  expect(screen.getAllByText('This field is required.')).toHaveLength(2);
  expect(vi.mocked(api).mock.calls.filter(([url]) => url === '/api/orders')).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'omar@example.com' },
  });
  fireEvent.blur(screen.getByLabelText('Email address'));
  await waitFor(() =>
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument(),
  );
});
