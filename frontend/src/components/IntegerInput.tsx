import type { ComponentProps } from 'react';
import { FormInput } from './ValidatedForm';

// Text + inputMode avoids the scientific notation accepted by native number inputs.
export function IntegerInput({
  value,
  onValueChange,
  min = 1,
  max,
  ...props
}: Omit<ComponentProps<'input'>, 'type' | 'value' | 'onChange' | 'min' | 'max'> & {
  value: number | '';
  onValueChange: (value: number | '') => void;
  min?: number;
  max: number;
}) {
  return (
    <FormInput
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(event) => {
        const text = event.target.value.replace(/[٠-٩۰-۹]/g, (digit) =>
          String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)),
        );
        if (text === '') {
          onValueChange('');
          return;
        }
        if (!/^\d+$/.test(text)) return;
        const number = Number(text);
        if (Number.isSafeInteger(number) && number >= min && number <= max) onValueChange(number);
      }}
    />
  );
}
