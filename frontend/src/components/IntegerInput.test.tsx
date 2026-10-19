import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { IntegerInput } from './IntegerInput';
afterEach(cleanup);
function Example() {
  const [value, setValue] = useState<number | ''>(1);
  return <IntegerInput aria-label="Quantity" value={value} onValueChange={setValue} max={1000} />;
}
it('rejects letters, scientific notation, signs, decimals, whitespace and out-of-range values', () => {
  render(<Example />);
  const input = screen.getByLabelText('Quantity');
  for (const value of ['eeeee', '1e3', '-1', '+2', '1.5', ' 12 ', '12abc', '0', '1001']) {
    fireEvent.change(input, { target: { value } });
    expect(input).toHaveValue('1');
  }
});
it('accepts editing, clearing and Arabic/Persian digits, including pasted values', () => {
  render(<Example />);
  const input = screen.getByLabelText('Quantity');
  for (const [value, expected] of [
    ['', ''],
    ['١٢', '12'],
    ['۳۴', '34'],
    ['1000', '1000'],
  ]) {
    fireEvent.change(input, { target: { value } });
    expect(input).toHaveValue(expected);
  }
});
