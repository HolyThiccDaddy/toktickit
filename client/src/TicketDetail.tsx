import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { addAttachment, ApiError, downloadAttachment, getTicket, removeAttachment, type Requester, type TicketAttachment, type TicketDetail as TicketDetailData } from "./api.js";

const maxFileSize = 5_242_880;
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

export default function TicketDetail({ requester, ticketId, onBack }: { requester: Requester; ticketId: number; onBack: () => void }) {
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [removing, setRemoving] = useState<TicketAttachment | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState("");

  const loadTicket = useCallback(async () => {
    setLoading(true); setError("");
    try { setTicket(await getTicket(requester.id, ticketId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load ticket details"); }
    finally { setLoading(false); }
  }, [requester.id, ticketId]);
  useEffect(() => { void loadTicket(); }, [loadTicket]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validExtension = allowedExtensions.some((extension) => file.name.toLowerCase().endsWith(extension));
    if (file.size > maxFileSize || !allowedTypes.includes(file.type) || !validExtension) {
      setUploadError("Attachment must be JPG, PNG, WEBP, or PDF and no larger than 5 MB");
      return;
    }
    setUploading(true); setUploadError("");
    try { await addAttachment(requester.id, ticketId, file); await loadTicket(); }
    catch (reason) { setUploadError(reason instanceof ApiError && reason.fieldErrors.file ? reason.fieldErrors.file : reason instanceof Error ? reason.message : "Unable to add attachment"); }
    finally { setUploading(false); }
  }

  async function handleDownload(attachment: TicketAttachment) {
    try {
      const result = await downloadAttachment(requester.id, attachment.id);
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a"); link.href = url; link.download = result.filename; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setUploadError(reason instanceof Error ? reason.message : "Unable to download attachment"); }
  }

  async function confirmRemoval() {
    const reason = removalReason.trim();
    if (reason.length < 3 || reason.length > 255) { setRemovalError("Please enter a reason between 3 and 255 characters."); return; }
    if (!removing) return;
    setRemovalError(""); setUploading(true);
    try { await removeAttachment(requester.id, removing.id, reason); setRemoving(null); setRemovalReason(""); await loadTicket(); }
    catch (failure) { setRemovalError(failure instanceof ApiError && failure.fieldErrors.deletionReason ? failure.fieldErrors.deletionReason : failure instanceof Error ? failure.message : "Unable to remove attachment"); }
    finally { setUploading(false); }
  }

  if (loading) return <section className="ticket-detail" aria-labelledby="ticket-detail-title"><button className="btn btn-link px-0" type="button" onClick={onBack}>← Back to My Tickets</button><p id="ticket-detail-title" role="status" aria-live="polite">Loading ticket details...</p></section>;
  if (error || !ticket) return <section className="ticket-detail" aria-labelledby="ticket-detail-title"><button className="btn btn-link px-0" type="button" onClick={onBack}>← Back to My Tickets</button><div className="alert alert-danger" role="alert"><h1 id="ticket-detail-title" className="h4">Unable to load ticket</h1><p>{error || "Ticket not found"}</p><button className="btn btn-outline-danger" type="button" onClick={() => void loadTicket()}>Retry</button></div></section>;

  const activeAttachments = ticket.attachments.filter((attachment) => !attachment.isDeleted);
  const deletedAttachments = ticket.attachments.filter((attachment) => attachment.isDeleted);
  return <section className="ticket-detail" aria-labelledby="ticket-detail-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3"><button className="btn btn-link px-0" type="button" onClick={onBack}>← Back to My Tickets</button><span className="status-badge">{ticket.currentStatus}</span></div>
    <div className="card shadow-sm p-4 mb-3"><div className="d-flex flex-wrap justify-content-between gap-2"><div><p className="text-muted mb-1">Ticket No.</p><h1 id="ticket-detail-title" className="h3 text-zen">{ticket.ticketNumber}</h1></div></div>
      <dl className="row g-3 mb-4 ticket-detail-metadata"><div className="col-sm-6"><dt>Ticket Date</dt><dd>{formatDate(ticket.createdAt)}</dd></div><div className="col-sm-6"><dt>Requester</dt><dd>{ticket.requester.name} ({ticket.requester.email})</dd></div><div className="col-sm-6"><dt>Category</dt><dd>{ticket.category.name}</dd></div><div className="col-sm-6"><dt>Related System</dt><dd>{ticket.relatedSystem.name}</dd></div><div className="col-sm-6"><dt>Requested Priority</dt><dd><span className={`priority-badge priority-${ticket.requestedPriority.toLowerCase()}`}>{ticket.requestedPriority}</span></dd></div></dl>
      <div className="border-top pt-3"><h2 className="h5">{ticket.summary}</h2><p className="ticket-description">{ticket.description}</p></div>
    </div>
    <div className="card shadow-sm p-4"><div className="d-flex flex-wrap justify-content-between align-items-center gap-2"><div><h2 className="h4 mb-1">Attachments</h2><p className="text-muted small mb-0">{activeAttachments.length} of 5 active attachments</p></div><label className={`btn btn-zen ${uploading || activeAttachments.length >= 5 ? "disabled" : ""}`} htmlFor="ticket-detail-attachment">{uploading ? "Uploading..." : "Add Attachment"}<input id="ticket-detail-attachment" className="visually-hidden" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleUpload} disabled={uploading || activeAttachments.length >= 5} /></label></div>
      {uploadError && <div className="alert alert-danger mt-3" role="alert">{uploadError}</div>}
      {activeAttachments.length === 0 && <p className="text-muted mt-3 mb-0">No active attachments.</p>}
      {activeAttachments.length > 0 && <ul className="list-group mt-3">{activeAttachments.map((attachment) => <li className="list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2" key={attachment.id}><div><strong>{attachment.originalFilename}</strong><div className="small text-muted">{formatSize(attachment.fileSize)} · Uploaded {formatDate(attachment.createdAt)}</div></div><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-zen" type="button" onClick={() => void handleDownload(attachment)}>Download</button><button className="btn btn-sm btn-outline-danger" type="button" onClick={() => { setRemoving(attachment); setRemovalReason(""); setRemovalError(""); }}>Remove</button></div></li>)}</ul>}
      {deletedAttachments.length > 0 && <><h3 className="h6 mt-4">Removed attachments</h3><ul className="list-group">{deletedAttachments.map((attachment) => <li className="list-group-item ticket-attachment-deleted" key={attachment.id}><strong>{attachment.originalFilename}</strong><div className="small">{formatSize(attachment.fileSize)} · Removed {formatDate(attachment.deletedAt)}</div><div className="small">Reason: {attachment.deletionReason || "No reason provided"}</div><button className="btn btn-sm btn-outline-secondary mt-2" type="button" disabled>Download unavailable</button></li>)}</ul></>}
    </div>
    {removing && <div className="ticket-modal-backdrop" role="presentation"><div className="ticket-modal card shadow p-4" role="dialog" aria-modal="true" aria-labelledby="remove-attachment-title"><h2 id="remove-attachment-title" className="h5">Remove attachment</h2><p>Provide a reason for removing <strong>{removing.originalFilename}</strong>.</p><label className="form-label" htmlFor="removal-reason">Reason</label><textarea id="removal-reason" className={`form-control ${removalError ? "is-invalid" : ""}`} rows={3} maxLength={255} value={removalReason} onChange={(event) => setRemovalReason(event.target.value)} />{removalError && <div className="invalid-feedback">{removalError}</div>}<div className="d-flex justify-content-end gap-2 mt-3"><button className="btn btn-outline-zen" type="button" onClick={() => setRemoving(null)} disabled={uploading}>Cancel</button><button className="btn btn-danger" type="button" onClick={() => void confirmRemoval()} disabled={uploading}>{uploading ? "Removing..." : "Remove attachment"}</button></div></div></div>}
  </section>;
}
