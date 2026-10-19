import { useId, useState } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';
import type { Product } from '../orders.types';
export function ProductPicker({
  products,
  value,
  disabled,
  excluded,
  onChange,
}: {
  products: Product[];
  value: string;
  disabled: boolean;
  excluded: string[];
  onChange: (product: Product) => void;
}) {
  const { t, money } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const id = useId();
  const product = products.find((p) => p._id === value);
  const filtered = products.filter(
    (p) => !excluded.includes(p._id) && p.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <div className="product-picker">
      <button
        type="button"
        className="product-select"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{product?.name ?? t('selectProduct')}</span>
        <ChevronDown size={16} />
      </button>
      {open && !disabled && (
        <>
          <button
            type="button"
            tabIndex={-1}
            className="picker-backdrop"
            aria-label={t('close')}
            onClick={() => setOpen(false)}
          />
          <div
            className="picker-menu"
            id={id}
            role="dialog"
            aria-label={t('selectProduct')}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                setOpen(false);
              }
            }}
          >
            <div className="picker-search">
              <Search size={16} />
              <input
                autoFocus
                aria-label={t('searchProducts')}
                placeholder={t('searchProducts')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="picker-options">
              {filtered.length ? (
                filtered.map((p) => (
                  <button
                    type="button"
                    key={p._id}
                    onClick={() => {
                      onChange(p);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {p.sku} · {money(p.unitPriceMinor)}
                      </small>
                    </span>
                    {p._id === value && <Check size={17} />}
                  </button>
                ))
              ) : (
                <p>{t('noProducts')}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
