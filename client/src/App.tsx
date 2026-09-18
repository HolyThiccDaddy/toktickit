import { useCallback, useEffect, useState } from "react";
import { ApiError, checkSystem, getCurrentUser, logout, setUnauthorizedHandler, type Category, type UserSummary } from "./api.js";
import CreateTicket from "./CreateTicket.js";
import Login from "./Login.js";
import ChangePassword from "./ChangePassword.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";
import StaffQueue from "./StaffQueue.js";
import StaffTicketDetail from "./StaffTicketDetail.js";
import UserManagement from "./UserManagement.js";

type SystemState = "idle" | "loading" | "success" | "error";

function RequesterWorkspace({ user, onSignOut }: { user: UserSummary; onSignOut: () => void }) {
  const [view, setView] = useState<"system" | "tickets" | "create" | "detail">("system");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [state, setState] = useState<SystemState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCheckSystem() {
    setState("loading");
    setErrorMessage("");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to connect to TokTickIT API");
      setState("error");
    }
  }

  const navigation = <nav className="d-flex gap-2" aria-label="Primary navigation">
    <button className={`zen-nav-button px-2 py-1 ${view === "system" ? "active" : ""}`} type="button" onClick={() => setView("system")}>Home</button>
    <button className={`zen-nav-button px-2 py-1 ${view === "tickets" || view === "detail" ? "active" : ""}`} type="button" onClick={() => setView("tickets")}>My Tickets</button>
    <button className={`zen-nav-button px-2 py-1 ${view === "create" ? "active" : ""}`} type="button" onClick={() => setView("create")}>+ Create Ticket</button>
  </nav>;
  const header = <header className="zen-header d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 text-white w-100">
    <strong>TokTickIT</strong>{navigation}<div className="d-flex align-items-center gap-2"><span className="d-flex flex-column align-items-end"><span>{user.displayName}</span><span className="small opacity-75">{user.role}</span></span><button className="btn btn-light btn-sm" type="button" onClick={onSignOut}>Sign out</button></div>
  </header>;
  if (view === "create") return <><div>{header}</div><main className="container py-4" style={{ maxWidth: 900 }}><CreateTicket user={user} onCancel={() => setView("tickets")} /></main></>;
  if (view === "tickets") return <><div>{header}</div><main className="container py-4"><MyTickets user={user} onCreate={() => setView("create")} onView={(ticketId) => { setSelectedTicketId(ticketId); setView("detail"); }} /></main></>;
  if (view === "detail" && selectedTicketId !== null) return <><div>{header}</div><main className="container py-4"><TicketDetail user={user} ticketId={selectedTicketId} onBack={() => setView("tickets")} /></main></>;
  return <><div>{header}</div><main className="container py-5" style={{ maxWidth: 640 }}>
    <h1 className="h3 mb-4">TokTickIT <span className="text-success">IT Service Desk</span></h1>
    <button className="btn btn-zen mb-3" type="button" onClick={handleCheckSystem} disabled={state === "loading"}>{state === "loading" ? "Loading…" : "Check System"}</button>
    {state === "success" && <section className="mt-3"><p className="fw-bold text-success">System Status: Online</p><p className="fw-semibold mb-2">Supported Request Categories:</p><ol className="list-group list-group-numbered">{categories.map((category) => <li key={category.id} className="list-group-item">{category.name}</li>)}</ol></section>}
    {state === "error" && <section className="mt-3 text-danger" role="alert"><p className="fw-bold mb-1">System Status: Offline</p><p>{errorMessage}</p><button className="btn btn-outline-danger" type="button" onClick={handleCheckSystem}>Retry</button></section>}
  </main></>;
}

function StaffWorkspace({ user, onSignOut }: { user: UserSummary; onSignOut: () => void }) {
  const [view, setView] = useState<"queue" | "detail">("queue");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const header = <header className="zen-header d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 text-white w-100"><strong>TokTickIT</strong><nav className="d-flex gap-2" aria-label="Primary navigation"><button className={`zen-nav-button px-2 py-1 ${view === "queue" ? "active" : ""}`} type="button" onClick={() => setView("queue")}>Ticket Queue</button>{view === "detail" && selectedTicketId !== null && <button className="zen-nav-button px-2 py-1 active" type="button" aria-current="page" onClick={() => setView("detail")}>Ticket Detail</button>}</nav><div className="d-flex align-items-center gap-2"><span className="d-flex flex-column align-items-end"><span>{user.displayName}</span><span className="small opacity-75">{user.role}</span></span><button className="btn btn-light btn-sm" type="button" onClick={onSignOut}>Sign out</button></div></header>;
  return <><div>{header}</div><main className="container py-4"><>{view === "queue" ? <StaffQueue user={user} onView={(ticketId) => { setSelectedTicketId(ticketId); setView("detail"); }} /> : selectedTicketId !== null ? <StaffTicketDetail user={user} ticketId={selectedTicketId} onBack={() => setView("queue")} /> : <StaffQueue user={user} onView={() => setView("queue")} />}</></main></>;
}

function AdminWorkspace({ user, onSignOut }: { user: UserSummary; onSignOut: () => void }) {
  const [view, setView] = useState<"users" | "queue" | "detail">("users");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const header = <header className="zen-header d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 text-white w-100"><strong>TokTickIT</strong><nav className="d-flex gap-2" aria-label="Primary navigation"><button className={`zen-nav-button px-2 py-1 ${view === "users" ? "active" : ""}`} type="button" onClick={() => setView("users")}>User Management</button><button className={`zen-nav-button px-2 py-1 ${view === "queue" ? "active" : ""}`} type="button" onClick={() => setView("queue")}>Ticket Queue</button>{view === "detail" && selectedTicketId !== null && <button className="zen-nav-button px-2 py-1 active" type="button" onClick={() => setView("detail")}>Ticket Detail</button>}</nav><div className="d-flex align-items-center gap-2"><span className="d-flex flex-column align-items-end"><span>{user.displayName}</span><span className="small opacity-75">{user.role}</span></span><button className="btn btn-light btn-sm" type="button" onClick={onSignOut}>Sign out</button></div></header>;
  return <><div>{header}</div><main className="container py-4">{view === "users" ? <UserManagement user={user} /> : view === "queue" ? <StaffQueue user={user} onView={(ticketId) => { setSelectedTicketId(ticketId); setView("detail"); }} /> : selectedTicketId !== null ? <StaffTicketDetail user={user} ticketId={selectedTicketId} onBack={() => setView("queue")} /> : <StaffQueue user={user} onView={() => setView("queue")} />}</main></>;
}

export default function App() {
  const [state, setState] = useState<"loading" | "signed-out" | "signed-in" | "error">("loading");
  const [user, setUser] = useState<UserSummary | null>(null);
  const [error, setError] = useState("");
  const [signOutError, setSignOutError] = useState("");

  const handleUnauthorized = useCallback(() => {
    setUser(null);
    setState("signed-out");
    setError("");
    setSignOutError("");
  }, []);

  useEffect(() => setUnauthorizedHandler(handleUnauthorized), [handleUnauthorized]);

  const refresh = useCallback(async () => {
    setState("loading");
    try {
      setUser(await getCurrentUser());
      setState("signed-in");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) { handleUnauthorized(); return; }
      setError(reason instanceof Error ? reason.message : "Unable to load your session");
      setState("error");
    }
  }, [handleUnauthorized]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function signOut() {
    setSignOutError("");
    try {
      await logout();
      setUser(null);
      setState("signed-out");
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) { handleUnauthorized(); return; }
      setSignOutError(reason instanceof Error ? reason.message : "Unable to sign out. Please try again.");
    }
  }

  if (state === "loading") return <main className="min-vh-100 d-flex align-items-center justify-content-center"><p role="status">Loading your TokTickIT session...</p></main>;
  if (state === "error") return <main className="min-vh-100 d-flex align-items-center justify-content-center p-3"><section className="alert alert-danger" role="alert"><strong>Unable to load session.</strong><p className="mb-2">{error}</p><button className="btn btn-outline-danger" type="button" onClick={() => void refresh()}>Retry</button></section></main>;
  if (!user) return <Login onAuthenticated={(next) => { setSignOutError(""); setUser(next); setState("signed-in"); }} />;
  const authenticatedView = user.mustChangePassword
    ? <ChangePassword user={user} onChanged={(next) => setUser(next)} onSignOut={() => void signOut()} />
    : user.role === "REQUESTER"
      ? <RequesterWorkspace user={user} onSignOut={() => void signOut()} />
      : user.role === "ADMIN"
        ? <AdminWorkspace user={user} onSignOut={() => void signOut()} />
        : <StaffWorkspace user={user} onSignOut={() => void signOut()} />;
  return <>
    {signOutError && <div className="alert alert-danger m-3" role="alert"><p className="mb-2">{signOutError}</p><button className="btn btn-outline-danger" type="button" onClick={() => void signOut()}>Retry sign out</button></div>}
    {authenticatedView}
  </>;
}
