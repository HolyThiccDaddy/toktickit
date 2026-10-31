import { useCallback, useEffect, useState } from "react";
import { ApiError, getStaffActions, type StaffActionListItem, type UserSummary } from "./api.js";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function parseWindow(initialHref?: string) {
  const params = new URLSearchParams(initialHref?.split("?")[1] ?? "");
  return { from: params.get("from") ?? undefined, to: params.get("to") ?? undefined };
}

function ActionRow({ action, onViewTicket }: { action: StaffActionListItem; onViewTicket: (ticketId: number) => void }) {
  return <article className="dashboard-item" data-testid={`staff-action-${action.id}`}>
    <div>
      <button className="btn btn-link p-0 fw-semibold text-zen text-start" type="button" onClick={() => onViewTicket(action.ticketId)}>{action.ticketNumber}</button>
      <h2 className="h6 mb-1">{action.description}</h2>
      <p className="small text-muted mb-1">{action.summary} · {formatDate(action.actionDateTime)}</p>
      <p className="small mb-0"><strong>Result:</strong> {action.result}</p>
    </div>
    <span className="status-badge" aria-label={`Action state: ${action.state}`}>{action.state}</span>
  </article>;
}

export default function StaffActionsList({ user, initialHref, onViewTicket }: { user: UserSummary; initialHref?: string; onViewTicket: (ticketId: number) => void }) {
  const [actions, setActions] = useState<StaffActionListItem[]>([]);
  const [queryWindow] = useState(parseWindow(initialHref));
  const [resultWindow, setResultWindow] = useState(queryWindow);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await getStaffActions(queryWindow);
      setActions(result.items);
      setResultWindow({ from: result.meta.from, to: result.meta.to });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to load Actions Taken");
    } finally { setLoading(false); }
  }, [queryWindow]);

  useEffect(() => { void load(); }, [load]);

  return <section className="dashboard staff-actions-list" aria-labelledby="staff-actions-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div><h1 id="staff-actions-title" className="h3 text-zen mb-1">My Actions Taken</h1><p className="text-muted mb-0">Actions recorded by {user.displayName} in the selected UTC window.</p></div>
      <span className="status-badge" aria-label="Current role">{user.role}</span>
    </div>
    {loading && <div role="status" aria-live="polite" aria-busy="true">Loading Actions Taken...</div>}
    {!loading && error && <div className="alert alert-danger" role="alert"><p className="mb-2">{error}</p><button className="btn btn-outline-danger" type="button" onClick={() => void load()}>Retry Actions</button></div>}
    {!loading && !error && <>
      <p className="small text-muted" aria-live="polite">UTC window: {resultWindow.from ? formatDate(resultWindow.from) : "default"} – {resultWindow.to ? formatDate(resultWindow.to) : "now"}</p>
      {actions.length === 0 ? <div className="card shadow-sm p-5 text-center"><h2 className="h5">No Actions Taken found.</h2><p className="text-muted mb-0">Actions recorded in this window will appear here.</p></div> : <div className="dashboard-item-list">{actions.map((action) => <ActionRow key={action.id} action={action} onViewTicket={onViewTicket} />)}</div>}
    </>}
  </section>;
}

