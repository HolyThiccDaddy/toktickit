import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { ApiError, getStaffDashboard, type DashboardMetric, type DashboardResponse, type UserSummary } from "./api.js";

function formatDate(value: string) { return new Date(value).toLocaleString(); }

export default function StaffDashboard({ user, onOpenQueue, onOpenActions, onViewTicket }: { user: UserSummary; onOpenQueue: (href?: string) => void; onOpenActions: (href?: string) => void; onViewTicket: (ticketId: number) => void }) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const admin = user.role === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setDashboard(await getStaffDashboard({}, admin)); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Unable to load staff dashboard"); }
    finally { setLoading(false); }
  }, [admin]);
  useEffect(() => { void load(); }, [load]);

  function followMetric(event: MouseEvent<HTMLAnchorElement>, metric: DashboardMetric) {
    event.preventDefault();
    if (metric.key === "myActionsTaken") onOpenActions(metric.href);
    else onOpenQueue(metric.href);
  }

  return <section className="dashboard staff-dashboard" aria-labelledby="staff-dashboard-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div><h1 id="staff-dashboard-title" className="h3 text-zen mb-1">{admin ? "Administrator Dashboard" : "IT Staff Dashboard"}</h1><p className="text-muted mb-0">Role-scoped queue health and recent operational work.</p></div>
      <span className="status-badge" aria-label="Current role">{user.role}</span>
    </div>
    {loading && <div role="status" aria-live="polite" aria-busy="true">Loading staff dashboard...</div>}
    {!loading && error && <div className="alert alert-danger" role="alert"><p className="mb-2">{error}</p><button className="btn btn-outline-danger" type="button" onClick={() => void load()}>Retry dashboard</button></div>}
    {!loading && !error && dashboard && <>
      <div className="dashboard-metric-grid" aria-label="Staff ticket metrics">{dashboard.metrics.map((metric) => <a className="card shadow-sm p-3 dashboard-metric-card" href={metric.href} key={metric.key} onClick={(event) => followMetric(event, metric)}><span className="small text-muted">{metric.label}</span><strong className="display-6 text-zen" aria-label={`${metric.label}: ${metric.value}`}>{metric.value}</strong><span className="small text-zen">{metric.key === "myActionsTaken" ? "Open Actions Taken →" : "Open matching queue →"}</span></a>)}</div>
      {dashboard.accounts && <section className="card shadow-sm p-4 mt-4" aria-labelledby="account-summary-title"><h2 id="account-summary-title" className="h5">Account summary</h2><div className="d-flex flex-wrap gap-3 mt-3">{Object.entries(dashboard.accounts).map(([key, value]) => <span className="category-badge" key={key}>{key}: {value}</span>)}</div></section>}
      <section className="card shadow-sm p-4 mt-4" aria-labelledby="staff-recent-title">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2"><h2 id="staff-recent-title" className="h5 mb-0">Recent and urgent queue items</h2><span className="small text-muted">UTC window: {formatDate(dashboard.meta.from)} – {formatDate(dashboard.meta.to)}</span></div>
        {dashboard.items.length === 0 ? <p className="text-muted mt-3 mb-0">No queue items match this dashboard window.</p> : <div className="dashboard-item-list mt-3">{dashboard.items.map((ticket) => <article className="dashboard-item" key={ticket.ticketId}><div><a href={ticket.href} className="fw-semibold text-zen" onClick={(event) => { event.preventDefault(); onViewTicket(ticket.ticketId); }}>{ticket.ticketNumber}</a><h3 className="h6 mb-1">{ticket.summary}</h3><p className="small text-muted mb-0">{ticket.owner?.displayName ?? "Unassigned"} · Updated {formatDate(ticket.updatedAt)}</p></div><div className="d-flex flex-wrap gap-2"><span className={`priority-badge priority-${ticket.itPriority.toLowerCase()}`}>{ticket.itPriority}</span><span className="status-badge">{ticket.status}</span></div></article>)}</div>}
      </section>
    </>}
  </section>;
}

