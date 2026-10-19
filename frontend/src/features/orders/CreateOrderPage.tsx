import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingBag,
  UserRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  LoaderCircle,
} from 'lucide-react';
import { api, ApiError, jsonBody } from '../../api/client';
import { useRemote } from '../../hooks/useRemote';
import { useI18n } from '../../lib/i18n';
import { ErrorNotice, Loading } from '../../components/Feedback';
import { ProductPicker } from './components/ProductPicker';
import type { Attempt, LineInput, Order, Product, Submission } from './orders.types';

const emptyLine = (): LineInput => ({ productId: '', quantity: 1, expectedUnitPriceMinor: 0 });
export function CreateOrderPage() {
  const { t, href, money } = useI18n();
  const productsState = useRemote<{ data: Product[] }>('/api/products');
  const [attempt, setAttempt] = useState<Attempt>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [lines, setLines] = useState<LineInput[]>([emptyLine()]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<unknown>();
  const [uncertain, setUncertain] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [saved, setSaved] = useState<{ id: string; deleted: boolean }>();
  const [restored, setRestored] = useState(false);
  const [priceChanged, setPriceChanged] = useState(false);
  const submitted = useRef<Submission | undefined>(undefined);
  const saving = useRef(false);
  const mounted = useRef(false);
  const currentAttempt = useRef<Attempt | undefined>(undefined);
  const products = productsState.data?.data ?? [];
  function useAttempt(value: Attempt, restore = true) {
    currentAttempt.current = value;
    setAttempt(value);
    if (restore && value.submission) {
      setName(value.submission.customerName);
      setEmail(value.submission.customerEmail);
      setLines(value.submission.items);
      submitted.current = value.submission;
      setRestored(true);
    }
    setUncertain(value.state === 'submitted');
  }
  async function advance(previousId: string) {
    const result = await api<{ attempt: Attempt }>('/api/orders/attempts', {
      method: 'POST',
      body: jsonBody({ previousAttemptId: previousId }),
    });
    if (!mounted.current) return;
    if (result.attempt.state === 'committed') {
      useAttempt(result.attempt);
      return;
    }
    setName('');
    setEmail('');
    setLines([emptyLine()]);
    submitted.current = undefined;
    setRestored(false);
    setPriceChanged(false);
    useAttempt(result.attempt);
  }
  async function finish(value: { _id: string; deletedAt?: string | null }) {
    if (!mounted.current) return;
    setSaved({ id: value._id, deleted: !!value.deletedAt });
    setUncertain(false);
    // Acknowledge only a success we actually received. Failure to prepare the next form keeps the old key.
    setAttempt((previous) => (previous ? { ...previous, state: 'committed' } : previous));
    if (currentAttempt.current)
      currentAttempt.current = { ...currentAttempt.current, state: 'committed' };
    await advance(value._id);
  }
  useEffect(() => {
    mounted.current = true;
    let current = true;
    const start = async () => {
      try {
        const result = await api<{ attempt: Attempt }>('/api/orders/attempts', {
          method: 'POST',
          body: '{}',
        });
        if (!current) return;
        useAttempt(result.attempt);
        if (result.attempt.state === 'committed')
          await finish({ _id: result.attempt._id, deletedAt: result.attempt.deletedAt });
      } catch (e) {
        if (current) setError(e);
      } finally {
        if (current) setBusy(false);
      }
    };
    void start();
    return () => {
      current = false;
      mounted.current = false;
    };
  }, []);
  async function checkStatus() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await api<{ attempt: Attempt | null }>('/api/orders/attempts/current');
      if (!mounted.current) return;
      if (result.attempt) {
        useAttempt(result.attempt);
        if (result.attempt.state === 'committed')
          await finish({ _id: result.attempt._id, deletedAt: result.attempt.deletedAt });
      } else {
        const prepared = await api<{ attempt: Attempt }>('/api/orders/attempts', {
          method: 'POST',
          body: '{}',
        });
        if (mounted.current) useAttempt(prepared.attempt);
      }
    } catch (e) {
      if (mounted.current) setError(e);
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function send(input: Submission) {
    const active = currentAttempt.current;
    if (!active || saving.current || active.state === 'committed') return;
    saving.current = true;
    submitted.current = input;
    setBusy(true);
    setError(undefined);
    setInvalid(false);
    setSaved(undefined);
    setPriceChanged(false);
    try {
      const result = await api<{ order: Order; replayed: boolean }>('/api/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': active.operationKey },
        body: jsonBody({ attemptId: active._id, order: input }),
      });
      await finish(result.order);
    } catch (e) {
      if (!mounted.current) return;
      setError(e);
      if (e instanceof ApiError && e.code === 'PRICE_CHANGED') {
        const changed =
          (e.details as { products?: { productId: string; unitPriceMinor: number }[] })?.products ??
          [];
        const prices = new Map(changed.map((p) => [p.productId, p.unitPriceMinor]));
        setLines((previous) =>
          previous.map((line) => ({
            ...line,
            expectedUnitPriceMinor: prices.get(line.productId) ?? line.expectedUnitPriceMinor,
          })),
        );
        setPriceChanged(true);
        setError(undefined);
        setUncertain(false);
        productsState.retry();
      } else if (
        !(e instanceof ApiError) ||
        e.status === 0 ||
        e.status >= 500 ||
        ['IDEMPOTENCY_CONFLICT', 'ATTEMPT_UNRESOLVED'].includes(e.code)
      )
        setUncertain(true);
      else setUncertain(false);
    } finally {
      saving.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const valid =
      name.trim().length > 0 &&
      name.trim().length <= 150 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
      lines.length >= 1 &&
      lines.length <= 5 &&
      lines.every(
        (line) =>
          line.productId &&
          Number.isInteger(line.quantity) &&
          line.quantity >= 1 &&
          line.quantity <= 1000 &&
          line.expectedUnitPriceMinor > 0,
      ) &&
      new Set(lines.map((l) => l.productId)).size === lines.length;
    if (!valid) {
      setInvalid(true);
      return;
    }
    void send({
      customerName: name.trim(),
      customerEmail: email.trim().toLowerCase(),
      items: lines,
    });
  }
  const locked = busy || uncertain || attempt?.state === 'committed' || !attempt;
  const total = lines.reduce((sum, line) => sum + line.quantity * line.expectedUnitPriceMinor, 0);
  return (
    <>
      <Link className="back-link" to={href('/orders')}>
        <ArrowLeft size={16} className="directional" />
        {t('backOrders')}
      </Link>
      <div className="page-heading">
        <div>
          <span className="section-eyebrow">{t('operations')}</span>
          <h1>
            {t('newOrder')}
            <span className="heading-dot">.</span>
          </h1>
          <p>{t('createSubtitle')}</p>
        </div>
      </div>
      {saved && (
        <div className="notice notice-success saved-notice" role="status">
          <CheckCircle2 size={23} />
          <div>
            <strong>{t('savedTitle')}</strong>
            <p>
              {saved.deleted
                ? t('alreadyDeleted')
                : t('savedDescription', { id: saved.id.slice(-8).toUpperCase() })}
            </p>
          </div>
          <Link className="text-button" to={href('/orders')}>
            {t('orders')}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      )}
      {!!error && (
        <ErrorNotice error={error} retry={!busy && !uncertain ? checkStatus : undefined} />
      )}
      {uncertain && (
        <div className="notice notice-warning" role="alert">
          <AlertCircle size={23} />
          <div>
            <strong>{t('uncertainTitle')}</strong>
            <p>{t('uncertainDescription')}</p>
            <div className="inline-actions">
              <button
                className="button button-secondary"
                type="button"
                disabled={busy}
                onClick={checkStatus}
              >
                <RefreshCw size={16} />
                {t('checkStatus')}
              </button>
              {submitted.current && (
                <button
                  type="button"
                  className="button button-primary"
                  disabled={busy}
                  onClick={() => void send(submitted.current!)}
                >
                  {t('retrySame')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {priceChanged && (
        <div className="notice notice-warning" role="alert">
          <AlertCircle size={21} />
          <div>
            <strong>{t('reviewPrices')}</strong>
            <p>{t('priceChanged')}</p>
          </div>
        </div>
      )}
      {restored && !uncertain && (
        <p className="restored-message">
          <RefreshCw size={14} />
          {t('restored')}
        </p>
      )}
      {busy && !attempt ? (
        <section className="panel">
          <Loading label={t('recovering')} />
        </section>
      ) : (
        <form className="create-layout" onSubmit={submit}>
          <div className="create-main">
            <section className="panel form-panel">
              <div className="form-section-heading">
                <span className="heading-icon">
                  <UserRound size={20} />
                </span>
                <div>
                  <h2>{t('customerDetails')}</h2>
                  <p>{t('customerDetailsSub')}</p>
                </div>
                <span className="section-number">01</span>
              </div>
              <div className="form-grid">
                <label>
                  {t('customerName')}
                  <input
                    required
                    maxLength={150}
                    placeholder={t('customerNamePlaceholder')}
                    disabled={locked}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  {t('email')}
                  <input
                    required
                    type="email"
                    dir="ltr"
                    maxLength={254}
                    placeholder={t('customerEmailPlaceholder')}
                    disabled={locked}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              </div>
            </section>
            <section className="panel form-panel">
              <div className="form-section-heading">
                <span className="heading-icon">
                  <ShoppingBag size={20} />
                </span>
                <div>
                  <h2>{t('lineItems')}</h2>
                  <p>{t('lineItemsSub')}</p>
                </div>
                <span className="section-number">02</span>
              </div>
              {productsState.loading ? (
                <Loading />
              ) : productsState.error ? (
                <ErrorNotice error={productsState.error} retry={productsState.retry} />
              ) : (
                <div className="line-items">
                  {lines.map((line, index) => (
                    <div className="line-item" key={index}>
                      <div className="line-index">{String(index + 1).padStart(2, '0')}</div>
                      <div className="line-product">
                        <span className="field-caption">{t('product')}</span>
                        <ProductPicker
                          value={line.productId}
                          products={products}
                          disabled={!!locked}
                          excluded={lines.filter((_, i) => i !== index).map((l) => l.productId)}
                          onChange={(p) =>
                            setLines((previous) =>
                              previous.map((l, i) =>
                                i === index
                                  ? {
                                      ...l,
                                      productId: p._id,
                                      expectedUnitPriceMinor: p.unitPriceMinor,
                                    }
                                  : l,
                              ),
                            )
                          }
                        />
                      </div>
                      <label className="line-quantity">
                        {t('quantity')}
                        <input
                          type="number"
                          required
                          min={1}
                          max={1000}
                          step={1}
                          disabled={locked}
                          value={Number.isNaN(line.quantity) ? '' : line.quantity}
                          onChange={(e) =>
                            setLines((previous) =>
                              previous.map((l, i) =>
                                i === index ? { ...l, quantity: e.target.valueAsNumber } : l,
                              ),
                            )
                          }
                        />
                      </label>
                      <div className="line-price">
                        <span className="field-caption">{t('unitPrice')}</span>
                        <strong>{money(line.expectedUnitPriceMinor)}</strong>
                      </div>
                      <button
                        type="button"
                        className="icon-button danger-hover"
                        aria-label={t('removeItem')}
                        disabled={locked || lines.length === 1}
                        onClick={() =>
                          setLines((previous) => previous.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                className="button button-secondary add-line"
                type="button"
                disabled={locked || lines.length >= 5}
                onClick={() => setLines((previous) => [...previous, emptyLine()])}
              >
                <Plus size={16} />
                {t('addItem')}
              </button>
            </section>
            {invalid && (
              <div className="notice notice-error" role="alert">
                {t('requiredFields')}
              </div>
            )}
            <p className="list-footnote">{t('draftLost')}</p>
          </div>
          <aside className="summary-column">
            <section className="panel summary-panel">
              <span className="section-eyebrow">{t('summarySub')}</span>
              <h2>{t('orderSummary')}</h2>
              <div className="summary-lines">
                {lines.filter((l) => l.productId).length ? (
                  lines
                    .filter((l) => l.productId)
                    .map((line) => (
                      <div key={line.productId}>
                        <span>
                          {products.find((p) => p._id === line.productId)?.name ?? t('product')}
                          <small>× {line.quantity || 0}</small>
                        </span>
                        <strong>{money((line.quantity || 0) * line.expectedUnitPriceMinor)}</strong>
                      </div>
                    ))
                ) : (
                  <div className="summary-empty">
                    <ShoppingBag size={26} />
                    <span>{t('selectProduct')}</span>
                  </div>
                )}
              </div>
              <div className="summary-total">
                <span>{t('total')}</span>
                <strong>{money(Number.isFinite(total) ? total : 0)}</strong>
              </div>
              <p className="summary-note">{t('serverPriceNote')}</p>
              <button
                className="button button-primary submit-order"
                type="submit"
                disabled={locked || productsState.loading || !!productsState.error}
              >
                {busy ? <LoaderCircle size={18} className="spin" /> : <Plus size={18} />}{' '}
                {t(busy ? 'saving' : 'createOrder')}
              </button>
              {attempt?.state === 'committed' && !busy && (
                <button type="button" className="button button-secondary" onClick={checkStatus}>
                  {t('prepareNext')}
                </button>
              )}
            </section>
            <div className="safe-save">
              <ShieldCheck size={22} />
              <div>
                <strong>{t('safeSave')}</strong>
                <p>{t('safeSaveSub')}</p>
              </div>
            </div>
          </aside>
        </form>
      )}
    </>
  );
}
