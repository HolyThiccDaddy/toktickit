import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { ApiError, getRequesterDashboard, type DashboardMetric, type DashboardResponse, type UserSummary } from "./api.js";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function RequesterDashboard({ user, onOpenTickets, onViewTicket }: { user: UserSummary; onOpenTickets: (href?: string) => void; onViewTicket: (ticketId: number) => void }) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setDashboard(await getRequesterDashboard()); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Unable to load requester dashboard"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function followMetric(event: MouseEvent<HTMLAnchorElement>, metric: DashboardMetric) {
    event.preventDefault();
    onOpenTickets(metric.href);
  }

  return <section className="dashboard requester-dashboard" aria-labelledby="requester-dashboard-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div><h1 id="requester-dashboard-title" className="h3 text-zen mb-1">Requester Dashboard</h1><p className="text-muted mb-0">Your ticket activity, summaries, and recent updates.</p></div>
      <span className="status-badge" aria-label="Current role">{user.role}</span>
    </div>
    {loading && <div role="status" aria-live="polite" aria-busy="true"><span>Loading requester dashboard...</span><div className="dashboard-skeleton-grid mt-3" aria-hidden="true">{[0, 1, 2, 3].map((key) => <div className="card shadow-sm p-4" key={key}><span className="ticket-skeleton-line w-50" /><span className="ticket-skeleton-line w-25 mt-3" /></div>)}</div></div>}
    {!loading && error && <div className="alert alert-danger" role="alert"><p className="mb-2">{error}</p><button className="btn btn-outline-danger" type="button" onClick={() => void load()}>Retry dashboard</button></div>}
    {!loading && !error && dashboard && <>
      <div className="dashboard-metric-grid" aria-label="Requester ticket metrics">{dashboard.metrics.map((metric) => <a className="card shadow-sm p-3 dashboard-metric-card" href={metric.href} key={metric.key} onClick={(event) => followMetric(event, metric)}><span className="small text-muted">{metric.label}</span><strong className="display-6 text-zen" aria-label={`${metric.label}: ${metric.value}`}>{metric.value}</strong><span className="small text-zen">View matching tickets →</span></a>)}</div>
      <section className="card shadow-sm p-4 mt-4" aria-labelledby="requester-recent-title">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2"><h2 id="requester-recent-title" className="h5 mb-0">Recent and attention tickets</h2><span className="small text-muted">UTC window: {formatDate(dashboard.meta.from)} – {formatDate(dashboard.meta.to)}</span></div>
        {dashboard.items.length === 0 ? <p className="text-muted mt-3 mb-0">No recent tickets match this dashboard window.</p> : <div className="dashboard-item-list mt-3">{dashboard.items.map((ticket) => <article className="dashboard-item" key={ticket.ticketId}><div><a href={ticket.href} className="fw-semibold text-zen" onClick={(event) => { event.preventDefault(); onViewTicket(ticket.ticketId); }}>{ticket.ticketNumber}</a><h3 className="h6 mb-1">{ticket.summary}</h3><p className="small text-muted mb-0">Updated {formatDate(ticket.updatedAt)}</p></div><span className="status-badge">{ticket.status}</span></article>)}</div>}
      </section>
    </>}
  </section>;
}
