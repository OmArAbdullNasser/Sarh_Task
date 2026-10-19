import { useEffect, useState } from 'react';
import { useI18n } from '../../../lib/i18n';
import { formatMinor, normalizeAmount, parseSar } from '../../../lib/money';
import { amountRangeSchema } from '../../../lib/forms/schemas';
import { ValidatedForm, FormInput, FieldError } from '../../../components/ValidatedForm';
export function AmountRange({
  min,
  max,
  onApply,
}: {
  min: string;
  max: string;
  onApply: (min: string, max: string) => void;
}) {
  const { t } = useI18n();
  const [revision, setRevision] = useState(0);
  const [minAmount, setMin] = useState(() => formatMinor(min));
  const [maxAmount, setMax] = useState(() => formatMinor(max));
  useEffect(() => {
    setMin(formatMinor(min));
    setMax(formatMinor(max));
  }, [min, max]);
  return (
    <ValidatedForm
      key={`${min}:${max}:${revision}`}
      className="amount-filter"
      schema={amountRangeSchema}
      values={{ minAmount, maxAmount }}
      onSubmit={() => {
        const lower = parseSar(minAmount),
          upper = parseSar(maxAmount);
        onApply(lower === undefined ? '' : String(lower), upper === undefined ? '' : String(upper));
      }}
    >
      <span className="amount-filter-title">{t('amountRange')}</span>
      {(
        [
          { name: 'minAmount', value: minAmount, set: setMin, label: 'amountFrom' },
          { name: 'maxAmount', value: maxAmount, set: setMax, label: 'amountTo' },
        ] as const
      ).map((field) => (
        <label key={field.name}>
          {t(field.label)}
          <FormInput
            name={field.name}
            aria-label={t(field.label)}
            aria-describedby={`error-${field.name}`}
            type="text"
            inputMode="decimal"
            dir="ltr"
            placeholder="0.00"
            maxLength={18}
            value={field.value}
            onChange={(event) => {
              const value = normalizeAmount(event.target.value);
              if (/^\d*(?:\.\d{0,2})?$/.test(value)) field.set(value);
            }}
          />
          <FieldError name={field.name} />
        </label>
      ))}
      <button className="button button-primary" type="submit">
        {t('applyRange')}
      </button>
      <button
        className="button button-secondary"
        type="button"
        disabled={!min && !max && !minAmount && !maxAmount}
        onClick={() => {
          setMin('');
          setMax('');
          setRevision((value) => value + 1);
          onApply('', '');
        }}
      >
        {t('clearRange')}
      </button>
    </ValidatedForm>
  );
}
