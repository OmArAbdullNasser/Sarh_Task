import { RefreshCw } from 'lucide-react';
import { useRemote } from '../../../hooks/useRemote';
import { useI18n } from '../../../lib/i18n';
import { ErrorNotice, Loading } from '../../../components/Feedback';
import type { Status } from '../orders.types';
interface Stats {
  byStatus: Record<Status, number>;
  revenueTodayMinor: number;
  generatedAt: string;
}
const statuses: Status[] = ['pending', 'processing', 'completed', 'cancelled'];
export function OrderStats() {
  const { t, number, money, time } = useI18n();
  const { data, loading, error, retry } = useRemote<Stats>('/api/orders/stats');
  return (
    <section className="panel stats-panel" aria-label={t('statsTitle')} aria-busy={loading}>
      <div className="stats-heading">
        <div>
          <h2>{t('statsTitle')}</h2>
          <p>{t('statsScope')}</p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          disabled={loading}
          onClick={retry}
          aria-label={t('refreshStats')}
        >
          <RefreshCw size={15} />
          {t('refresh')}
        </button>
      </div>
      {loading ? (
        <Loading label={t('statsLoading')} />
      ) : error ? (
        <ErrorNotice error={error} retry={retry} />
      ) : data ? (
        <>
          <div className="stats-grid">
            {statuses.map((status) => (
              <div key={status}>
                <span className={`status-pill status-${status}`}>
                  <i />
                  {t(status)}
                </span>
                <strong>{number(data.byStatus[status])}</strong>
              </div>
            ))}
            <div className="stats-revenue">
              <span>{t('revenueToday')}</span>
              <strong>{money(data.revenueTodayMinor)}</strong>
            </div>
          </div>
          <p className="stats-updated">{t('statsUpdated', { time: time(data.generatedAt) })}</p>
        </>
      ) : null}
    </section>
  );
}
