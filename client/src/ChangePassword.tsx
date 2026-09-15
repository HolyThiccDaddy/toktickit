import { useState, type FormEvent } from "react";
import { ApiError, changePassword, type UserSummary } from "./api.js";

export default function ChangePassword({ user, onChanged, onSignOut }: { user: UserSummary; onChanged: (user: UserSummary) => void; onSignOut: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("Password must be 12-128 characters.");
      return;
    }
    setSubmitting(true);
    try {
      onChanged(await changePassword(currentPassword, newPassword));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to change password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-vh-100 d-flex align-items-center p-3" style={{ background: "#F5F7F6" }}>
    <section className="card shadow-sm mx-auto p-4 w-100" style={{ maxWidth: 520 }} aria-labelledby="change-password-title">
      <div className="fw-bold mb-2 text-zen">TokTickIT</div>
      <h1 id="change-password-title" className="h3 text-zen">Change your password</h1>
      <p>Your account requires a password change before you can access tickets.</p>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <form onSubmit={submit} noValidate>
        <div className="mb-3"><label className="form-label" htmlFor="current-password">Current password</label><input id="current-password" className="form-control" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div>
        <div className="mb-3"><label className="form-label" htmlFor="new-password">New password</label><input id="new-password" className="form-control" type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><div className="form-text">Use 12-128 characters.</div></div>
        <div className="mb-3"><label className="form-label" htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" className="form-control" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
        <div className="d-flex flex-wrap gap-2"><button className="btn btn-zen" type="submit" disabled={submitting}>{submitting ? "Updating..." : "Update password"}</button><button className="btn btn-outline-zen" type="button" onClick={onSignOut} disabled={submitting}>Sign out</button></div>
      </form>
      <p className="small text-muted mt-3 mb-0">Signed in as {user.email}</p>
    </section>
  </main>;
}
