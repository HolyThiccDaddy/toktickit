import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  createAction,
  getActionAssignees,
  getActionRevisions,
  getActions,
  resolveActionFollowUp,
  updateAction,
  type ActionCreateInput,
  type ActionRevision,
  type ActionState,
  type ActionTaken,
  type ActionUpdateInput,
  type UserSummary,
} from "./api.js";

const actionStates: ActionState[] = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const transitions: Record<ActionState, ActionState[]> = {
  OPEN: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

type ActionForm = {
  actionDateTime: string;
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
  assigneeId: string;
};

const emptyForm = (): ActionForm => ({
  actionDateTime: "",
  description: "",
  result: "",
  followUpRequired: false,
  followUpNote: "",
  attachmentNotes: "",
  assigneeId: "",
});

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

function localDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function canonicalDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function idempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiError || reason instanceof Error ? reason.message : fallback;
}

const revisionLabels: Record<string, string> = {
  actionDateTime: "Action date/time",
  description: "Prior description",
  result: "Prior result",
  state: "State",
  assigneeId: "Assignee",
  followUpRequired: "Follow-up required",
  followUpNote: "Follow-up note",
  attachmentNotes: "Attachment notes",
  completedAt: "Completed at",
  completedById: "Completed by",
  cancelledAt: "Cancelled at",
  cancelledById: "Cancelled by",
  followUpResolvedAt: "Follow-up resolved at",
  followUpResolvedById: "Follow-up resolved by",
  version: "Version",
};

function revisionLabel(field: string) {
  return revisionLabels[field] ?? field.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}

function revisionValue(field: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "followUpRequired") return value === true ? "Yes" : "No";
  if (field.endsWith("At") || field === "actionDateTime") return formatDate(String(value));
  if (field.endsWith("Id") && field !== "version") return `User #${String(value)}`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function actionPayload(form: ActionForm): { payload: ActionCreateInput | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const actionDateTime = canonicalDateTime(form.actionDateTime);
  if (!actionDateTime) errors.actionDateTime = "Action date and time is required";
  const description = form.description.trim();
  if (description.length < 10 || description.length > 2000) errors.description = "Description must be 10-2000 characters";
  const result = form.result.trim();
  if (result.length < 1 || result.length > 2000) errors.result = "Result must be 1-2000 characters";
  const followUpNote = form.followUpNote.trim();
  if (form.followUpRequired && (followUpNote.length < 1 || followUpNote.length > 2000)) errors.followUpNote = "Follow-up note must be 1-2000 characters";
  if (!form.followUpRequired && followUpNote) errors.followUpNote = "Follow-up note is only allowed when follow-up is required";
  let assigneeId: number | null = null;
  if (form.assigneeId.trim()) {
    assigneeId = Number(form.assigneeId);
    if (!Number.isSafeInteger(assigneeId) || assigneeId <= 0) errors.assigneeId = "Assignee ID must be a positive number";
  }
  if (Object.keys(errors).length || !actionDateTime) return { payload: null, errors };
  return {
    payload: {
      actionDateTime,
      description,
      result,
      followUpRequired: form.followUpRequired,
      followUpNote: form.followUpRequired ? followUpNote : null,
      attachmentNotes: form.attachmentNotes.trim() || null,
      assigneeId,
    },
    errors,
  };
}

function initialForm(action?: ActionTaken): ActionForm {
  if (!action) return emptyForm();
  return {
    actionDateTime: localDateTime(action.actionDateTime),
    description: action.description,
    result: action.result,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote ?? "",
    attachmentNotes: action.attachmentNotes ?? "",
    assigneeId: action.assignee ? String(action.assignee.id) : "",
  };
}

export default function ActionsTaken({ user, ticketId }: { user: UserSummary; ticketId: number }) {
  const readOnly = user.role === "REQUESTER";
  const canWrite = !readOnly && (user.role === "IT_STAFF" || user.role === "ADMIN");
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [assignees, setAssignees] = useState<UserSummary[]>([]);
  const [assigneesLoading, setAssigneesLoading] = useState(false);
  const [assigneesError, setAssigneesError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<ActionTaken | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ActionForm>(emptyForm);
  const [revisions, setRevisions] = useState<Record<number, ActionRevision[]>>({});
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const [nextStates, setNextStates] = useState<Record<number, ActionState | "">>({});
  const keyRef = useRef(idempotencyKey());

  const loadActions = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await getActions(ticketId);
      setActions(result.items);
    } catch (reason) {
      setError(errorMessage(reason, "Unable to load Actions Taken"));
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { void loadActions(); }, [loadActions]);

  const loadAssignees = useCallback(async () => {
    if (!canWrite) return;
    setAssigneesLoading(true); setAssigneesError("");
    try {
      setAssignees(await getActionAssignees());
    } catch (reason) {
      setAssigneesError(errorMessage(reason, "Unable to load eligible Action assignees"));
    } finally {
      setAssigneesLoading(false);
    }
  }, [canWrite]);

  useEffect(() => { void loadAssignees(); }, [loadAssignees]);

  const editingLabel = editing ? "Edit Action" : "Create Action";
  const formBusy = busy === "create" || busy === "edit";
  const assigneeOptions = editing?.assignee && !assignees.some((candidate) => candidate.id === editing.assignee?.id)
    ? [...assignees, editing.assignee]
    : assignees;

  function updateForm<K extends keyof ActionForm>(field: K, value: ActionForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => { const next = { ...current }; delete next[field]; return next; });
    setFormError("");
  }

  function updateFollowUpRequired(value: boolean) {
    setForm((current) => ({ ...current, followUpRequired: value, ...(value ? {} : { followUpNote: "" }) }));
    setFieldErrors((current) => { const next = { ...current }; delete next.followUpRequired; delete next.followUpNote; return next; });
    setFormError("");
  }

  function beginCreate() {
    setEditing(null); setCreating(true); setForm(emptyForm()); setFormError(""); setFieldErrors({}); setSuccess(""); keyRef.current = idempotencyKey();
  }

  function beginEdit(action: ActionTaken) {
    setCreating(false); setEditing(action); setForm(initialForm(action)); setFormError(""); setFieldErrors({}); setSuccess("");
  }

  function cancelEdit() {
    setEditing(null); setCreating(false); setForm(emptyForm()); setFormError(""); setFieldErrors({});
  }

  async function submitForm() {
    const checked = actionPayload(form);
    if (!checked.payload) {
      const firstError = Object.values(checked.errors)[0] ?? "Please correct the highlighted fields";
      setFieldErrors(checked.errors);
      setFormError(firstError);
      return;
    }
    setBusy(editing ? "edit" : "create"); setFormError(""); setFieldErrors({}); setSuccess("");
    try {
      if (editing) {
        const actionDateTime = form.actionDateTime === localDateTime(editing.actionDateTime)
          ? editing.actionDateTime
          : checked.payload.actionDateTime;
        const input: ActionUpdateInput = { ...checked.payload, actionDateTime, version: editing.version };
        await updateAction(ticketId, editing.id, input);
        setSuccess("Action updated successfully.");
      } else {
        await createAction(ticketId, checked.payload, keyRef.current);
        setSuccess("Action created successfully.");
        keyRef.current = idempotencyKey();
      }
      cancelEdit();
      await loadActions();
    } catch (reason) {
      const apiErrors = reason instanceof ApiError ? reason.fieldErrors : {};
      setFieldErrors(apiErrors);
      setFormError(Object.values(apiErrors)[0] ?? errorMessage(reason, "Unable to save Action Taken"));
    } finally {
      setBusy("");
    }
  }

  async function showHistory(action: ActionTaken) {
    if (historyFor === action.id) { setHistoryFor(null); return; }
    setBusy(`history-${action.id}`); setFormError("");
    try {
      const result = await getActionRevisions(ticketId, action.id);
      setRevisions((current) => ({ ...current, [action.id]: result }));
      setHistoryFor(action.id);
    } catch (reason) {
      setFormError(errorMessage(reason, "Unable to load Action Taken history"));
    } finally {
      setBusy("");
    }
  }

  async function saveState(action: ActionTaken) {
    const state = nextStates[action.id];
    if (!state) return;
    setBusy(`state-${action.id}`); setFormError(""); setSuccess("");
    try {
      await updateAction(ticketId, action.id, { version: action.version, state });
      setSuccess(`Action moved to ${state}.`); setNextStates((current) => ({ ...current, [action.id]: "" })); await loadActions();
    } catch (reason) {
      setFormError(errorMessage(reason, "Unable to update Action state"));
    } finally {
      setBusy("");
    }
  }

  async function resolveFollowUp(action: ActionTaken) {
    setBusy(`follow-up-${action.id}`); setFormError(""); setSuccess("");
    try {
      await resolveActionFollowUp(ticketId, action.id, action.version);
      setSuccess("Follow-up resolved and audit history updated."); await loadActions();
    } catch (reason) {
      setFormError(errorMessage(reason, "Unable to resolve Action follow-up"));
    } finally {
      setBusy("");
    }
  }

  const actionCountLabel = useMemo(() => `${actions.length} Action${actions.length === 1 ? "" : "s"} Taken`, [actions.length]);

  return <section className="actions-taken" aria-labelledby={`actions-taken-title-${ticketId}`}>
    <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div><h2 id={`actions-taken-title-${ticketId}`} className="h4 mb-1">Actions Taken</h2><p className="text-muted small mb-0">{actionCountLabel}. Shared work history is visible to the requester; internal notes remain staff-only.</p></div>
      {canWrite && !editing && !creating && <button className="btn btn-zen" type="button" onClick={beginCreate}>Create Action</button>}
    </div>
    <div className="actions-taken-status" role="status" aria-live="polite" aria-busy={loading}>{loading ? "Loading Actions Taken…" : success}</div>
    {error && <div className="alert alert-danger" role="alert"><p className="mb-2">{error}</p><button className="btn btn-outline-danger" type="button" onClick={() => void loadActions()}>Retry actions</button></div>}
    {formError && <div className="alert alert-danger" role="alert">{formError}{formError.toLowerCase().includes("changed") && <button className="btn btn-sm btn-outline-danger ms-2" type="button" onClick={() => { cancelEdit(); void loadActions(); }}>Reload actions</button>}</div>}

    {canWrite && (editing || creating) && <div className="card shadow-sm p-4 mb-3 actions-taken-form" aria-labelledby="actions-taken-form-title">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2"><h3 id="actions-taken-form-title" className="h5">{editing ? "Edit Action" : "Create Action"}</h3>{editing && <button className="btn btn-outline-zen" type="button" onClick={cancelEdit} disabled={formBusy}>Cancel edit</button>}</div>
      <div className="actions-form-grid mt-3">
        <div><label className="form-label" htmlFor="action-date-time">Action date and time</label><input id="action-date-time" className={`form-control ${fieldErrors.actionDateTime ? "is-invalid" : ""}`} type="datetime-local" value={form.actionDateTime} onChange={(event) => updateForm("actionDateTime", event.target.value)} aria-invalid={Boolean(fieldErrors.actionDateTime)} aria-describedby={fieldErrors.actionDateTime ? "action-date-time-error" : undefined} />{fieldErrors.actionDateTime && <div id="action-date-time-error" className="invalid-feedback d-block">{fieldErrors.actionDateTime}</div>}</div>
        <div><label className="form-label" htmlFor="action-assignee-id">Assignee <span className="text-muted">(optional)</span></label><select id="action-assignee-id" className={`form-select ${fieldErrors.assigneeId ? "is-invalid" : ""}`} value={form.assigneeId} onChange={(event) => updateForm("assigneeId", event.target.value)} aria-invalid={Boolean(fieldErrors.assigneeId)} aria-describedby={fieldErrors.assigneeId ? "action-assignee-id-error" : undefined} disabled={assigneesLoading}><option value="">Unassigned</option>{assigneeOptions.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.displayName} · {candidate.role}</option>)}</select>{assigneesLoading && <div className="form-text" role="status">Loading eligible assignees…</div>}{fieldErrors.assigneeId && <div id="action-assignee-id-error" className="invalid-feedback d-block">{fieldErrors.assigneeId}</div>}{assigneesError && <div className="alert alert-danger mt-2" role="alert">{assigneesError}<button className="btn btn-sm btn-outline-danger ms-2" type="button" onClick={() => void loadAssignees()}>Retry assignees</button></div>}</div>
        <div className="actions-form-wide"><label className="form-label" htmlFor="action-description">Description</label><textarea id="action-description" className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`} rows={3} maxLength={2000} value={form.description} onChange={(event) => updateForm("description", event.target.value)} aria-describedby={fieldErrors.description ? "action-description-error action-description-help" : "action-description-help"} aria-invalid={Boolean(fieldErrors.description)} /><div id="action-description-help" className="form-text">10–2,000 characters.</div>{fieldErrors.description && <div id="action-description-error" className="invalid-feedback d-block">{fieldErrors.description}</div>}</div>
        <div className="actions-form-wide"><label className="form-label" htmlFor="action-result">Result</label><textarea id="action-result" className={`form-control ${fieldErrors.result ? "is-invalid" : ""}`} rows={3} maxLength={2000} value={form.result} onChange={(event) => updateForm("result", event.target.value)} aria-invalid={Boolean(fieldErrors.result)} aria-describedby={fieldErrors.result ? "action-result-error" : undefined} /><div className="form-text">1–2,000 characters.</div>{fieldErrors.result && <div id="action-result-error" className="invalid-feedback d-block">{fieldErrors.result}</div>}</div>
        <div className="actions-form-wide form-check"><input id="action-follow-up" className={`form-check-input ${fieldErrors.followUpRequired ? "is-invalid" : ""}`} type="checkbox" checked={form.followUpRequired} onChange={(event) => updateFollowUpRequired(event.target.checked)} aria-invalid={Boolean(fieldErrors.followUpRequired)} /><label className="form-check-label" htmlFor="action-follow-up">Follow-up required</label>{fieldErrors.followUpRequired && <div className="invalid-feedback d-block">{fieldErrors.followUpRequired}</div>}</div>
        {form.followUpRequired && <div className="actions-form-wide"><label className="form-label" htmlFor="action-follow-up-note">Follow-up note</label><textarea id="action-follow-up-note" className={`form-control ${fieldErrors.followUpNote ? "is-invalid" : ""}`} rows={2} maxLength={2000} value={form.followUpNote} onChange={(event) => updateForm("followUpNote", event.target.value)} aria-invalid={Boolean(fieldErrors.followUpNote)} aria-describedby={fieldErrors.followUpNote ? "action-follow-up-note-error" : undefined} />{fieldErrors.followUpNote && <div id="action-follow-up-note-error" className="invalid-feedback d-block">{fieldErrors.followUpNote}</div>}</div>}
        <div className="actions-form-wide"><label className="form-label" htmlFor="action-attachment-notes">Attachment notes <span className="text-muted">(optional)</span></label><textarea id="action-attachment-notes" className={`form-control ${fieldErrors.attachmentNotes ? "is-invalid" : ""}`} rows={2} maxLength={2000} value={form.attachmentNotes} onChange={(event) => updateForm("attachmentNotes", event.target.value)} aria-invalid={Boolean(fieldErrors.attachmentNotes)} aria-describedby={fieldErrors.attachmentNotes ? "action-attachment-notes-error" : undefined} />{fieldErrors.attachmentNotes && <div id="action-attachment-notes-error" className="invalid-feedback d-block">{fieldErrors.attachmentNotes}</div>}</div>
      </div>
      <div className="d-flex flex-wrap gap-2 mt-3"><button className="btn btn-zen" type="button" onClick={() => void submitForm()} disabled={formBusy}>{formBusy ? "Saving…" : editingLabel === "Edit Action" ? "Save changes" : "Save Action"}</button>{!editing && actions.length > 0 && <button className="btn btn-outline-zen" type="button" onClick={cancelEdit}>Clear form</button>}</div>
    </div>}

    {!error && !loading && actions.length === 0 && <div className="alert alert-secondary">No Actions Taken recorded yet.{canWrite && " Use Create Action to record the first work item."}</div>}
    {!error && actions.length > 0 && <div className="actions-taken-list">{actions.map((item) => {
      const available = transitions[item.state];
      const history = revisions[item.id] ?? [];
      const outstandingFollowUp = item.state === "COMPLETED" && item.followUpRequired && !item.followUpResolvedAt;
      return <article className="actions-taken-card card shadow-sm" key={item.id} aria-labelledby={`action-title-${item.id}`}>
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between gap-2"><div><h3 id={`action-title-${item.id}`} className="h5 mb-1">Action #{item.id}</h3><div className="small text-muted">{formatDate(item.actionDateTime)} · {item.performedBy.displayName} · {item.performedBy.role}</div></div><div className="d-flex flex-wrap gap-2 align-items-start"><span className="status-badge">{item.state}</span><span className="badge text-bg-light">Shared with requester</span></div></div>
          <dl className="row g-2 mt-3 mb-0"><div className="col-md-6"><dt>Description</dt><dd className="action-content">{item.description}</dd></div><div className="col-md-6"><dt>Result</dt><dd className="action-content">{item.result}</dd></div><div className="col-md-6"><dt>Assignee</dt><dd>{item.assignee ? `${item.assignee.displayName} · ${item.assignee.role}` : "Unassigned"}</dd></div><div className="col-md-6"><dt>Last updated</dt><dd>{formatDate(item.updatedAt)} · version {item.version}</dd></div></dl>
          {item.followUpRequired && <div className="alert alert-warning mt-3 mb-0"><strong>{item.followUpResolvedAt ? "Follow-up resolved" : "Follow-up required"}</strong><div>{item.followUpNote || "No note provided"}</div>{item.followUpResolvedAt && <div className="small mt-1">Resolved {formatDate(item.followUpResolvedAt)} by {item.followUpResolvedBy?.displayName ?? "authorized staff"}.</div>}</div>}
          {item.attachmentNotes && <p className="small text-muted mt-3 mb-0"><strong>Attachment notes:</strong> {item.attachmentNotes}</p>}
          <div className="actions-taken-controls d-flex flex-wrap align-items-end gap-2 mt-3">
            <button className="btn btn-sm btn-outline-zen" type="button" onClick={() => void showHistory(item)} disabled={busy === `history-${item.id}`}>{busy === `history-${item.id}` ? "Loading history…" : historyFor === item.id ? "Hide edit history" : "View edit history"}</button>
            {canWrite && <button className="btn btn-sm btn-outline-zen" type="button" onClick={() => beginEdit(item)}>Edit Action</button>}
            {canWrite && outstandingFollowUp && <button className="btn btn-sm btn-zen" type="button" onClick={() => void resolveFollowUp(item)} disabled={busy === `follow-up-${item.id}`}>{busy === `follow-up-${item.id}` ? "Resolving…" : "Resolve follow-up"}</button>}
            {canWrite && available.length > 0 && <><label className="visually-hidden" htmlFor={`action-state-${item.id}`}>Next state for Action {item.id}</label><select id={`action-state-${item.id}`} className="form-select form-select-sm action-state-select" value={nextStates[item.id] ?? ""} onChange={(event) => setNextStates((current) => ({ ...current, [item.id]: event.target.value as ActionState | "" }))}><option value="">Move Action…</option>{available.map((state) => <option key={state} value={state}>{state}</option>)}</select><button className="btn btn-sm btn-zen" type="button" onClick={() => void saveState(item)} disabled={!nextStates[item.id] || busy === `state-${item.id}`}>{busy === `state-${item.id}` ? "Saving…" : "Update Action state"}</button></>}
          </div>
          {historyFor === item.id && <div className="action-history mt-3" aria-label={`Edit history for Action ${item.id}`}><h4 className="h6">Edit history</h4>{history.length === 0 ? <p className="text-muted mb-0">No edits recorded.</p> : <ol className="list-group list-group-numbered">{history.map((revision) => <li className="list-group-item" key={revision.id}><div className="small text-muted">Version {revision.version} · {revision.changedBy.displayName} · {formatDate(revision.changedAt)}</div>{Object.entries(revision.before).filter(([field]) => field !== "id" && field !== "actionId").map(([field, value]) => <div key={field}><strong>{revisionLabel(field)}:</strong> {revisionValue(field, value)}</div>)}</li>)}</ol>}</div>}
        </div>
      </article>;
    })}</div>}
  </section>;
}
