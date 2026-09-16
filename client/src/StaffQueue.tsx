import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError, getCategories, getStaffTickets, type Category, type StaffSortField,
  type StaffTicketListItem, type StaffTicketListQuery, type TicketPriority, type TicketStatus,
  type UserSummary,
} from "./api.js";

const statuses: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];
const priorities: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function priorityClass(value: TicketPriority) {
  return `priority-badge priority-${value.toLowerCase()}`;
}

export default function StaffQueue({ user, onView }: { user: UserSummary; onView: (ticketId: number) => void }) {
  const [tickets, setTickets] = useState<StaffTicketListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<TicketStatus | "">("");
  const [itPriority, setItPriority] = useState<TicketPriority | "">("");
  const [assigneeId, setAssigneeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sortBy, setSortBy] = useState<StaffSortField>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invalidQuery, setInvalidQuery] = useState(false);
  const latestRequest = useRef(0);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true); setCategoryError("");
    try { setCategories(await getCategories()); }
    catch (reason) { setCategoryError(reason instanceof Error ? reason.message : "Unable to load categories"); }
    finally { setCategoriesLoading(false); }
  }, []);

  const loadTickets = useCallback(async () => {
    const requestNumber = ++latestRequest.current;
    setLoading(true); setError(""); setInvalidQuery(false);
    const parsedAssignee = assigneeId.trim() ? Number(assigneeId) : undefined;
    const parsedCategory = categoryId ? Number(categoryId) : undefined;
    const query: StaffTicketListQuery = {
      q: q.trim() || undefined,
      status: status || undefined,
      itPriority: itPriority || undefined,
      assigneeId: parsedAssignee,
      categoryId: parsedCategory,
      sortBy, sortDir, page, pageSize,
    };
    try {
      const result = await getStaffTickets(query);
      if (requestNumber === latestRequest.current) {
        setTickets(result.items);
        setTotal(result.meta.total);
        setTotalPages(result.meta.totalPages);
      }
    } catch (reason) {
      if (requestNumber === latestRequest.current) {
        setInvalidQuery(reason instanceof ApiError && reason.code === "VALIDATION_ERROR");
        setError(reason instanceof Error ? reason.message : "Unable to load the staff ticket queue");
      }
    } finally {
      if (requestNumber === latestRequest.current) setLoading(false);
    }
  }, [assigneeId, categoryId, itPriority, page, pageSize, q, sortBy, sortDir, status]);

  useEffect(() => { void loadCategories(); }, [loadCategories]);
  useEffect(() => { void loadTickets(); }, [loadTickets]);

  function update(setter: (value: string) => void, value: string) { setter(value); setPage(1); }
  function clearFilters() { setQ(""); setStatus(""); setItPriority(""); setAssigneeId(""); setCategoryId(""); setPage(1); }
  function changeSort(field: StaffSortField) {
    setPage(1);
    if (sortBy === field) setSortDir((value) => value === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("asc"); }
  }
  const hasFilters = Boolean(q.trim() || status || itPriority || assigneeId || categoryId);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === totalPages || Math.abs(number - page) <= 1);
  const sortLabel = (field: StaffSortField, label: string) => `Sort by ${label}${sortBy === field ? `, currently ${sortDir === "asc" ? "ascending" : "descending"}` : ""}`;
  const indicator = (field: StaffSortField) => sortBy === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return <section className="staff-queue" aria-labelledby="staff-queue-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div><h1 id="staff-queue-title" className="h3 text-zen mb-1">Ticket Queue</h1><p className="text-muted mb-0">Shared queue for {user.role === "ADMIN" ? "IT Staff and Administrators" : "IT Staff"}.</p></div>
      <span className="status-badge" aria-label="Current role">{user.role}</span>
    </div>
    <div className="card shadow-sm p-3 mb-3"><div className="row g-3 align-items-end">
      <div className="col-lg-3"><label className="form-label" htmlFor="staff-queue-search">Search queue</label><input id="staff-queue-search" className="form-control" placeholder="Ticket, summary, requester, or category" value={q} onChange={(event) => update(setQ, event.target.value)} /></div>
      <div className="col-sm-6 col-lg-2"><label className="form-label" htmlFor="staff-queue-status">Status</label><select id="staff-queue-status" className="form-select" value={status} onChange={(event) => update((value) => setStatus(value as TicketStatus | ""), event.target.value)}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
      <div className="col-sm-6 col-lg-2"><label className="form-label" htmlFor="staff-queue-priority">IT Priority</label><select id="staff-queue-priority" className="form-select" value={itPriority} onChange={(event) => update((value) => setItPriority(value as TicketPriority | ""), event.target.value)}><option value="">All priorities</option>{priorities.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
      <div className="col-sm-6 col-lg-2"><label className="form-label" htmlFor="staff-queue-assignee">Assignee ID</label><input id="staff-queue-assignee" className="form-control" inputMode="numeric" placeholder="Any assignee" value={assigneeId} onChange={(event) => update(setAssigneeId, event.target.value)} /></div>
      <div className="col-sm-6 col-lg-2"><label className="form-label" htmlFor="staff-queue-category">Category</label><select id="staff-queue-category" className="form-select" value={categoryId} onChange={(event) => update(setCategoryId, event.target.value)} disabled={categoriesLoading || Boolean(categoryError)}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
      <div className="col-sm-6 col-lg-2"><label className="form-label" htmlFor="staff-queue-page-size">Results per page</label><select id="staff-queue-page-size" className="form-select" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></div>
      <div className="col-sm-6 col-lg-1"><button className="btn btn-outline-zen w-100" type="button" onClick={clearFilters} disabled={!hasFilters}>Clear</button></div>
    </div></div>
    {categoryError && <div className="alert alert-warning" role="alert">{categoryError}<button className="btn btn-sm btn-outline-warning d-block mt-2" type="button" onClick={() => void loadCategories()}>Retry categories</button></div>}
    {loading && <div role="status" aria-live="polite"><span className="visually-hidden">Loading ticket queue...</span><div className="table-responsive ticket-table ticket-skeleton-table" aria-hidden="true"><table className="table bg-white mb-0"><tbody>{[0, 1, 2].map((row) => <tr key={row}>{[0, 1, 2, 3, 4, 5, 6].map((cell) => <td key={cell}><span className="ticket-skeleton-line" /></td>)}</tr>)}</tbody></table></div><div className="ticket-card-list ticket-skeleton-cards" aria-hidden="true">{[0, 1, 2].map((row) => <article className="card shadow-sm p-3" key={row}><span className="ticket-skeleton-line w-50" /><span className="ticket-skeleton-line w-75" /><span className="ticket-skeleton-line w-25" /></article>)}</div></div>}
    {!loading && error && <div className="alert alert-danger" role="alert"><strong>{invalidQuery ? "Invalid queue filters" : "Unable to load ticket queue"}</strong><p className="mb-2">{error}</p><button className="btn btn-outline-danger" type="button" onClick={() => void loadTickets()}>Retry</button></div>}
    {!loading && !error && tickets.length === 0 && <div className="card shadow-sm p-5 text-center"><h2 className="h5">{hasFilters ? "No matching tickets found." : "The ticket queue is empty."}</h2>{hasFilters && <button className="btn btn-outline-zen mx-auto mt-2" type="button" onClick={clearFilters}>Clear filters</button>}</div>}
    {!loading && !error && tickets.length > 0 && <>
      <div className="table-responsive ticket-table"><table className="table table-hover align-middle bg-white mb-0"><thead><tr>
        <th><button type="button" onClick={() => changeSort("ticketNumber")} aria-label={sortLabel("ticketNumber", "Ticket Number")}>Ticket No.{indicator("ticketNumber")}</button></th>
        <th><button type="button" onClick={() => changeSort("updatedAt")} aria-label={sortLabel("updatedAt", "Updated Date")}>Updated{indicator("updatedAt")}</button></th>
        <th><button type="button" onClick={() => changeSort("status")} aria-label={sortLabel("status", "Status")}>Status{indicator("status")}</button></th>
        <th>Summary</th><th>Requester</th><th><button type="button" onClick={() => changeSort("itPriority")} aria-label={sortLabel("itPriority", "IT Priority")}>IT Priority{indicator("itPriority")}</button></th><th>Assignee</th><th>Actions</th>
      </tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td><strong>{ticket.ticketNumber}</strong></td><td>{formatDate(ticket.updatedAt)}</td><td><span className="status-badge">{ticket.currentStatus}</span></td><td>{ticket.summary}</td><td>{ticket.requester.displayName}</td><td><span className={priorityClass(ticket.itPriority)}>{ticket.itPriority}</span></td><td>{ticket.owner?.displayName ?? "Unassigned"}</td><td><button className="btn btn-sm btn-outline-zen" type="button" onClick={() => onView(ticket.id)}>Open</button></td></tr>)}</tbody></table></div>
      <div className="ticket-card-list" data-testid="staff-ticket-card-list">{tickets.map((ticket) => <article className="card shadow-sm p-3" key={ticket.id}><div className="d-flex justify-content-between gap-2"><strong>{ticket.ticketNumber}</strong><span className="status-badge">{ticket.currentStatus}</span></div><h2 className="h6 my-2">{ticket.summary}</h2><div className="small text-muted">Requester: {ticket.requester.displayName}</div><div className="d-flex flex-wrap gap-2 mt-2"><span className={priorityClass(ticket.itPriority)}>{ticket.itPriority}</span><span>{ticket.owner?.displayName ?? "Unassigned"}</span></div><div className="small text-muted mt-2">Updated {formatDate(ticket.updatedAt)}</div><button className="btn btn-sm btn-outline-zen mt-3" type="button" onClick={() => onView(ticket.id)}>Open ticket</button></article>)}</div>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3"><p className="text-muted mb-0" aria-live="polite">{total} {total === 1 ? "result" : "results"} · Page {page} of {totalPages || 1}</p><nav className="d-flex flex-wrap align-items-center justify-content-center gap-2" aria-label="Staff queue pagination"><button className="btn btn-outline-zen" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>{pageNumbers.map((number, index) => <span className="d-flex align-items-center gap-2" key={number}>{index > 0 && number - pageNumbers[index - 1] > 1 && <span aria-hidden="true">…</span>}<button className={`btn ${number === page ? "btn-zen" : "btn-outline-zen"}`} type="button" aria-label={`Page ${number}`} aria-current={number === page ? "page" : undefined} onClick={() => setPage(number)}>{number}</button></span>)}<button className="btn btn-outline-zen" type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></nav></div>
    </>}
  </section>;
}
