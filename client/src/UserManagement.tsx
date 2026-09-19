import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError, createAdminUser, getAdminUsers, resetAdminUserPassword, updateAdminUser,
  type AdminUserInput, type AuthRole, type UserSummary,
} from "./api.js";

const roles: AuthRole[] = ["REQUESTER", "IT_STAFF", "ADMIN"];
const blankForm: AdminUserInput = { email: "", displayName: "", role: "REQUESTER", active: true, initialPassword: "" };

function errorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : reason instanceof Error ? reason.message : fallback;
}

export default function UserManagement({ user }: { user: UserSummary }) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<AuthRole | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserSummary | null>(null);
  const [form, setForm] = useState<AdminUserInput>(blankForm);
  const [saving, setSaving] = useState(false);
  const [resetUser, setResetUser] = useState<UserSummary | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const loadSequence = useRef(0);
  const filtersRef = useRef<{ q: string; role: AuthRole | "" }>({ q, role });
  filtersRef.current = { q, role };

  const load = useCallback(async () => {
    const requestSequence = ++loadSequence.current;
    setLoading(true); setError("");
    const { q: currentQ, role: currentRole } = filtersRef.current;
    try {
      const result = await getAdminUsers({ q: currentQ, role: currentRole || undefined });
      if (requestSequence === loadSequence.current) setUsers(result);
    } catch (reason) {
      if (requestSequence === loadSequence.current) setError(errorMessage(reason, "Unable to load users"));
    } finally {
      if (requestSequence === loadSequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [q, role, load]);

  function openCreate() {
    setEditing(null); setForm({ ...blankForm }); setFormOpen(true); setError(""); setSuccess("");
  }
  function openEdit(next: UserSummary) {
    setEditing(next); setForm({ email: next.email, displayName: next.displayName, role: next.role, active: next.active, initialPassword: "" }); setFormOpen(true); setError(""); setSuccess("");
  }
  function closeForm() { setFormOpen(false); setEditing(null); }
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      if (editing) {
        const changes: Partial<Pick<UserSummary, "email" | "displayName" | "role" | "active">> = {};
        if (form.email !== editing.email) changes.email = form.email;
        if (form.displayName !== editing.displayName) changes.displayName = form.displayName;
        if (form.role !== editing.role) changes.role = form.role;
        if (form.active !== editing.active) changes.active = form.active;
        if (Object.keys(changes).length) {
          const updated = await updateAdminUser(editing.id, changes);
          await load();
          setSuccess("Updated " + updated.displayName + ".");
        } else {
          setSuccess("No changes made.");
        }
      } else {
        const created = await createAdminUser(form);
        await load();
        setSuccess("Created " + created.displayName + ".");
      }
      closeForm();
    } catch (reason) { setError(errorMessage(reason, editing ? "Unable to update user" : "Unable to create user")); }
    finally { setSaving(false); }
  }
  async function toggleActive(next: UserSummary) {
    setError(""); setSuccess("");
    try {
      const updated = await updateAdminUser(next.id, { active: !next.active });
      await load();
      setSuccess(updated.displayName + " is now " + (updated.active ? "active" : "inactive") + ".");
    } catch (reason) { setError(errorMessage(reason, "Unable to update user")); }
  }
  async function reset(event: FormEvent) {
    event.preventDefault();
    if (!resetUser) return;
    setResetting(true); setError(""); setSuccess("");
    try {
      await resetAdminUserPassword(resetUser.id, resetPassword);
      await load();
      setSuccess("Reset the initial password for " + resetUser.displayName + ".");
      setResetUser(null); setResetPassword("");
    } catch (reason) { setError(errorMessage(reason, "Unable to reset initial password")); }
    finally { setResetting(false); }
  }

  return <section className="user-management" aria-labelledby="user-management-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div><h1 id="user-management-title" className="h3 text-zen mb-1">User Management</h1><p className="text-muted mb-0">Manage roles and account activation without exposing credentials.</p></div>
      <span className="status-badge" aria-label="Current role">{user.role}</span>
    </div>
    {error && <div className="alert alert-danger" role="alert"><p className="mb-2">{error}</p><button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void load()}>Retry</button></div>}
    {success && <div className="alert alert-success" role="status">{success}</div>}
    <div className="card shadow-sm p-3 mb-3"><div className="row g-3 align-items-end">
      <div className="col-md-6"><label className="form-label" htmlFor="admin-user-search">Search users</label><input id="admin-user-search" className="form-control" placeholder="Name or email" value={q} onChange={(event) => setQ(event.target.value)} /></div>
      <div className="col-md-3"><label className="form-label" htmlFor="admin-role-filter">Role</label><select id="admin-role-filter" className="form-select" value={role} onChange={(event) => setRole(event.target.value as AuthRole | "")}><option value="">All roles</option>{roles.map((value) => <option key={value}>{value}</option>)}</select></div>
      <div className="col-md-3"><button className="btn btn-zen w-100" type="button" onClick={openCreate}>Create user</button></div>
    </div></div>

    {formOpen && <form className="card shadow-sm p-4 mb-3" onSubmit={save} aria-labelledby="admin-user-form-title">
      <div className="d-flex justify-content-between align-items-center gap-2 mb-3"><h2 id="admin-user-form-title" className="h5 mb-0">{editing ? "Edit user" : "Create user"}</h2><button className="btn btn-link" type="button" onClick={closeForm}>Cancel</button></div>
      <div className="row g-3"><div className="col-md-6"><label className="form-label" htmlFor="admin-user-email">Email</label><input id="admin-user-email" className="form-control" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
        <div className="col-md-6"><label className="form-label" htmlFor="admin-user-name">Display name</label><input id="admin-user-name" className="form-control" required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></div>
        <div className="col-md-4"><label className="form-label" htmlFor="admin-user-role">Role</label><select id="admin-user-role" className="form-select" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AuthRole })}>{roles.map((value) => <option key={value}>{value}</option>)}</select></div>
        <div className="col-md-4 d-flex align-items-end"><div className="form-check mb-2"><input id="admin-user-active" className="form-check-input" type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><label className="form-check-label" htmlFor="admin-user-active">Active account</label></div></div>
        {!editing && <div className="col-md-8"><label className="form-label" htmlFor="admin-user-initial-password">Initial password</label><input id="admin-user-initial-password" className="form-control" type="password" minLength={12} maxLength={128} required value={form.initialPassword} onChange={(event) => setForm({ ...form, initialPassword: event.target.value })} /><div className="form-text">12-128 characters; the user must change it on first login.</div></div>}
      </div><button className="btn btn-zen mt-3" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create user"}</button>
    </form>}

    {resetUser && <form className="card shadow-sm p-4 mb-3" onSubmit={reset} aria-labelledby="admin-reset-title"><h2 id="admin-reset-title" className="h5">Reset initial password for {resetUser.displayName}</h2><label className="form-label" htmlFor="admin-reset-password">New initial password</label><input id="admin-reset-password" className="form-control" type="password" minLength={12} maxLength={128} required value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /><div className="d-flex gap-2 mt-3"><button className="btn btn-zen" type="submit" disabled={resetting}>{resetting ? "Resetting…" : "Reset password"}</button><button className="btn btn-outline-zen" type="button" onClick={() => { setResetUser(null); setResetPassword(""); }}>Cancel</button></div></form>}

    {loading && <p role="status">Loading users...</p>}
    {!loading && !users.length && <div className="card shadow-sm p-5 text-center"><h2 className="h5">{q || role ? "No matching users found." : "No users found."}</h2></div>}
    {!loading && users.length > 0 && <>
      <div className="table-responsive admin-user-table"><table className="table table-hover align-middle bg-white"><thead><tr><th>Display name</th><th>Email</th><th>Role</th><th>State</th><th>Actions</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td>{item.displayName}</td><td>{item.email}</td><td><span className="status-badge">{item.role}</span></td><td>{item.active ? "Active" : "Inactive"}{item.mustChangePassword && <span className="small text-muted d-block">Password change required</span>}</td><td><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-zen" type="button" onClick={() => openEdit(item)}>Edit</button><button className="btn btn-sm btn-outline-zen" type="button" onClick={() => void toggleActive(item)}>{item.active ? "Deactivate" : "Activate"}</button><button className="btn btn-sm btn-outline-zen" type="button" onClick={() => { setResetUser(item); setResetPassword(""); }}>Reset password</button></div></td></tr>)}</tbody></table></div>
      <div className="admin-user-card-list" data-testid="admin-user-card-list">{users.map((item) => <article className="card shadow-sm p-3" key={item.id}><div className="d-flex justify-content-between gap-2"><strong>{item.displayName}</strong><span className="status-badge">{item.role}</span></div><p className="mb-1">{item.email}</p><p className="small text-muted mb-2">{item.active ? "Active" : "Inactive"}{item.mustChangePassword ? " · Password change required" : ""}</p><div className="d-flex flex-wrap gap-2"><button className="btn btn-sm btn-outline-zen" type="button" onClick={() => openEdit(item)}>Edit</button><button className="btn btn-sm btn-outline-zen" type="button" onClick={() => void toggleActive(item)}>{item.active ? "Deactivate" : "Activate"}</button><button className="btn btn-sm btn-outline-zen" type="button" onClick={() => { setResetUser(item); setResetPassword(""); }}>Reset password</button></div></article>)}</div>
    </>}
  </section>;
}
