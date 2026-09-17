import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addComment, addInternalNote, ApiError, assignStaffTicket, claimStaffTicket, downloadAttachment, getStaffTicket,
  type InternalNote, type PublicComment, type TicketAttachment, type TicketDetail as TicketDetailData, type TicketPriority,
  type TicketStatus, type UserSummary, updateStaffPriority, updateStaffStatus,
} from "./api.js";

const priorityValues: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const transitionRules: Record<TicketStatus, Array<{ status: TicketStatus; confirm: boolean }>> = {
  NEW: [{ status: "OPEN", confirm: false }, { status: "CANCELLED", confirm: true }],
  OPEN: [{ status: "IN_PROGRESS", confirm: false }, { status: "CANCELLED", confirm: true }],
  IN_PROGRESS: [{ status: "WAITING_FOR_REQUESTER", confirm: false }, { status: "RESOLVED", confirm: true }, { status: "CANCELLED", confirm: true }],
  WAITING_FOR_REQUESTER: [{ status: "IN_PROGRESS", confirm: false }, { status: "CANCELLED", confirm: true }],
  RESOLVED: [{ status: "CLOSED", confirm: true }, { status: "REOPENED", confirm: true }],
  REOPENED: [{ status: "IN_PROGRESS", confirm: false }, { status: "CANCELLED", confirm: true }],
  CLOSED: [],
  CANCELLED: [],
};

function formatDate(value: string | null | undefined) { return value ? new Date(value).toLocaleString() : "—"; }
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function priorityClass(value: TicketPriority) { return `priority-badge priority-${value.toLowerCase()}`; }

export default function StaffTicketDetail({ user, ticketId, onBack }: { user: UserSummary; ticketId: number; onBack: () => void }) {
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [actionError, setActionError] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("LOW");
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | "">("");
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentError, setCommentError] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteError, setNoteError] = useState("");

  const loadTicket = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const loaded = await getStaffTicket(ticketId);
      setTicket(loaded); setPriority(loaded.itPriority ?? loaded.requestedPriority); setAssignmentId(loaded.owner ? String(loaded.owner.id) : "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load ticket details"); }
    finally { setLoading(false); }
  }, [ticketId]);
  useEffect(() => { void loadTicket(); }, [loadTicket]);

  const transitions = useMemo(() => ticket ? transitionRules[ticket.currentStatus] : [], [ticket]);
  async function runAction(label: string, action: () => Promise<TicketDetailData>) {
    setBusyAction(label); setActionError("");
    try {
      const next = await action();
      setTicket(next);
      setPriority(next.itPriority ?? next.requestedPriority);
      setAssignmentId(next.owner ? String(next.owner.id) : "");
    }
    catch (reason) { setActionError(reason instanceof Error ? reason.message : "Unable to update ticket"); }
    finally { setBusyAction(""); }
  }
  function claim() { void runAction("claim", () => claimStaffTicket(ticketId)); }
  function assign() {
    const value = assignmentId.trim();
    if (value && (!/^\d+$/.test(value) || Number(value) < 1)) { setActionError("Assignee ID must be a positive number or blank to unassign."); return; }
    void runAction("assignment", () => assignStaffTicket(ticketId, value ? Number(value) : null));
  }
  function savePriority() { void runAction("priority", () => updateStaffPriority(ticketId, priority)); }
  function saveStatus() {
    if (!selectedStatus) return;
    const rule = transitions.find((item) => item.status === selectedStatus);
    if (!rule) return;
    if (rule.confirm && !confirmStatus) { setActionError("Confirm this status transition before saving."); return; }
    void runAction("status", () => updateStaffStatus(ticketId, selectedStatus, confirmStatus));
    setSelectedStatus(""); setConfirmStatus(false);
  }
  async function submitComment() {
    const body = commentBody.trim();
    if (!body || body.length > 2000) { setCommentError("Comment must be 1-2000 characters."); return; }
    setBusyAction("comment"); setCommentError("");
    try { const created = await addComment(ticketId, body); setTicket((current) => current ? { ...current, publicComments: [...(current.publicComments ?? []), created] } : current); setCommentBody(""); }
    catch (reason) { setCommentError(reason instanceof Error ? reason.message : "Unable to add comment"); }
    finally { setBusyAction(""); }
  }
  async function submitNote() {
    const body = noteBody.trim();
    if (!body || body.length > 2000) { setNoteError("Note must be 1-2000 characters."); return; }
    setBusyAction("note"); setNoteError("");
    try { const created: InternalNote = await addInternalNote(ticketId, body); setTicket((current) => current ? { ...current, internalNotes: [...(current.internalNotes ?? []), created] } : current); setNoteBody(""); }
    catch (reason) { setNoteError(reason instanceof Error ? reason.message : "Unable to add internal note"); }
    finally { setBusyAction(""); }
  }
  async function handleDownload(attachment: TicketAttachment) {
    setActionError(""); setBusyAction(`download-${attachment.id}`);
    try {
      const result = await downloadAttachment(attachment.id);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a"); link.href = url; link.download = result.filename; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Unable to download attachment");
    } finally { setBusyAction(""); }
  }

  if (loading) return <section className="ticket-detail" aria-labelledby="staff-ticket-detail-title"><button className="btn btn-link px-0" type="button" onClick={onBack}>← Back to queue</button><p id="staff-ticket-detail-title" role="status">Loading ticket details...</p></section>;
  if (!ticket || error) return <section className="ticket-detail" aria-labelledby="staff-ticket-detail-title"><button className="btn btn-link px-0" type="button" onClick={onBack}>← Back to queue</button><div className="alert alert-danger" role="alert"><h1 id="staff-ticket-detail-title" className="h4">Unable to load ticket</h1><p>{error || "Ticket not found"}</p><button className="btn btn-outline-danger" type="button" onClick={() => void loadTicket()}>Retry</button></div></section>;
  const comments: PublicComment[] = ticket.publicComments ?? [];
  const notes: InternalNote[] = ticket.internalNotes ?? [];
  const busy = Boolean(busyAction);
  return <section className="ticket-detail staff-ticket-detail" aria-labelledby="staff-ticket-detail-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3"><button className="btn btn-link px-0" type="button" onClick={onBack}>← Back to queue</button><span className="status-badge">{ticket.currentStatus}</span></div>
    {actionError && <div className="alert alert-danger" role="alert">{actionError}</div>}
    <div className="card shadow-sm p-4 mb-3"><div className="d-flex flex-wrap justify-content-between gap-2"><div><p className="text-muted mb-1">Ticket No.</p><h1 id="staff-ticket-detail-title" className="h3 text-zen">{ticket.ticketNumber}</h1></div><span className={priorityClass(ticket.itPriority ?? ticket.requestedPriority)}>{ticket.itPriority ?? ticket.requestedPriority}</span></div><dl className="row g-3 ticket-detail-metadata mt-2"><div className="col-sm-6"><dt>Requester</dt><dd>{ticket.requester.displayName} ({ticket.requester.email})</dd></div><div className="col-sm-6"><dt>Category</dt><dd>{ticket.category.name}</dd></div><div className="col-sm-6"><dt>Related system</dt><dd>{ticket.relatedSystem.name}</dd></div><div className="col-sm-6"><dt>Created</dt><dd>{formatDate(ticket.createdAt)}</dd></div><div className="col-sm-6"><dt>Updated</dt><dd>{formatDate(ticket.updatedAt)}</dd></div></dl><div className="border-top pt-3"><h2 className="h5">{ticket.summary}</h2><p className="ticket-description">{ticket.description}</p></div></div>
    <div className="card shadow-sm p-4 mb-3"><h2 className="h5">Ticket operations</h2><div className="row g-3 align-items-end"><div className="col-md-4"><label className="form-label" htmlFor="staff-assignee-id">Assignee ID</label><input id="staff-assignee-id" className="form-control" inputMode="numeric" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} placeholder="Blank to unassign" /></div><div className="col-md-4 d-flex gap-2"><button className="btn btn-zen" type="button" onClick={claim} disabled={busy || Boolean(ticket.owner)}>Claim for me</button><button className="btn btn-outline-zen" type="button" onClick={assign} disabled={busy}>{busyAction === "assignment" ? "Saving…" : "Save assignment"}</button></div><div className="col-md-4"><label className="form-label" htmlFor="staff-it-priority">IT Priority</label><div className="input-group"><select id="staff-it-priority" className="form-select" value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)}>{priorityValues.map((value) => <option key={value}>{value}</option>)}</select><button className="btn btn-outline-zen" type="button" onClick={savePriority} disabled={busy || priority === ticket.itPriority}>{busyAction === "priority" ? "Saving…" : "Save"}</button></div></div></div><div className="row g-3 align-items-end mt-1"><div className="col-md-6"><label className="form-label" htmlFor="staff-next-status">Move status</label><select id="staff-next-status" className="form-select" value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value as TicketStatus); setConfirmStatus(false); }}><option value="">Select an allowed transition</option>{transitions.map((item) => <option key={item.status} value={item.status}>{item.status}{item.confirm ? " (confirmation required)" : ""}</option>)}</select></div><div className="col-md-3 form-check mt-4"><input id="staff-status-confirm" className="form-check-input" type="checkbox" checked={confirmStatus} onChange={(event) => setConfirmStatus(event.target.checked)} disabled={!transitions.find((item) => item.status === selectedStatus)?.confirm} /><label className="form-check-label" htmlFor="staff-status-confirm">Confirm transition</label></div><div className="col-md-3"><button className="btn btn-zen w-100" type="button" onClick={saveStatus} disabled={busy || !selectedStatus}>{busyAction === "status" ? "Saving…" : "Update status"}</button></div></div></div>
    <div className="card shadow-sm p-4 mb-3"><h2 className="h5">Attachments</h2>{ticket.attachments.length === 0 ? <p className="text-muted mb-0">No attachments on this ticket.</p> : <ul className="list-group">{ticket.attachments.map((attachment) => <li className="list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2" key={attachment.id}><div><strong>{attachment.originalFilename}</strong><div className="small text-muted">{formatSize(attachment.fileSize)} · {attachment.isDeleted ? `Removed ${formatDate(attachment.deletedAt)}` : `Uploaded ${formatDate(attachment.createdAt)}`}</div>{attachment.isDeleted && <div className="small">Reason: {attachment.deletionReason || "No reason provided"}</div>}</div>{attachment.isDeleted ? <span className="text-muted small">Download unavailable</span> : <button className="btn btn-sm btn-outline-zen" type="button" onClick={() => void handleDownload(attachment)} disabled={busy}>{busyAction === `download-${attachment.id}` ? "Downloading…" : "Download"}</button>}</li>)}</ul>}</div>
    <div className="card shadow-sm p-4 mb-3"><h2 className="h5">Public comments</h2>{comments.length === 0 ? <p className="text-muted">No public comments yet.</p> : <ul className="list-group mb-3">{comments.map((comment) => <li className="list-group-item" key={comment.id}><div className="small text-muted">{comment.author.displayName} · {formatDate(comment.createdAt)}</div><p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{comment.body}</p></li>)}</ul>}<label className="form-label" htmlFor="staff-public-comment">Add a public comment</label><textarea id="staff-public-comment" aria-invalid={Boolean(commentError)} aria-describedby={commentError ? "staff-public-comment-error" : undefined} className={`form-control ${commentError ? "is-invalid" : ""}`} rows={3} maxLength={2000} value={commentBody} onChange={(event) => setCommentBody(event.target.value)} />{commentError && <div id="staff-public-comment-error" className="invalid-feedback" role="alert">{commentError}</div>}<button className="btn btn-zen mt-2" type="button" onClick={() => void submitComment()} disabled={busy || !commentBody.trim()}>{busyAction === "comment" ? "Posting…" : "Post public comment"}</button></div>
    <div className="card shadow-sm p-4"><h2 className="h5">Internal notes <span className="badge text-bg-secondary">Staff only</span></h2>{notes.length === 0 ? <p className="text-muted">No internal notes yet.</p> : <ul className="list-group mb-3">{notes.map((note) => <li className="list-group-item" key={note.id}><div className="small text-muted">{note.author.displayName} · {formatDate(note.createdAt)}</div><p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{note.body}</p></li>)}</ul>}<label className="form-label" htmlFor="staff-internal-note">Add an internal note</label><textarea id="staff-internal-note" aria-invalid={Boolean(noteError)} aria-describedby={noteError ? "staff-internal-note-error" : undefined} className={`form-control ${noteError ? "is-invalid" : ""}`} rows={3} maxLength={2000} value={noteBody} onChange={(event) => setNoteBody(event.target.value)} />{noteError && <div id="staff-internal-note-error" className="invalid-feedback" role="alert">{noteError}</div>}<button className="btn btn-outline-zen mt-2" type="button" onClick={() => void submitNote()} disabled={busy || !noteBody.trim()}>{busyAction === "note" ? "Saving…" : "Add internal note"}</button></div>
  </section>;
}
