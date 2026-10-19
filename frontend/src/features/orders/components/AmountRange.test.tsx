import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AmountRange } from './AmountRange';
afterEach(cleanup);
it('converts SAR decimals exactly, accepts Arabic digits and supports an open upper bound', async () => {
  const onApply = vi.fn();
  render(
    <MemoryRouter>
      <AmountRange min="" max="" onApply={onApply} />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('From (SAR)'), { target: { value: '100.25' } });
  fireEvent.change(screen.getByLabelText('To (SAR)'), { target: { value: '٢٠٠٫٥٠' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
  await waitFor(() => expect(onApply).toHaveBeenLastCalledWith('10025', '20050'));
  fireEvent.change(screen.getByLabelText('To (SAR)'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
  await waitFor(() => expect(onApply).toHaveBeenLastCalledWith('10025', ''));
  fireEvent.click(screen.getByRole('button', { name: 'Clear range' }));
  expect(onApply).toHaveBeenLastCalledWith('', '');
});
it('blocks inverted ranges, letters, exponents, negatives and excess decimal digits', async () => {
  const onApply = vi.fn();
  render(
    <MemoryRouter>
      <AmountRange min="50000" max="10000" onApply={onApply} />
    </MemoryRouter>,
  );
  const lower = screen.getByLabelText('From (SAR)');
  for (const value of ['eeeee', '1e3', '-10', '10.123']) {
    fireEvent.change(lower, { target: { value } });
    expect(lower).toHaveValue('500.00');
  }
  fireEvent.click(screen.getByRole('button', { name: 'Apply range' }));
  expect(
    await screen.findByText('The maximum must be greater than or equal to the minimum.'),
  ).toBeVisible();
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Clear range' }));
  expect(
    screen.queryByText('The maximum must be greater than or equal to the minimum.'),
  ).not.toBeInTheDocument();
});
