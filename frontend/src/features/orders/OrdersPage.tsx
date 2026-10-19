import { AmountRange } from './components/AmountRange';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  RefreshCw,
  ArrowDownUp,
  Eye,
  Trash2,
  PackageSearch,
  ListFilter,
  LayoutList,
  Clock3,
  UserRound,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useI18n } from '../../lib/i18n';
import { useRemote } from '../../hooks/useRemote';
import { api } from '../../api/client';
import { ErrorNotice, Loading, SuccessNotice } from '../../components/Feedback';
import { Pagination } from '../../components/Pagination';
import { Modal } from '../../components/Modal';
import { OrderDetails } from './components/OrderDetails';
import type { Order, Page, Status } from './orders.types';
const statuses: Status[] = ['pending', 'processing', 'completed', 'cancelled'];
export function OrdersPage() {
  const { user } = useAuth();
  const { t, href, money, date, time, number } = useI18n();
  const [params, setParams] = useSearchParams();
  const querySearch = params.get('search') ?? '';
  const minTotalMinor = params.get('minTotalMinor') ?? '';
  const maxTotalMinor = params.get('maxTotalMinor') ?? '';
  const [search, setSearch] = useState(querySearch);
  const status = statuses.includes(params.get('status') as Status)
    ? (params.get('status') as Status)
    : '';
  const rawPage = Number(params.get('page') ?? 1);
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10000 ? rawPage : 1;
  const sortBy = params.get('sortBy') === 'totalMinor' ? 'totalMinor' : 'createdAt';
  const direction = params.get('direction') === 'asc' ? 'asc' : 'desc';
  const query = new URLSearchParams({ page: String(page), pageSize: '50', sortBy, direction });
  if (minTotalMinor) query.set('minTotalMinor', minTotalMinor);
  if (maxTotalMinor) query.set('maxTotalMinor', maxTotalMinor);
  if (status) query.set('status', status);
  if (querySearch) query.set('search', querySearch);
  const { data, error, loading, retry } = useRemote<Page<Order>>(`/api/orders?${query}`);
  const [view, setView] = useState<string>();
  const [remove, setRemove] = useState<Order>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>();
  const [deleted, setDeleted] = useState(false);
  const update = (values: Record<string, string>, replace = false) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(values)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace },
    );
  useEffect(() => setSearch(querySearch), [querySearch]);
  useEffect(() => {
    if (search === querySearch) return;
    const timer = setTimeout(() => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (search.trim()) next.set('search', search.trim());
          else next.delete('search');
          next.set('page', '1');
          return next;
        },
        { replace: true },
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search, querySearch, setParams]);
  async function confirmDelete() {
    if (!remove || deleting) return;
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await api(`/api/orders/${remove._id}`, { method: 'DELETE' });
      setRemove(undefined);
      setDeleted(true);
      if (data?.data.length === 1 && page > 1) update({ page: String(page - 1) });
      else retry();
    } catch (e) {
      setDeleteError(e);
    } finally {
      setDeleting(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="section-eyebrow">{t('operations')}</span>
          <h1>
            {t('orders')}
            <span className="heading-dot">.</span>
          </h1>
          <p>{t('ordersSubtitle')}</p>
        </div>
        <Link className="button button-primary" to={href('/orders/new')}>
          <Plus size={19} />
          {t('newOrder')}
        </Link>
      </div>
      <div className="overview-strip">
        <div>
          <span className="overview-icon">
            <LayoutList size={19} />
          </span>
          <div>
            <small>{t('results')}</small>
            <strong>{loading ? '—' : number(data?.total ?? 0)}</strong>
          </div>
        </div>
        <div>
          <span className="overview-icon blue">
            <ListFilter size={19} />
          </span>
          <div>
            <small>{t('currentPage')}</small>
            <strong>
              {number(page)}
              <span> / {data ? number(Math.max(1, data.totalPages)) : '—'}</span>
            </strong>
          </div>
        </div>
        <div>
          <span className="overview-icon amber">
            <Clock3 size={19} />
          </span>
          <div>
            <small>{t('pageSize')}</small>
            <strong>{number(50)}</strong>
          </div>
        </div>
      </div>
      {deleted && <SuccessNotice>{t('deletedSuccess')}</SuccessNotice>}
      <section className="panel orders-panel">
        <div className="status-tabs" role="tablist" aria-label={t('status')}>
          {(['', ...statuses] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={status === value}
              className={status === value ? 'active' : ''}
              onClick={() => update({ status: value, page: '1' })}
            >
              {value && <i className={`tab-dot ${value}`} />} {t(value || 'allOrders')}
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label={t('searchLabel')}
              placeholder={t('searchOrders')}
              maxLength={254}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="icon-button"
                aria-label={t('clearFilters')}
                onClick={() => setSearch('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="toolbar-actions">
            <div className="sort-control">
              <ArrowDownUp size={16} />
              <select
                aria-label={t('sort')}
                value={`${sortBy}:${direction}`}
                onChange={(e) => {
                  const [sortBy, direction] = e.target.value.split(':');
                  update({ sortBy, direction, page: '1' });
                }}
              >
                <option value="createdAt:desc">{t('newest')}</option>
                <option value="createdAt:asc">{t('oldest')}</option>
                <option value="totalMinor:desc">{t('highest')}</option>
                <option value="totalMinor:asc">{t('lowest')}</option>
              </select>
            </div>
            <button
              className="button button-secondary refresh-button"
              onClick={retry}
              aria-label={t('refresh')}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <AmountRange
          min={minTotalMinor}
          max={maxTotalMinor}
          onApply={(minTotalMinor, maxTotalMinor) =>
            update({ minTotalMinor, maxTotalMinor, page: '1' })
          }
        />
        <div className="orders-table-area" aria-busy={loading}>
          {loading ? (
            <Loading label={t('loadingOrders')} />
          ) : error ? (
            <div className="table-message">
              <ErrorNotice error={error} retry={retry} />
            </div>
          ) : !data?.data.length ? (
            <div className="empty-state">
              <span>
                <PackageSearch size={30} />
              </span>
              <h3>{t('noOrders')}</h3>
              <p>{t('noOrdersSub')}</p>
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearch('');
                  update({
                    search: '',
                    status: '',
                    minTotalMinor: '',
                    maxTotalMinor: '',
                    page: '1',
                  });
                }}
              >
                {t('clearFilters')}
              </button>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>{t('orderId')}</th>
                    <th>{t('customer')}</th>
                    <th>{t('status')}</th>
                    <th>{t('items')}</th>
                    <th>{t('amount')}</th>
                    <th>{t('created')}</th>
                    <th>
                      <span className="sr-only">{t('actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((order) => (
                    <tr key={order._id} data-testid="order-row">
                      <td>
                        <button className="order-link mono" onClick={() => setView(order._id)}>
                          #{order._id.slice(-8).toUpperCase()}
                        </button>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <span className={`avatar avatar-${order.customerName.charCodeAt(0) % 4}`}>
                            <UserRound size={16} aria-hidden="true" />
                          </span>
                          <div>
                            <strong>{order.customerName}</strong>
                            <small dir="ltr">{order.customerEmail}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-${order.status}`}>
                          <i />
                          {t(order.status)}
                        </span>
                      </td>
                      <td className="muted">{number(order.items.length)}</td>
                      <td className="money">{money(order.totalMinor)}</td>
                      <td>
                        <div className="date-cell">
                          {date(order.createdAt)}
                          <small>{time(order.createdAt)}</small>
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            aria-label={t('viewOrder')}
                            onClick={() => setView(order._id)}
                          >
                            <Eye size={16} />
                          </button>
                          {user?.role === 'admin' && (
                            <button
                              className="icon-button danger-hover"
                              aria-label={t('deleteOrder')}
                              onClick={() => {
                                setDeleteError(undefined);
                                setRemove(order);
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {data && !loading && (
          <Pagination
            page={page}
            total={data.total}
            pageSize={50}
            onPage={(page) => update({ page: String(page) })}
          />
        )}
      </section>
      <p className="list-footnote">
        {t('searchHint')} <span>{t('saudiTime')}</span>
      </p>
      {view && <OrderDetails id={view} onClose={() => setView(undefined)} />}
      {remove && (
        <Modal
          title={t('deleteTitle')}
          onClose={() => {
            if (!deleting) setRemove(undefined);
          }}
        >
          <div className="modal-body">
            <p>{t('deleteDescription')}</p>
            <div className="confirmation-record">
              <strong>{remove.customerName}</strong>
              <span className="mono">#{remove._id.slice(-8).toUpperCase()}</span>
            </div>
            {!!deleteError && <ErrorNotice error={deleteError} />}
            <div className="modal-actions">
              <button
                className="button button-secondary"
                disabled={deleting}
                onClick={() => setRemove(undefined)}
              >
                {t('cancel')}
              </button>
              <button className="button button-danger" disabled={deleting} onClick={confirmDelete}>
                {t(deleting ? 'deleting' : 'confirmDelete')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
