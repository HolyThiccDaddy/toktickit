import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCategories, getTickets, type Category, type Requester, type TicketListItem,
  type TicketPriority, type TicketSortField,
} from "./api.js";

type SortOrder = "asc" | "desc";

export default function MyTickets({ requester, onCreate }: { requester: Requester; onCreate: () => void }) {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState<TicketSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const latestRequest = useRef(0);

  const loadTickets = useCallback(async () => {
    const requestNumber = ++latestRequest.current;
    setLoading(true); setError("");
    try {
      const result = await getTickets(requester.id, {
        search: search.trim() || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        requestedPriority: (priority || undefined) as TicketPriority | undefined,
        currentStatus: status === "NEW" ? "NEW" : undefined,
        sortBy, sortOrder, page, limit: 10,
      });
      if (requestNumber === latestRequest.current) {
        setTickets(result.tickets); setPagination(result.pagination);
      }
    } catch {
      if (requestNumber === latestRequest.current) setError("Unable to load your tickets. Please verify the backend connection and try again.");
    } finally {
      if (requestNumber === latestRequest.current) setLoading(false);
    }
  }, [requester.id, search, categoryId, priority, status, sortBy, sortOrder, page]);

  useEffect(() => { void getCategories().then(setCategories).catch(() => setCategories([])); }, []);
  useEffect(() => { void loadTickets(); }, [loadTickets]);

  function updateFilter(setter: (value: string) => void, value: string) { setter(value); setPage(1); }
  function clearFilters() { setSearch(""); setCategoryId(""); setPriority(""); setStatus(""); setPage(1); }
  function changeSort(field: TicketSortField) {
    setPage(1);
    if (sortBy === field) setSortOrder((value) => value === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("asc"); }
  }
  const hasFilters = Boolean(search.trim() || categoryId || priority || status);
  const sortLabel = (field: TicketSortField, label: string) => `Sort by ${label}${sortBy === field ? `, currently ${sortOrder === "asc" ? "ascending" : "descending"}` : ""}`;
  const sortIndicator = (field: TicketSortField) => sortBy === field ? (sortOrder === "asc" ? " ↑" : " ↓") : "";
  const pageNumbers = Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === pagination.totalPages || Math.abs(number - page) <= 1);

  return <section className="my-tickets" aria-labelledby="my-tickets-title">
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div><h1 id="my-tickets-title" className="h3 text-zen mb-1">My Tickets</h1><p className="text-muted mb-0">Track IT requests submitted by {requester.name}.</p></div>
      <button className="btn btn-zen" type="button" onClick={onCreate}>+ Create Ticket</button>
    </div>
    <div className="card shadow-sm p-3 mb-3"><div className="row g-3 align-items-end">
      <div className="col-lg-4"><label className="form-label" htmlFor="ticket-search">Search tickets</label><input id="ticket-search" className="form-control" placeholder="Summary or ticket number" value={search} onChange={(event) => updateFilter(setSearch, event.target.value)} /></div>
      <div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="ticket-category">Category</label><select id="ticket-category" className="form-select" value={categoryId} onChange={(event) => updateFilter(setCategoryId, event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="ticket-priority">Requested Priority</label><select id="ticket-priority" className="form-select" value={priority} onChange={(event) => updateFilter(setPriority, event.target.value)}><option value="">All priorities</option>{["LOW", "MEDIUM", "HIGH", "URGENT"].map((item) => <option key={item}>{item}</option>)}</select></div>
      <div className="col-sm-4 col-lg-2"><label className="form-label" htmlFor="ticket-status">Current Status</label><select id="ticket-status" className="form-select" value={status} onChange={(event) => updateFilter(setStatus, event.target.value)}><option value="">All statuses</option><option value="NEW">NEW</option></select></div>
      <div className="col-lg-2"><button className="btn btn-outline-zen w-100" type="button" onClick={clearFilters} disabled={!hasFilters}>Clear Filters</button></div>
    </div></div>

    {loading && <div role="status" aria-live="polite">
      <span className="visually-hidden">Loading your tickets...</span>
      <div className="table-responsive ticket-table ticket-skeleton-table" data-testid="ticket-table-skeleton" aria-hidden="true"><table className="table align-middle bg-white mb-0"><thead><tr><th>Ticket No.</th><th>Created Date</th><th>Summary</th><th>Category</th><th>Requested Priority</th><th>Current Status</th><th>Actions</th></tr></thead><tbody>{[0, 1, 2].map((row) => <tr key={row}>{[0, 1, 2, 3, 4, 5, 6].map((cell) => <td key={cell}><span className="ticket-skeleton-line" /></td>)}</tr>)}</tbody></table></div>
      <div className="ticket-card-list ticket-skeleton-cards" data-testid="ticket-card-skeleton" aria-hidden="true">{[0, 1, 2].map((row) => <article className="card shadow-sm p-3" key={row}><span className="ticket-skeleton-line w-50" /><span className="ticket-skeleton-line w-75" /><span className="ticket-skeleton-line w-25" /></article>)}</div>
    </div>}
    {!loading && error && <div className="alert alert-danger" role="alert">{error}<button className="btn btn-outline-danger d-block mt-2" type="button" onClick={() => void loadTickets()}>Retry</button></div>}
    {!loading && !error && tickets.length === 0 && <div className="card shadow-sm p-5 text-center">
      <h2 className="h5">{hasFilters ? "No matching tickets found for the selected search and filter criteria." : "No tickets found. You have not submitted any IT support tickets yet."}</h2>
      {hasFilters ? <button className="btn btn-outline-zen mx-auto mt-2" type="button" onClick={clearFilters}>Clear Filters</button> : <button className="btn btn-zen mx-auto mt-2" type="button" onClick={onCreate}>Create Your First Ticket</button>}
    </div>}
    {!loading && !error && tickets.length > 0 && <>
      <div className="table-responsive ticket-table"><table className="table table-hover align-middle bg-white mb-0"><thead><tr>
        <th><button type="button" onClick={() => changeSort("ticketNumber")} aria-label={sortLabel("ticketNumber", "Ticket Number")}>Ticket No.{sortIndicator("ticketNumber")}</button></th>
        <th><button type="button" onClick={() => changeSort("createdAt")} aria-label={sortLabel("createdAt", "Created Date")}>Created Date{sortIndicator("createdAt")}</button></th>
        <th><button type="button" onClick={() => changeSort("summary")} aria-label={sortLabel("summary", "Summary")}>Summary{sortIndicator("summary")}</button></th>
        <th>Category</th><th><button type="button" onClick={() => changeSort("requestedPriority")} aria-label={sortLabel("requestedPriority", "Requested Priority")}>Requested Priority{sortIndicator("requestedPriority")}</button></th><th>Current Status</th><th>Actions</th>
      </tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td>{ticket.ticketNumber}</td><td>{new Date(ticket.createdAt).toLocaleDateString()}</td><td>{ticket.summary}</td><td>{ticket.category.name}</td><td><span className={`priority-badge priority-${ticket.requestedPriority.toLowerCase()}`}>{ticket.requestedPriority}</span></td><td><span className="status-badge">{ticket.currentStatus}</span></td><td><button className="btn btn-sm btn-outline-zen" type="button" disabled title="Available in Ticket Detail feature">View</button></td></tr>)}</tbody></table></div>
      <div className="ticket-card-list" data-testid="ticket-card-list">{tickets.map((ticket) => <article className="card shadow-sm p-3" key={ticket.id}><div className="d-flex justify-content-between gap-2"><strong>{ticket.ticketNumber}</strong><span className="status-badge">{ticket.currentStatus}</span></div><h2 className="h6 my-2">{ticket.summary}</h2><div className="d-flex flex-wrap align-items-center gap-2 small text-muted"><span className="category-badge">{ticket.category.name}</span><span>{new Date(ticket.createdAt).toLocaleDateString()}</span></div><span className={`priority-badge priority-${ticket.requestedPriority.toLowerCase()} align-self-start mt-2`}>{ticket.requestedPriority}</span></article>)}</div>
      <nav className="d-flex flex-wrap align-items-center justify-content-center gap-2 mt-3" aria-label="Ticket pagination"><button className="btn btn-outline-zen" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>{pageNumbers.map((number, index) => <span className="d-flex align-items-center gap-2" key={number}>{index > 0 && number - pageNumbers[index - 1] > 1 && <span aria-hidden="true">…</span>}<button className={`btn ${number === page ? "btn-zen" : "btn-outline-zen"}`} type="button" aria-label={`Page ${number}`} aria-current={number === page ? "page" : undefined} onClick={() => setPage(number)}>{number}</button></span>)}<span className="visually-hidden">Page {pagination.page} of {pagination.totalPages}</span><button className="btn btn-outline-zen" type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></nav>
    </>}
  </section>;
}
