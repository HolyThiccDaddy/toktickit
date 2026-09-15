import { useState, type FormEvent } from "react";
import { ApiError, login, type UserSummary } from "./api.js";

export default function Login({ onAuthenticated }: { onAuthenticated: (user: UserSummary) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function attemptSignIn() {
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      const session = await login(email, password);
      onAuthenticated(session.user);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await attemptSignIn();
  }

  return <main className="min-vh-100 d-flex align-items-center p-3" style={{ background: "#F5F7F6" }}>
    <section className="card shadow-sm mx-auto p-4 w-100" style={{ maxWidth: 460 }} aria-labelledby="login-title">
      <div className="fw-bold mb-2 text-zen">TokTickIT</div>
      <h1 id="login-title" className="h3 text-zen">Sign in to IT Service Desk</h1>
      <p className="text-muted">Use your TokTickIT account to view and manage your requests.</p>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      <form onSubmit={submit} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="login-email">Email</label>
          <input id="login-email" className="form-control" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="login-password">Password</label>
          <div className="input-group"><input id="login-password" className="form-control" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="btn btn-outline-secondary" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div>
        </div>
        {error && <button className="btn btn-link px-0 mb-2" type="button" onClick={() => void attemptSignIn()} disabled={submitting}>Retry sign in</button>}
        <button className="btn btn-zen w-100" type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Sign in"}</button>
      </form>
    </section>
  </main>;
}
