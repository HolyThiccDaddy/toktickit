import { useCallback, useEffect, useState } from "react";
import { checkSystem, getRequesters, type Category, type Requester } from "./api.js";
import { RequesterProvider, useRequester } from "./RequesterContext.js";
import CreateTicket from "./CreateTicket.js";
import MyTickets from "./MyTickets.js";

type LoadState = "loading" | "ready" | "empty" | "error";
type SystemState = "idle" | "loading" | "success" | "error";

function RequesterWorkspace({ requester, onChangeRequester }: { requester: Requester; onChangeRequester: () => void }) {
  const [view, setView] = useState<"system" | "tickets" | "create">("system");
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

  const navigation = <nav className="d-flex gap-2" aria-label="Primary navigation"><button className={`zen-nav-button px-2 py-1 ${view === "system" ? "active" : ""}`} type="button" onClick={() => setView("system")}>Home</button><button className={`zen-nav-button px-2 py-1 ${view === "tickets" ? "active" : ""}`} type="button" onClick={() => setView("tickets")}>My Tickets</button><button className={`zen-nav-button px-2 py-1 ${view === "create" ? "active" : ""}`} type="button" onClick={() => setView("create")}>+ Create Ticket</button></nav>;
  const header = <header className="zen-header d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 text-white w-100"><strong>TokTickIT</strong>{navigation}<div className="d-flex align-items-center gap-2"><span>{requester.name}</span><button className="btn btn-light btn-sm" onClick={onChangeRequester}>Change Requester</button></div></header>;
  if (view === "create") return <>{header}<main className="container py-4" style={{ maxWidth: 900 }}><CreateTicket requester={requester} onCancel={() => setView("tickets")} /></main></>;
  if (view === "tickets") return <>{header}<main className="container py-4"><MyTickets requester={requester} onCreate={() => setView("create")} /></main></>;
  return <>{header}<main className="container py-5" style={{ maxWidth: 640 }}>
    <h1 className="h3 mb-4">TokTickIT <span className="text-success">IT Service Desk</span></h1>
    <button className="btn btn-zen mb-3" onClick={handleCheckSystem} disabled={state === "loading"}>{state === "loading" ? "Loading…" : "Check System"}</button>
    {state === "success" && <section className="mt-3"><p className="fw-bold text-success">System Status: Online</p><p className="fw-semibold mb-2">Supported Request Categories:</p><ol className="list-group list-group-numbered">{categories.map((category) => <li key={category.id} className="list-group-item">{category.name}</li>)}</ol></section>}
    {state === "error" && <section className="mt-3 text-danger" role="alert"><p className="fw-bold mb-1">System Status: Offline</p><p>{errorMessage}</p></section>}
  </main></>;
}

function RequesterApp() {
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const { requesterId, selectRequester, clearRequester } = useRequester();
  const [state, setState] = useState<LoadState>("loading");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const active = (await getRequesters()).filter((item) => item.isActive);
      setRequesters(active);
      if (requesterId !== null && !active.some((item) => item.id === requesterId)) clearRequester();
      setState(active.length ? "ready" : "empty");
    } catch { setState("error"); }
  }, [requesterId, clearRequester]);
  useEffect(() => { void load(); }, [load]);

  // Keep the validated workspace mounted while the requester list refreshes.
  // Otherwise selecting an identity briefly unmounts the workspace and repeats its API calls.
  const current = requesters.find((item) => item.id === requesterId);
  if (current) return <RequesterWorkspace requester={current} onChangeRequester={() => { clearRequester(); setSelectedId(""); }} />;

  function continueWithRequester() {
    const selected = requesters.find((item) => item.id === Number(selectedId));
    if (selected) selectRequester(selected.id);
  }

  return <main className="min-vh-100 d-flex align-items-center p-3" style={{ background: "#F5F7F6" }}><section className="card shadow-sm mx-auto p-4 w-100" style={{ maxWidth: 560 }}>
    <div className="fw-bold mb-2" style={{ color: "#006B3C" }}>TokTickIT</div><div className="d-flex align-items-center gap-3 mb-2"><span className="d-inline-flex align-items-center justify-content-center rounded-circle" style={{ width: 40, height: 40, background: "#EAF6EF", color: "#006B3C", fontSize: 22 }} aria-hidden="true">👤</span><h1 className="h3 mb-0" style={{ color: "#006B3C" }}>Select Development Requester</h1></div>
    <p>Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen.</p>
    <div className="alert" style={{ background: "#EAF6EF" }}><strong>Authentication coming in Lab 3.</strong> In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.</div>
    <form onSubmit={(event) => { event.preventDefault(); continueWithRequester(); }}>
    {state === "loading" && <p aria-live="polite">Loading development requesters...</p>}
    {state === "error" && <div className="alert alert-danger">Unable to load development requesters from server. Please verify backend connection.<button className="btn btn-outline-danger d-block mt-2" type="button" onClick={load}>Retry Connection</button></div>}
    {state === "empty" && <div className="alert alert-warning">No active development requesters found in database. Please run database seed.</div>}
    {state === "ready" && <><label className="form-label" htmlFor="requester">Development Requester</label><select id="requester" className="form-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Select a requester</option>{requesters.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.department}</option>)}</select><small>Only active development requesters are shown.</small></>}
    <div className="mt-4 d-flex flex-wrap gap-2"><button className="btn btn-success" type="submit" disabled={!selectedId || state !== "ready"}>Continue</button><button className="btn btn-outline-secondary" type="button" onClick={() => setSelectedId("")}>Cancel</button></div>
    </form>
  </section></main>;
}

export default function App() {
  return <RequesterProvider><RequesterApp /></RequesterProvider>;
}
