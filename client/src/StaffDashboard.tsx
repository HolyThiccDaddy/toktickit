import { useCallback, useEffect, useState } from "react";
import { ApiError, getStaffDashboard, type DashboardMetric, type DashboardResponse, type DashboardItem, type UserSummary } from "./api.js";

const ticketLanes = [
  { key: "new", label: "New", statuses: ["NEW"] },
  { key: "active", label: "In progress", statuses: ["OPEN", "IN_PROGRESS", "REOPENED"] },
  { key: "waiting", label: "Waiting", statuses: ["WAITING_FOR_REQUESTER"] },
  { key: "resolved", label: "Finished", statuses: ["RESOLVED", "CLOSED", "CANCELLED"] },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function MetricLine({ metric, onOpen }: { metric: DashboardMetric | undefined; onOpen: (href?: string) => void }) {
  if (!metric) return null;
  const label = metric.key === "recentlyUpdated" && !/7\s*days/i.test(metric.label) ? `${metric.label} (7 days)` : metric.label;
  return <a className="ops-metric-line" href={metric.href} onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onOpen(metric.href); } }}>
    <span>{label}</span><strong>{metric.value}</strong>
  </a>;
}

function TicketLink({ ticket, onOpen }: { ticket: DashboardItem; onOpen: (ticketId: number) => void }) {
  return <button className="ops-ticket-link" type="button" onClick={() => onOpen(ticket.ticketId)}>
    <span className="ops-ticket-link-number">{ticket.ticketNumber}</span>
    <span className="ops-ticket-link-summary">{ticket.summary}</span>
  </button>;
}

export default function StaffDashboard({ user, onOpenQueue, onOpenActions, onViewTicket }: { user: UserSummary; onOpenQueue: (href?: string) => void; onOpenActions: (href?: string) => void; onViewTicket: (ticketId: number) => void }) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const admin = user.role === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setDashboard(await getStaffDashboard({}, admin)); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Unable to load the service desk overview"); }
    finally { setLoading(false); }
  }, [admin]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <section className="dashboard staff-dashboard" aria-labelledby="staff-dashboard-title">
    <div className="dashboard-heading"><div><p className="ops-eyebrow">Service desk</p><h1 id="staff-dashboard-title">{admin ? "Administrator Dashboard" : "IT Staff Dashboard"}</h1></div></div>
    <div className="ops-loading" role="status" aria-live="polite" aria-busy="true"><span className="ops-loading-dot" />Loading staff dashboard...</div>
  </section>;

  if (error || !dashboard) return <section className="dashboard staff-dashboard" aria-labelledby="staff-dashboard-title">
    <div className="dashboard-heading"><div><p className="ops-eyebrow">Service desk</p><h1 id="staff-dashboard-title">{admin ? "Administrator Dashboard" : "IT Staff Dashboard"}</h1></div></div>
    <div className="alert alert-danger" role="alert"><strong>Overview unavailable</strong><p className="mb-3">{error || "The dashboard data is unavailable right now."}</p><button className="btn btn-outline-danger" type="button" onClick={() => void load()}>Retry loading overview</button></div>
  </section>;

  const metric = (key: string) => dashboard.metrics.find((item) => item.key === key);
  const unassigned = metric("unassignedTickets");
  const owned = metric("myOwnedTickets");
  const inProgress = metric("inProgressWaiting");
  const recentlyUpdated = metric("recentlyUpdated");
  const actionCount = metric("myActionsTaken");
  const attentionTickets = dashboard.items.filter((ticket) => ticket.itPriority === "URGENT" || ticket.itPriority === "HIGH").slice(0, 3);
  const updatedTickets = dashboard.items.slice(0, 3);

  return <section className="dashboard staff-dashboard" aria-labelledby="staff-dashboard-title">
    <div className="dashboard-heading">
      <div><p className="ops-eyebrow">Service desk / Dashboard</p><h1 id="staff-dashboard-title">{admin ? "Administrator Dashboard" : "IT Staff Dashboard"}</h1><p className="ops-description">A clear view of ticket demand, current work, and what needs attention.</p></div>
      <span className="ops-window-label">Updated through {formatDate(dashboard.meta.to)} UTC</span>
    </div>

    <div className="ops-overview-grid" aria-label="Staff ticket metrics">
      <section className="ops-widget ops-widget--pulse" aria-labelledby="queue-pulse-title">
        <div className="ops-widget-heading"><div><p className="ops-eyebrow">Queue snapshot</p><h2 id="queue-pulse-title">Workload</h2></div><span className="ops-widget-mark" aria-hidden="true">↗</span></div>
        <MetricLine metric={unassigned} onOpen={onOpenQueue} />
        <MetricLine metric={owned} onOpen={onOpenQueue} />
        <MetricLine metric={inProgress} onOpen={onOpenQueue} />
        <div className="ops-widget-footnote">Select a count to open its matching queue.</div>
      </section>

      <section className="ops-widget" aria-labelledby="recent-activity-title">
        <div className="ops-widget-heading"><div><p className="ops-eyebrow">Latest changes</p><h2 id="recent-activity-title">Recent activity</h2></div><span className="ops-date-range">{dashboard.meta.timezone}</span></div>
        {updatedTickets.length === 0 ? <div className="ops-widget-empty">New ticket updates will appear here.</div> : <div className="ops-activity-list">{updatedTickets.map((ticket) => <article className="ops-activity-item" key={ticket.ticketId}>
          <span className={`ops-activity-dot ops-activity-dot--${ticket.itPriority.toLowerCase()}`} aria-hidden="true" />
          <div><TicketLink ticket={ticket} onOpen={onViewTicket} /><p>{formatStatus(ticket.status)} · {formatDate(ticket.updatedAt)}</p></div>
        </article>)}</div>}
      </section>

      <section className="ops-widget ops-widget--priority" aria-labelledby="priority-queue-title">
        <div className="ops-widget-heading"><div><p className="ops-eyebrow">Latest high-priority updates</p><h2 id="priority-queue-title">Needs attention</h2></div></div>
        {attentionTickets.length === 0 ? <div className="ops-widget-empty">No high-priority tickets in the latest updates.</div> : <div className="ops-priority-list">{attentionTickets.map((ticket) => <article key={ticket.ticketId} className="ops-priority-item">
          <div><TicketLink ticket={ticket} onOpen={onViewTicket} /><span className={`priority-badge priority-${ticket.itPriority.toLowerCase()}`}>{ticket.itPriority}</span></div>
          <p>{ticket.owner?.displayName ?? "Unassigned"}</p>
        </article>)}</div>}
        <div className="ops-priority-footer">
          {recentlyUpdated && <MetricLine metric={recentlyUpdated} onOpen={onOpenQueue} />}
          {actionCount && <MetricLine metric={actionCount} onOpen={onOpenActions} />}
        </div>
      </section>
    </div>

    {admin && dashboard.accounts && <section className="ops-account-strip" aria-label="Account summary">
      <h2>Account summary</h2>{Object.entries(dashboard.accounts).map(([key, value]) => <span key={key}>{key}<b>{value}</b></span>)}
    </section>}

    <section className="ops-pipeline" aria-labelledby="ticket-pipeline-title">
      <div className="ops-section-heading"><div><p className="ops-eyebrow">Ticket pipeline</p><h2 id="ticket-pipeline-title">Recent and urgent queue items</h2><p>Latest {dashboard.items.length} ticket updates in this overview.</p></div><button className="btn btn-zen" type="button" onClick={() => onOpenQueue()}>View full queue <span aria-hidden="true">→</span></button></div>
      <div className="ops-ticket-board" aria-label="Recent tickets grouped by status">
        {ticketLanes.map((lane) => {
          const tickets = dashboard.items.filter((ticket) => (lane.statuses as readonly string[]).includes(ticket.status));
          return <section className="ops-ticket-lane" key={lane.key} aria-labelledby={`lane-${lane.key}-title`}>
            <div className="ops-lane-heading"><h3 id={`lane-${lane.key}-title`}>{lane.label}</h3><span>{tickets.length}</span></div>
            <div className="ops-lane-cards">{tickets.length === 0 ? <p className="ops-lane-empty">No recent tickets</p> : tickets.map((ticket) => <article className="ops-ticket-card" key={ticket.ticketId}>
              <div className="ops-ticket-card-top"><a className="ops-ticket-number" href={ticket.href} onClick={(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onViewTicket(ticket.ticketId); } }}>{ticket.ticketNumber}</a><span className={`priority-badge priority-${ticket.itPriority.toLowerCase()}`}>{ticket.itPriority}</span></div>
              <span className="ops-ticket-status">{formatStatus(ticket.status)}</span>
              <button type="button" className="ops-ticket-title" onClick={() => onViewTicket(ticket.ticketId)}>{ticket.summary}</button>
              <div className="ops-ticket-card-footer"><span>{ticket.owner?.displayName ?? "Unassigned"}</span><span>{formatDate(ticket.updatedAt)}</span></div>
            </article>)}</div>
          </section>;
        })}
      </div>
      <p className="ops-pipeline-note">All times UTC. Column counts cover these recent results only; use the full queue for all matching tickets.</p>
    </section>
  </section>;
}
