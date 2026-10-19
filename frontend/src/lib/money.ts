// Convert decimal SAR to integer halalas without multiplying a floating-point fraction.
export function parseSar(value: string): number | undefined {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return undefined;
  const [whole, fraction = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(minor) && minor >= 0 ? minor : undefined;
}
export function formatMinor(value: string) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) return '';
  const minor = Number(value);
  return `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`;
}
export function normalizeAmount(value: string) {
  return value
    .replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)))
    .replace(/٫/g, '.');
}
