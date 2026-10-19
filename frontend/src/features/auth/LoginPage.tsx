import { useRef, useState, type FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowUpRight,
  PackageCheck,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useI18n } from '../../lib/i18n';
import { Brand, LanguageToggle } from '../../components/Layout';
import { ErrorNotice } from '../../components/Feedback';
import { ThemeToggle } from '../../components/ThemeProvider';

export function LoginPage() {
  const { user, login } = useAuth();
  const { t, href } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const lock = useRef(false);
  if (user)
    return <Navigate to={href(user.mustChangePassword ? '/password' : '/orders')} replace />;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <Brand />
        <div className="story-content">
          <span className="story-eyebrow">
            <span className="story-dot" />
            {t('secureWorkspace')}
          </span>
          <h1>{t('loginHero')}</h1>
          <p>{t('loginHeroSub')}</p>
          <div className="story-visual" aria-hidden="true">
            <div className="visual-grid" />
            <div className="visual-card">
              <div className="visual-card-top">
                <span className="visual-icon">
                  <PackageCheck size={24} />
                </span>
                <span className="visual-tick">
                  <Check size={16} />
                </span>
              </div>
              <span className="visual-label">{t('completed')}</span>
              <strong>#SRH-0248</strong>
              <div className="visual-card-bottom">
                <span>Omar Hassan</span>
                <ArrowUpRight size={18} />
              </div>
            </div>
            <div className="visual-small-card">
              <span className="visual-mini-icon">
                <Check size={17} />
              </span>
              <div>
                <strong>{t('safeSave')}</strong>
                <span>{t('serverPriceNote')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="story-footer">
          <span>{t('loginHeroFoot')}</span>
          <span>© 2026 SARH</span>
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-language">
          <ThemeToggle />
          <LanguageToggle />
        </div>
        <form className="login-form" onSubmit={submit}>
          <span className="section-eyebrow">{t('workspace')}</span>
          <h2>{t('loginTitle')}</h2>
          <p>{t('loginSubtitle')}</p>
          {!!error && <ErrorNotice error={error} />}
          <label>
            {t('email')}
            <input
              type="email"
              dir="ltr"
              autoComplete="username"
              placeholder="you@company.com"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            {t('password')}
            <span className="password-input">
              <input
                type={show ? 'text' : 'password'}
                dir="ltr"
                autoComplete="current-password"
                placeholder="••••••••••••"
                required
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShow((v) => !v)}
                aria-label={t(show ? 'hidePassword' : 'showPassword')}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <button className="button button-primary login-submit" disabled={busy}>
            {busy ? t('signingIn') : t('signIn')}
            <ArrowRight size={18} className="directional" />
          </button>
          <div className="demo-divider">
            <span>{t('demoAccess')}</span>
          </div>
          <div className="demo-buttons">
            {(['admin', 'agent'] as const).map((role) => (
              <button
                type="button"
                className="button button-secondary"
                key={role}
                onClick={() => {
                  setEmail(`${role}@sarh.local`);
                  setPassword('SarhDemo2026!');
                }}
              >
                <ShieldCheck size={16} />
                {t(role === 'admin' ? 'demoAdmin' : 'demoAgent')}
              </button>
            ))}
          </div>
        </form>
        <span className="login-bottom">{t('loginFooter')}</span>
      </section>
    </div>
  );
}
