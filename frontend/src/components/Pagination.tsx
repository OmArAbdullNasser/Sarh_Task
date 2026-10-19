import { IntegerInput } from './IntegerInput';
import { ValidatedForm, FieldError } from './ValidatedForm';
import { pageSchema } from '../lib/forms/schemas';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../lib/i18n';
export function Pagination({
  page,
  total,
  pageSize,
  onPage,
  entity = 'orders',
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
  entity?: 'orders' | 'users';
}) {
  const { t, number } = useI18n();
  const [jump, setJump] = useState('');
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = Math.max(1, Math.min(page - 2, pages - 4));
  return (
    <div className="pagination">
      <span className="pagination-count">
        {t(entity === 'users' ? 'showingTeam' : 'showing', {
          from: number(total === 0 ? 0 : (page - 1) * pageSize + 1),
          to: number(Math.min(page * pageSize, total)),
          total: number(total),
        })}
      </span>
      <div className="page-controls">
        <button
          className="page-button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label={t('previous')}
        >
          <ChevronLeft className="directional" size={17} />
        </button>
        {first > 1 && (
          <>
            <button className="page-button" onClick={() => onPage(1)}>
              {number(1)}
            </button>
            {first > 2 && <span>…</span>}
          </>
        )}
        {Array.from({ length: Math.min(5, pages - first + 1) }, (_, i) => first + i).map(
          (value) => (
            <button
              key={value}
              className={`page-button ${value === page ? 'selected' : ''}`}
              aria-current={value === page ? 'page' : undefined}
              onClick={() => onPage(value)}
            >
              {number(value)}
            </button>
          ),
        )}
        {first + 4 < pages && (
          <>
            {first + 5 < pages && <span>…</span>}
            <button className="page-button" onClick={() => onPage(pages)}>
              {number(pages)}
            </button>
          </>
        )}
        <button
          className="page-button"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          aria-label={t('next')}
        >
          <ChevronRight className="directional" size={17} />
        </button>
      </div>
      <ValidatedForm
        schema={pageSchema(Math.min(pages, 10000))}
        values={{ page: jump.trim() ? Number(jump) : NaN }}
        className="page-jump"
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(jump);
          if (Number.isInteger(value) && value >= 1 && value <= pages) {
            onPage(value);
            setJump('');
          }
        }}
      >
        <IntegerInput
          name="page"
          aria-describedby="error-page"
          aria-label={t('goPage')}
          placeholder={t('goPage')}
          min={1}
          max={Math.min(pages, 10000)}
          value={jump === '' ? '' : Number(jump)}
          onValueChange={(value) => setJump(String(value))}
        />
        <button className="text-button">{t('go')}</button>
        <FieldError name="page" />
      </ValidatedForm>
    </div>
  );
}
