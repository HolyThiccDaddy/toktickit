import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ApiError, checkSystem, getCurrentUser, logout, setUnauthorizedHandler, type Category, type UserSummary } from "./api.js";
import CreateTicket from "./CreateTicket.js";
import Login from "./Login.js";
import ChangePassword from "./ChangePassword.js";
import MyTickets from "./MyTickets.js";
import TicketDetail from "./TicketDetail.js";
import StaffQueue from "./StaffQueue.js";
import StaffTicketDetail from "./StaffTicketDetail.js";
import UserManagement from "./UserManagement.js";
import RequesterDashboard from "./RequesterDashboard.js";
import StaffDashboard from "./StaffDashboard.js";
import StaffActionsList from "./StaffActionsList.js";

type SystemState = "idle" | "loading" | "success" | "error";

function RequesterWorkspace({ user, onSignOut }: { user: UserSummary; onSignOut: () => void }) {
  const [view, setView] = useState<WorkspaceView>("system");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketHref, setTicketHref] = useState<string | undefined>();
  const [state, setState] = useState<SystemState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleCheckSystem() {
    setState("loading"); setErrorMessage("");
    try { const result = await checkSystem(); setCategories(result.categories); setState("success"); }
    catch (error) { setErrorMessage(error instanceof Error ? error.message : "Unable to connect to TokTickIT API"); setState("error"); }
  }
  const openTicket = (ticketId: number) => { setSelectedTicketId(ticketId); setView("detail"); };
  let content: ReactNode;
  if (view === "create") content = <CreateTicket user={user} onCancel={() => setView("tickets")} />;
  else if (view === "dashboard") content = <RequesterDashboard user={user} onOpenTickets={(href) => { setTicketHref(href); setView("tickets"); }} onViewTicket={openTicket} />;
  else if (view === "tickets") content = <MyTickets key={ticketHref} user={user} initialHref={ticketHref} onCreate={() => setView("create")} onView={openTicket} />;
  else if (view === "detail" && selectedTicketId !== null) content = <TicketDetail user={user} ticketId={selectedTicketId} onBack={() => setView("tickets")} />;
  else content = <section className="system-overview">
    <h1 className="h3 mb-4">TokTickIT <span className="text-success">IT Service Desk</span></h1>
    <button className="btn btn-zen mb-3" type="button" onClick={handleCheckSystem} disabled={state === "loading"}>{state === "loading" ? "Loading…" : "Check System"}</button>
    {state === "success" && <section className="mt-3"><p className="fw-bold text-success">System Status: Online</p><p className="fw-semibold mb-2">Supported Request Categories:</p><ol className="list-group list-group-numbered">{categories.map((category) => <li key={category.id} className="list-group-item">{category.name}</li>)}</ol></section>}
    {state === "error" && <section className="mt-3 text-danger" role="alert"><p className="fw-bold mb-1">System Status: Offline</p><p>{errorMessage}</p><button className="btn btn-outline-danger" type="button" onClick={handleCheckSystem}>Retry</button></section>}
  </section>;
  return <WorkspaceShell user={user} activeView={view} isAdmin={false} onNavigate={(next) => { if (next === "tickets") setTicketHref(undefined); setView(next); }} onSearch={(query) => { setTicketHref(`/my-tickets?search=${encodeURIComponent(query)}`); setView("tickets"); }} onSignOut={onSignOut}>{content}</WorkspaceShell>;
}

type WorkspaceView = "system" | "tickets" | "create" | "dashboard" | "queue" | "actions" | "users" | "detail";

function WorkspaceIcon({ name }: { name: "overview" | "queue" | "actions" | "users" }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    queue: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    actions: <><path d="M4 17h4l3-10 4 12 3-8h3" /><path d="M17 5h4v4" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  };
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function WorkspaceShell({ user, activeView, isAdmin, onNavigate, onSearch, onSignOut, children }: {
  user: UserSummary;
  activeView: WorkspaceView;
  isAdmin: boolean;
  onNavigate: (view: WorkspaceView) => void;
  onSearch: (query: string) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const requester = user.role === "REQUESTER";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const compactLayout = window.matchMedia("(max-width: 767.98px)");
    const syncNavigation = () => {
      if (navigationRef.current) navigationRef.current.inert = compactLayout.matches && !mobileMenuOpen;
    };
    syncNavigation();
    compactLayout.addEventListener("change", syncNavigation);
    return () => compactLayout.removeEventListener("change", syncNavigation);
  }, [mobileMenuOpen]);
  function closeMobileMenu() {
    setMobileMenuOpen(false);
    if (mobileMenuOpen) mobileMenuButton.current?.focus();
  }
  function navigate(view: WorkspaceView) {
    onNavigate(view);
    closeMobileMenu();
  }
  const navigation: Array<{ view: WorkspaceView; label: string; icon: "overview" | "queue" | "actions" | "users" }> = requester ? [
    { view: "system", label: "Home", icon: "overview" },
    { view: "dashboard", label: "Dashboard", icon: "overview" },
    { view: "tickets", label: "My Tickets", icon: "queue" },
    { view: "create", label: "+ Create Ticket", icon: "actions" },
  ] : [
    { view: "dashboard", label: "Dashboard", icon: "overview" },
    { view: "queue", label: "Ticket Queue", icon: "queue" },
    { view: "actions", label: "My Actions", icon: "actions" },
    ...(isAdmin ? [{ view: "users" as const, label: "User Management", icon: "users" as const }] : []),
  ];
  const initials = user.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const currentView = activeView === "detail" ? (requester ? "tickets" : "queue") : activeView;

  return <div className="ops-viewport"><div className="ops-shell">
    <button className={`ops-mobile-backdrop ${mobileMenuOpen ? "is-visible" : ""}`} type="button" aria-label="Close navigation" aria-hidden={!mobileMenuOpen} disabled={!mobileMenuOpen} tabIndex={-1} onClick={closeMobileMenu} />
    <aside className={`ops-sidebar ${mobileMenuOpen ? "is-open" : ""}`} onKeyDown={(event) => { if (event.key === "Escape" && mobileMenuOpen) { event.preventDefault(); closeMobileMenu(); } }}>
      <a className="ops-brand" href="#overview" onClick={(event) => { event.preventDefault(); navigate("dashboard"); }} aria-label="TokTickIT overview">
        <span className="ops-brand-mark" aria-hidden="true">T</span><span>TokTickIT<small>IT SERVICE DESK</small></span>
      </a>
      <button ref={mobileMenuButton} className="ops-mobile-menu" type="button" aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenuOpen} aria-controls="ops-workspace-nav" onClick={() => setMobileMenuOpen((open) => !open)}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">{mobileMenuOpen ? <path d="m6 6 12 12M6 18 18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}</svg></button>
      <p className="ops-sidebar-label">WORKSPACE</p>
      <nav ref={navigationRef} id="ops-workspace-nav" className="ops-nav" aria-label="Workspace navigation">{navigation.map((item) => <button key={item.view} className={`ops-nav-item ${currentView === item.view ? "active" : ""}`} type="button" onClick={() => navigate(item.view)} aria-current={currentView === item.view ? "page" : undefined}>
        <span><WorkspaceIcon name={item.icon} /></span>{item.label}
      </button>)}<div className="ops-mobile-account" aria-hidden={!mobileMenuOpen}><span>{user.displayName}<small>{requester ? "Requester" : isAdmin ? "Administrator" : "IT Staff"}</small></span><button type="button" onClick={onSignOut}>Sign out</button></div></nav>
      <div className="ops-sidebar-spacer" />
      <section className="ops-sidebar-callout" aria-label={requester ? "Request shortcut" : "Queue shortcut"}><span className="ops-callout-mark" aria-hidden="true">!</span><strong>{requester ? "Need IT support?" : "Requests need action?"}</strong><p>{requester ? "Tell the service desk what you need help with." : "Open the shared queue to review and assign tickets."}</p><button type="button" onClick={() => onNavigate(requester ? "create" : "queue")}>{requester ? "Start a request" : "Open queue"} <span aria-hidden="true">→</span></button></section>
      <div className="ops-sidebar-account"><span className="ops-avatar" aria-hidden="true">{initials || "U"}</span><span className="ops-account-name">{user.displayName}<small>{requester ? "Requester" : user.role === "ADMIN" ? "Administrator" : "IT Staff"}</small></span><button className="ops-signout" type="button" onClick={onSignOut}>Sign out</button></div>
    </aside>
    <div className="ops-main">
      <header className="ops-topbar">
        <form className="ops-search" role="search" onSubmit={(event) => { event.preventDefault(); if (query.trim()) onSearch(query.trim()); }}>
          <label className="visually-hidden" htmlFor="ops-ticket-search">{requester ? "Search all your tickets" : "Search tickets"}</label><span aria-hidden="true">⌕</span><input id="ops-ticket-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={requester ? "Search your tickets…" : "Search tickets, requesters, or categories…"} />
        </form>
        <div className="ops-topbar-actions"><span className="ops-current-user"><span>{user.displayName}</span><small>{user.role}</small></span><button className="ops-quick-action" type="button" aria-label={requester ? "Create a ticket" : "Browse support queue"} onClick={() => onNavigate(requester ? "create" : "queue")}><span aria-hidden="true">+</span><span className="ops-quick-action-label">{requester ? "Create request" : "Browse queue"}</span></button></div>
      </header>
      <main className="ops-content"><div className="ops-view" key={activeView}>{children}</div></main>
    </div>
  </div></div>;
}

function StaffWorkspace({ user, onSignOut }: { user: UserSummary; onSignOut: () => void }) {
  const [view, setView] = useState<WorkspaceView>("queue");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [queueHref, setQueueHref] = useState<string | undefined>();
  const [actionsHref, setActionsHref] = useState<string | undefined>();
  const content = view === "dashboard" ? <StaffDashboard user={user} onOpenQueue={(href) => { setQueueHref(href); setView("queue"); }} onOpenActions={(href) => { setActionsHref(href); setView("actions"); }} onViewTicket={(ticketId) => { setSelectedTicketId(ticketId); setView("detail"); }} /> : view === "queue" ? <StaffQueue key={queueHref} user={user} initialHref={queueHref} onView={(ticketId) => { setSelectedTicketId(ticketId); setView("detail"); }} /> : view === "actions" ? <StaffActionsList user={user} initialHref={actionsHref} onViewTicket={(ticketId) => { setSelectedTicketId(ticketId); setView("detail"); }} /> : selectedTicketId !== null ? <StaffTicketDetail user={user} ticketId={selectedTicketId} onBack={() => setView("queue")} /> : <StaffQueue key={queueHref} user={user} initialHref={queueHref} onView={() => setView("queue")} />;
  return <WorkspaceShell user={user} activeView={view} isAdmin={false} onNavigate={setView} onSearch={(query) => { setQueueHref(`/staff/queue?q=${encodeURIComponent(query)}`); setView("queue"); }} onSignOut={onSignOut}>{content}</WorkspaceShell>;
}

function AdminWorkspace({ user, onSignOut }: { user: UserSummary; onSignOut: () => void }) {
  const [view, setView] = useState<WorkspaceView>("users");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [queueHref, setQueueHref] = useState<string | undefined>();
  const [actionsHref, setActionsHref] = useState<string | undefined>();
  const content = view === "dashboard" ? <StaffDashboard user={user} onOpenQueue={(href) => { setQueueHref(href); setView("queue"); }} onOpenActions={(href) => { setActionsHref(href); setView("actions"); }} onViewTicket={(ticketId) => { setSelectedTicketId(ticketId); setView("detail"); }} /> : view === "users" ? <UserManagement user={user} /> : view === "queue" ? <StaffQueue key={queueHref} user={user} initialHref={queueHref} onView={(ticketId) => { setSelectedTicketId(ticketId); setView("detail"); }} /> : view === "actions" ? <StaffActionsList user={user} initialHref={actionsHref} onViewTicket={(ticketId) => { setSelectedTicketId(ticketId); setView("detail"); }} /> : selectedTicketId !== null ? <StaffTicketDetail user={user} ticketId={selectedTicketId} onBack={() => setView("queue")} /> : <StaffQueue key={queueHref} user={user} initialHref={queueHref} onView={() => setView("queue")} />;
  return <WorkspaceShell user={user} activeView={view} isAdmin onNavigate={setView} onSearch={(query) => { setQueueHref(`/staff/queue?q=${encodeURIComponent(query)}`); setView("queue"); }} onSignOut={onSignOut}>{content}</WorkspaceShell>;
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

