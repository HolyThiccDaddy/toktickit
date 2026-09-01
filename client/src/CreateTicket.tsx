import { useEffect, useState, type FormEvent } from "react";
import { ApiError, createTicket, getReferenceData, type Category, type CreatedTicket, type RelatedSystem, type Requester } from "./api.js";

const maxFileSize = 5_242_880;
const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export default function CreateTicket({ requester, onCancel }: { requester: Requester; onCancel: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [systems, setSystems] = useState<RelatedSystem[]>([]);
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [referenceError, setReferenceError] = useState("");
  const [summary, setSummary] = useState(""); const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(""); const [relatedSystemId, setRelatedSystemId] = useState("");
  const [priority, setPriority] = useState("MEDIUM"); const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({}); const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(""); const [created, setCreated] = useState<CreatedTicket | null>(null);

  async function loadReferences() { setLoadingReferences(true); setReferenceError(""); try { const data = await getReferenceData(); setCategories(data.categories); setSystems(data.relatedSystems); } catch { setReferenceError("Unable to load ticket reference data. Please try again."); } finally { setLoadingReferences(false); } }
  useEffect(() => { void loadReferences(); }, []);

  function selectFiles(nextFiles: File[]) {
    if (nextFiles.length > 5) return setErrors((value) => ({ ...value, files: "You may attach up to 5 files" }));
    const invalid = nextFiles.find((file) => file.size > maxFileSize || !allowedTypes.includes(file.type) || !allowedExtensions.some((extension) => file.name.toLowerCase().endsWith(extension)));
    if (invalid) return setErrors((value) => ({ ...value, files: `${invalid.name} must be JPG, PNG, WEBP, or PDF and no larger than 5 MB` }));
    setErrors((value) => ({ ...value, files: "" })); setFiles(nextFiles);
  }

  function removeFile(index: number) {
    setFiles((value) => value.filter((_, fileIndex) => fileIndex !== index));
    setErrors((value) => ({ ...value, files: "" }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (summary.trim().length < 5 || summary.trim().length > 150) nextErrors.summary = "Summary must be 5-150 characters";
    if (description.trim().length < 10 || description.trim().length > 2000) nextErrors.description = "Description must be 10-2000 characters";
    if (!categoryId) nextErrors.categoryId = "Category is required"; if (!relatedSystemId) nextErrors.relatedSystemId = "Related system is required";
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return;
    const data = new FormData(); data.set("summary", summary.trim()); data.set("description", description.trim()); data.set("categoryId", categoryId); data.set("relatedSystemId", relatedSystemId); data.set("requestedPriority", priority); files.forEach((file) => data.append("files", file));
    setSubmitting(true); setSubmitError("");
    try { setCreated(await createTicket(requester.id, data)); } catch (error) {
      if (error instanceof ApiError) {
        setErrors((value) => ({ ...value, ...error.fieldErrors }));
        setSubmitError(error.fieldErrors.referenceData ?? error.message);
      } else setSubmitError(error instanceof Error ? error.message : "Unable to create ticket");
    } finally { setSubmitting(false); }
  }

  if (created) return <section className="alert alert-success" role="status"><h2 className="h4">Ticket created successfully</h2><p>Official Ticket Number: <strong>{created.ticketNumber}</strong></p><p>Created: <strong>{new Date(created.createdAt).toLocaleString()}</strong></p><button className="btn btn-outline-zen" onClick={onCancel}>Back</button></section>;
  const required = <span className="required-marker" aria-hidden="true">*</span>;
  return <form className="card shadow-sm p-4" onSubmit={submit} noValidate><h1 className="h3 text-zen">Create Ticket</h1><p className="text-muted">Fields marked <span className="required-marker">*</span> are required.</p>
    {loadingReferences && <p>Loading ticket reference data...</p>}{referenceError && <div className="alert alert-danger">{referenceError}<button type="button" className="btn btn-outline-danger d-block mt-2" onClick={loadReferences}>Retry</button></div>}
    <div className="row g-3"><div className="col-md-6"><label htmlFor="ticket-date" className="form-label">Ticket Date</label><input id="ticket-date" className="form-control" value="Assigned on submission" readOnly /></div><div className="col-md-6"><label className="form-label">Requester</label><input className="form-control" value={requester.name} readOnly /></div>
    <div className="col-md-6"><label htmlFor="category" className="form-label">Category {required}</label><select id="category" className={`form-select ${errors.categoryId ? "is-invalid" : ""}`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={loadingReferences}><option value="">Select category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{errors.categoryId && <div className="invalid-feedback">{errors.categoryId}</div>}</div>
    <div className="col-md-6"><label htmlFor="system" className="form-label">Related System {required}</label><select id="system" className={`form-select ${errors.relatedSystemId ? "is-invalid" : ""}`} value={relatedSystemId} onChange={(e) => setRelatedSystemId(e.target.value)} disabled={loadingReferences}><option value="">Select related system</option>{systems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{errors.relatedSystemId && <div className="invalid-feedback">{errors.relatedSystemId}</div>}</div>
    <div className="col-12"><label htmlFor="summary" className="form-label">Ticket Summary {required}</label><input id="summary" className={`form-control ${errors.summary ? "is-invalid" : ""}`} maxLength={150} value={summary} onChange={(e) => setSummary(e.target.value)} />{errors.summary && <div className="invalid-feedback">{errors.summary}</div>}</div>
    <div className="col-12"><label htmlFor="description" className="form-label">Description {required}</label><textarea id="description" className={`form-control ${errors.description ? "is-invalid" : ""}`} rows={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />{errors.description && <div className="invalid-feedback">{errors.description}</div>}</div>
    <div className="col-md-6"><label htmlFor="priority" className="form-label">Requested Priority {required}</label><select id="priority" className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>{["LOW","MEDIUM","HIGH","URGENT"].map((item) => <option key={item}>{item}</option>)}</select></div>
    <div className="col-12"><label htmlFor="attachments" className="form-label">Attachments</label><input id="attachments" className={`form-control ${errors.files ? "is-invalid" : ""}`} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => selectFiles(Array.from(e.target.files ?? []))} />{errors.files && <div className="invalid-feedback">{errors.files}</div>}<ul className="list-group mt-2">{files.map((file, index) => <li className="list-group-item d-flex align-items-center justify-content-between gap-2" key={`${file.name}-${file.size}-${index}`}><span>{file.name} ({Math.ceil(file.size / 1024)} KB)</span><button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Remove ${file.name}`} onClick={() => removeFile(index)}>Remove</button></li>)}</ul></div></div>
    {submitError && <div className="alert alert-danger mt-3" role="alert">{submitError}</div>}<div className="ticket-actions d-flex flex-wrap gap-2 mt-4"><button type="button" className="btn btn-outline-zen" onClick={onCancel}>Cancel</button><button type="submit" className="btn btn-zen" disabled={submitting || loadingReferences}>{submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}{submitting ? "Submitting..." : "Submit Ticket"}</button></div>
  </form>;
}
