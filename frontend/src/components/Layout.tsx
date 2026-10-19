import { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutList,
  Plus,
  Users,
  ExternalLink,
  LogOut,
  KeyRound,
  Globe2,
  Layers3,
  Menu,
  X,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { useI18n } from '../lib/i18n';
import { ErrorNotice } from './Feedback';
import { ThemeToggle } from './ThemeProvider';
export function Brand() {
  const { t } = useI18n();
  return (
    <div className="brand">
      <span className="brand-mark">
        <Layers3 size={24} strokeWidth={1.8} />
      </span>
      <span>
        <strong>{t('brand')}</strong>
        <small>{t('brandSub')}</small>
      </span>
    </div>
  );
}
export function LanguageToggle() {
  const { locale, toggle } = useI18n();
  return (
    <button
      className="language-button"
      onClick={toggle}
      aria-label={locale === 'en' ? 'العربية' : 'English'}
    >
      <Globe2 size={17} />
      {locale === 'en' ? 'العربية' : 'English'}
    </button>
  );
}
export function Layout() {
  const { user, logout } = useAuth();
  const { t, href } = useI18n();
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const title = location.pathname.includes('new')
    ? t('newOrder')
    : location.pathname.includes('team')
      ? t('team')
      : location.pathname.includes('password')
        ? t('changePassword')
        : t('orders');
  return (
    <div className="app-shell">
      {menu && <div className="sidebar-backdrop" onClick={() => setMenu(false)} />}
      <aside className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            onClick={() => setMenu(false)}
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>
        <span className="nav-caption">{t('operations')}</span>
        <nav>
          <NavLink
            end
            to={href('/orders')}
            onClick={() => setMenu(false)}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <LayoutList size={19} />
            {t('orders')}
          </NavLink>
          <NavLink
            to={href('/orders/new')}
            onClick={() => setMenu(false)}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <Plus size={19} />
            {t('newOrder')}
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to={href('/team')}
              onClick={() => setMenu(false)}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <Users size={19} />
              {t('team')}
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-tag">
            <span className="live-dot" />
            {t('localWorkspace')}
          </div>
          <a
            className="nav-link docs-link"
            href="http://localhost:4000/docs/"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={17} />
            {t('apiDocs')}
          </a>
          <div className="user-card">
            <span className="avatar user-avatar">
              <UserRound size={17} aria-hidden="true" />
            </span>
            <div>
              <strong>{user?.name}</strong>
              <small>{t(user?.role === 'admin' ? 'admin' : 'agent')}</small>
            </div>
          </div>
          <div className="account-actions">
            <Link
              to={href('/password')}
              title={t('changePassword')}
              aria-label={t('changePassword')}
            >
              <KeyRound size={17} />
            </Link>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await logout();
                } catch (e) {
                  setError(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <LogOut size={16} />
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-only"
              onClick={() => setMenu(true)}
              aria-label={t('menu')}
            >
              <Menu size={21} />
            </button>
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            <span className="timezone">{t('saudiTime')}</span>
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </header>
        <main>
          {!!error && <ErrorNotice error={error} />}
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>{t('loginFooter')}</span>
          <span>{t('loginHeroFoot')}</span>
        </footer>
      </div>
    </div>
  );
}
