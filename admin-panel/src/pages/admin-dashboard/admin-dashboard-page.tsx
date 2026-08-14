import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BusFront,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { listOperators, OperatorItem } from '@/pages/account/members/operators/services/operator-api';
import './admin-dashboard.css';

export function AdminDashboardPage() {
  const [operators, setOperators] = useState<OperatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');
      const response = await listOperators();
      setOperators(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const pending = operators.filter((item) => item.status === 'PENDING').length;
    const approved = operators.filter((item) => item.status === 'APPROVED').length;
    const rejected = operators.filter((item) => item.status === 'REJECTED').length;
    return { total: operators.length, pending, approved, rejected };
  }, [operators]);

  const recent = [...operators]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="admin-dashboard-page">
      <section className="dashboard-hero">
        <div>
          <span className="dashboard-kicker">ADMIN OVERVIEW</span>
          <h1>Operations dashboard</h1>
          <p>Manage operators, review bus approvals and keep the platform ready for daily operations.</p>
        </div>
        <div className="dashboard-hero-actions">
          <button className="dashboard-secondary-button" type="button" onClick={() => void loadDashboard()} disabled={loading}>
            <RefreshCw className={loading ? 'dashboard-spin' : ''} />
            Refresh
          </button>
          <Link className="dashboard-primary-button" to="/account/members/add-operator">
            <Plus /> Add Operator
          </Link>
        </div>
      </section>

      {error && <div className="dashboard-error">{error}</div>}

      <section className="dashboard-stat-grid">
        <Metric icon={<Users />} label="Total Operators" value={stats.total} helper="Registered operator accounts" />
        <Metric icon={<Clock3 />} label="Pending Approval" value={stats.pending} helper="Needs admin review" tone="warning" />
        <Metric icon={<CheckCircle2 />} label="Approved" value={stats.approved} helper="Active operators" tone="success" />
        <Metric icon={<XCircle />} label="Rejected" value={stats.rejected} helper="Rejected registrations" tone="danger" />
      </section>

      <section className="dashboard-content-grid">
        <article className="dashboard-panel dashboard-recent-panel">
          <div className="dashboard-panel-header">
            <div>
              <h2>Recent operators</h2>
              <p>Latest operator registrations and approval status.</p>
            </div>
            <Link to="/account/members/operators">View all <ArrowRight /></Link>
          </div>

          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {loading && recent.length === 0 ? (
                  <tr><td colSpan={4} className="dashboard-table-empty">Loading operator data…</td></tr>
                ) : recent.length === 0 ? (
                  <tr><td colSpan={4} className="dashboard-table-empty">No operators registered yet.</td></tr>
                ) : recent.map((operator) => (
                  <tr key={operator.id}>
                    <td>
                      <strong>{operator.operatorName}</strong>
                      <span>{operator.ownerName || 'Owner not provided'}</span>
                    </td>
                    <td>
                      <strong className="dashboard-normal-weight">{operator.mobile || '—'}</strong>
                      <span>{operator.email || 'No email'}</span>
                    </td>
                    <td><StatusBadge status={operator.status} /></td>
                    <td>{formatDate(operator.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="dashboard-side-stack">
          <article className="dashboard-panel dashboard-action-panel">
            <div className="dashboard-panel-header compact">
              <div>
                <h2>Quick actions</h2>
                <p>Common admin tasks.</p>
              </div>
            </div>
            <Link className="dashboard-action-item" to="/account/members/operators">
              <span className="dashboard-action-icon"><ShieldCheck /></span>
              <span><strong>Review operators</strong><small>Approve or reject registrations</small></span>
              <ArrowRight />
            </Link>
            <Link className="dashboard-action-item" to="/bus-verification">
              <span className="dashboard-action-icon"><BusFront /></span>
              <span><strong>Verify buses</strong><small>Inspect documents and seat setup</small></span>
              <ArrowRight />
            </Link>
            <Link className="dashboard-action-item" to="/account/members/add-operator">
              <span className="dashboard-action-icon"><Plus /></span>
              <span><strong>Add operator</strong><small>Create a new operator account</small></span>
              <ArrowRight />
            </Link>
          </article>

          <article className="dashboard-panel dashboard-health-panel">
            <span className="dashboard-health-icon"><ShieldCheck /></span>
            <div>
              <strong>Admin workspace ready</strong>
              <p>Core operator and bus verification tools are available from the sidebar.</p>
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}

function Metric({ icon, label, value, helper, tone = 'primary' }: { icon: React.ReactNode; label: string; value: number; helper: string; tone?: string }) {
  return (
    <article className={`dashboard-stat-card dashboard-tone-${tone}`}>
      <span className="dashboard-stat-icon">{icon}</span>
      <div>
        <span className="dashboard-stat-label">{label}</span>
        <strong className="dashboard-stat-value">{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`dashboard-status dashboard-status-${status.toLowerCase()}`}>{status}</span>;
}

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
