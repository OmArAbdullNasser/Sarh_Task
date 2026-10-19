import { useRef, useState, type FormEvent } from 'react';
import { Plus, Users, UserRoundPlus, UserRound, ShieldCheck } from 'lucide-react';
import { api, jsonBody } from '../../api/client';
import { useRemote } from '../../hooks/useRemote';
import { useI18n } from '../../lib/i18n';
import { ErrorNotice, Loading, SuccessNotice } from '../../components/Feedback';
import { Modal } from '../../components/Modal';
import { Pagination } from '../../components/Pagination';
import type { Page, User } from '../orders/orders.types';

export function UsersPage() {
  const { t, number, date } = useI18n();
  const [page, setPage] = useState(1);
  const { data, loading, error, retry } = useRemote<Page<User>>(
    `/api/users?page=${page}&pageSize=50`,
  );
  const [adding, setAdding] = useState(false);
  const [deactivate, setDeactivate] = useState<User>();
  const [busy, setBusy] = useState(false);
  const [mutationError, setMutationError] = useState<unknown>();
  const [success, setSuccess] = useState<'agentAdded' | 'agentDeactivated'>();
  async function disable() {
    if (!deactivate || busy) return;
    setBusy(true);
    setMutationError(undefined);
    try {
      await api(`/api/users/${deactivate._id}/deactivate`, { method: 'PATCH' });
      setDeactivate(undefined);
      setSuccess('agentDeactivated');
      retry();
    } catch (e) {
      setMutationError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="section-eyebrow">{t('operations')}</span>
          <h1>
            {t('team')}
            <span className="heading-dot">.</span>
          </h1>
          <p>{t('teamSubtitle')}</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => {
            setSuccess(undefined);
            setAdding(true);
          }}
        >
          <Plus size={18} />
          {t('addAgent')}
        </button>
      </div>
      {success && <SuccessNotice>{t(success)}</SuccessNotice>}
      <section className="panel">
        <div className="panel-title">
          <span className="heading-icon">
            <Users size={20} />
          </span>
          <h2>{t('team')}</h2>
          {data && <span className="count-badge">{number(data.total)}</span>}
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <div className="table-message">
            <ErrorNotice error={error} retry={retry} />
          </div>
        ) : !data?.data.length ? (
          <div className="empty-state">
            <Users size={28} />
            <h3>{t('noTeam')}</h3>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t('name')}</th>
                    <th>{t('email')}</th>
                    <th>{t('access')}</th>
                    <th>{t('joined')}</th>
                    <th>{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div className="customer-cell">
                          <span className="avatar avatar-1">
                            <UserRound size={16} aria-hidden="true" />
                          </span>
                          <div>
                            <strong>{user.name}</strong>
                            <small>{t('agent')}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span dir="ltr" className="muted">
                          {user.email}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${user.active ? 'status-completed' : 'status-cancelled'}`}
                        >
                          <i />
                          {t(user.active ? 'active' : 'inactive')}
                        </span>
                        {user.mustChangePassword && user.active && (
                          <small className="needs-password">{t('needsPassword')}</small>
                        )}
                      </td>
                      <td className="muted">{date(user.createdAt)}</td>
                      <td>
                        <button
                          className="text-button danger-text"
                          disabled={!user.active}
                          onClick={() => {
                            setMutationError(undefined);
                            setDeactivate(user);
                          }}
                        >
                          {t('deactivate')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              entity="users"
              page={page}
              total={data.total}
              pageSize={50}
              onPage={setPage}
            />
          </>
        )}
      </section>
      {adding && (
        <AddAgent
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            setSuccess('agentAdded');
            if (page !== 1) setPage(1);
            else retry();
          }}
        />
      )}
      {deactivate && (
        <Modal
          title={t('deactivateTitle')}
          onClose={() => {
            if (!busy) setDeactivate(undefined);
          }}
        >
          <div className="modal-body">
            <p>{t('deactivateDescription')}</p>
            <div className="confirmation-record">
              <strong>{deactivate.name}</strong>
              <span dir="ltr">{deactivate.email}</span>
            </div>
            {!!mutationError && <ErrorNotice error={mutationError} />}
            <div className="modal-actions">
              <button
                className="button button-secondary"
                disabled={busy}
                onClick={() => setDeactivate(undefined)}
              >
                {t('cancel')}
              </button>
              <button className="button button-danger" disabled={busy} onClick={disable}>
                {busy ? t('saving') : t('deactivate')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function AddAgent({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const lock = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !name.trim() || password.length < 12) return;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await api('/api/users', {
        method: 'POST',
        body: jsonBody({ name: name.trim(), email: email.trim(), password }),
      });
      onAdded();
    } catch (e) {
      setError(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={t('addAgent')}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="modal-body agent-form" onSubmit={submit}>
        <div className="modal-intro">
          <span className="heading-icon">
            <UserRoundPlus size={22} />
          </span>
          <p>{t('addAgentDescription')}</p>
        </div>
        {!!error && <ErrorNotice error={error} />}
        <label>
          {t('name')}
          <input
            autoFocus
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          {t('email')}
          <input
            type="email"
            dir="ltr"
            required
            maxLength={254}
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          {t('initialPassword')}
          <input
            type="password"
            dir="ltr"
            required
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <small>{t('passwordHint')}</small>
        </label>
        <div className="modal-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={onClose}
          >
            {t('cancel')}
          </button>
          <button className="button button-primary" disabled={busy}>
            <ShieldCheck size={16} />
            {t(busy ? 'adding' : 'addAgent')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
