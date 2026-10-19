import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import type { ReactNode } from 'react';
export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={23} />
      <span>{label ?? t('loading')}</span>
    </div>
  );
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  const { t, errorText } = useI18n();
  return (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={19} />
      <span>{errorText(error)}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          <RefreshCw size={15} />
          {t('retry')}
        </button>
      )}
    </div>
  );
}
export function SuccessNotice({ children }: { children: ReactNode }) {
  return (
    <div className="notice notice-success" role="status">
      <CheckCircle2 size={20} />
      <span>{children}</span>
    </div>
  );
}
