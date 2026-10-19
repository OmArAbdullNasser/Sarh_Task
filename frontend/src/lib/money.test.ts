import { expect, it } from 'vitest';
import { parseSar, formatMinor } from './money';
it('converts small decimal amounts without floating point rounding', () => {
  expect(parseSar('0.29')).toBe(29);
  expect(parseSar('315.10')).toBe(31510);
  expect(parseSar('0')).toBe(0);
  expect(formatMinor('29')).toBe('0.29');
  for (const value of ['1e3', '-1', '1.005', '.', '9007199254740991'])
    expect(parseSar(value)).toBeUndefined();
});
