import { ValidatedForm, FieldError, FormInput } from '../../components/ValidatedForm';
import { passwordSchema } from '../../lib/forms/schemas';
import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useI18n } from '../../lib/i18n';
import { api, jsonBody } from '../../api/client';
import { ErrorNotice, SuccessNotice } from '../../components/Feedback';
import type { User } from '../orders/orders.types';
export function PasswordPage() {
  const { user, setUser } = useAuth();
  const { t, href } = useI18n();
  const navigate = useNavigate();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await api<{ user: User }>('/api/auth/change-password', {
        method: 'POST',
        body: jsonBody({ currentPassword, newPassword }),
      });
      setUser(result.user);
      setSaved(true);
      setCurrent('');
      setNew('');
      setConfirm('');
      if (user?.mustChangePassword) navigate(href('/orders'), { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="narrow-page">
      <div className="page-heading">
        <div>
          <span className="section-eyebrow">{t('operations')}</span>
          <h1>{t('passwordTitle')}</h1>
          <p>{t(user?.mustChangePassword ? 'passwordSubtitle' : 'passwordOptionalSub')}</p>
        </div>
      </div>
      <section className="panel password-panel">
        <div className="form-section-heading">
          <span className="heading-icon">
            <KeyRound size={20} />
          </span>
          <h2>{t('changePassword')}</h2>
        </div>
        <ValidatedForm
          schema={passwordSchema}
          values={{ currentPassword, newPassword, confirm }}
          onSubmit={submit}
        >
          {!!error && <ErrorNotice error={error} />}{' '}
          {saved && <SuccessNotice>{t('passwordSaved')}</SuccessNotice>}
          <label>
            {t('currentPassword')}
            <FormInput
              type="password"
              dir="ltr"
              required
              maxLength={128}
              autoComplete="current-password"
              aria-label={t('currentPassword')}
              name="currentPassword"
              aria-describedby="error-currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <FieldError name="currentPassword" />
          </label>
          <label>
            {t('newPassword')}
            <FormInput
              type="password"
              dir="ltr"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              aria-label={t('newPassword')}
              name="newPassword"
              aria-describedby="error-newPassword"
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
            />
            <FieldError name="newPassword" />
          </label>
          <label>
            {t('confirmPassword')}
            <FormInput
              type="password"
              dir="ltr"
              required
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              aria-label={t('confirmPassword')}
              name="confirm"
              aria-describedby="error-confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <FieldError name="confirm" />
          </label>
          <button className="button button-primary" disabled={busy}>
            <ShieldCheck size={17} />
            {busy ? t('saving') : t('savePassword')}
          </button>
        </ValidatedForm>
      </section>
    </div>
  );
}
