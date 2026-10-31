import { Router, type Request, type RequestHandler } from "express";
import type { Prisma } from "@prisma/client";
import { apiError, requireAuth } from "./auth.js";
import { getPrisma } from "./prisma.js";
import { safeUser, userSelect } from "./tickets.js";

const openStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const;
const staffStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "REOPENED"] as const;
const staffRoles = new Set(["IT_STAFF", "ADMIN"] as const);
const weekMs = 7 * 24 * 60 * 60 * 1000;
const actionWindowMs = 30 * 24 * 60 * 60 * 1000;

type DashboardTicket = {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  itPriority: string;
  owner: Parameters<typeof safeUser>[0] | null;
  updatedAt: Date;
};

function item(ticket: DashboardTicket, href: string) {
  return {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    summary: ticket.summary,
    status: ticket.currentStatus,
    itPriority: ticket.itPriority,
    owner: ticket.owner ? safeUser(ticket.owner) : null,
    updatedAt: ticket.updatedAt.toISOString(),
    href,
  };
}

function metric(key: string, label: string, value: number, href: string) {
  return { key, label, value, href };
}

function parseWindow(req: Request, defaultMs: number) {
  const fromValue = typeof req.query.from === "string" ? req.query.from : undefined;
  const toValue = typeof req.query.to === "string" ? req.query.to : undefined;
  const to = toValue ? new Date(toValue) : new Date();
  const from = fromValue ? new Date(fromValue) : new Date(to.getTime() - defaultMs);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) return null;
  return { from, to };
}

const requesterOnly: RequestHandler = (req, res, next) => {
  if (req.auth?.user.role !== "REQUESTER") return apiError(res, 403, "FORBIDDEN", "Only Requesters may access this dashboard");
  return next();
};

const staffOnly: RequestHandler = (req, res, next) => {
  if (!req.auth || !staffRoles.has(req.auth.user.role as "IT_STAFF" | "ADMIN")) return apiError(res, 403, "FORBIDDEN", "Only IT Staff or Administrators may access this dashboard");
  return next();
};

const adminOnly: RequestHandler = (req, res, next) => {
  if (req.auth?.user.role !== "ADMIN") return apiError(res, 403, "FORBIDDEN", "Only Administrators may access this dashboard");
  return next();
};

const ticketSelect = {
  id: true,
  ticketNumber: true,
  summary: true,
  currentStatus: true,
  itPriority: true,
  updatedAt: true,
  owner: { select: userSelect },
} as const;

async function staffDashboardData(userId: number, role: "IT_STAFF" | "ADMIN", now = new Date()) {
  const prisma = getPrisma();
  const weekFrom = new Date(now.getTime() - weekMs);
  const actionFrom = new Date(now.getTime() - actionWindowMs);
  const accessible: Prisma.TicketWhereInput = { currentStatus: { not: "CANCELLED" } };
  const [unassigned, owned, inProgressWaiting, recentlyUpdated, myActions, items] = await prisma.$transaction([
    prisma.ticket.count({ where: { ...accessible, ownerId: null, currentStatus: { in: [...staffStatuses] } } }),
    prisma.ticket.count({ where: { ...accessible, ownerId: userId, currentStatus: { in: [...staffStatuses] } } }),
    prisma.ticket.count({ where: { ...accessible, currentStatus: { in: ["IN_PROGRESS", "WAITING_FOR_REQUESTER"] } } }),
    prisma.ticket.count({ where: { ...accessible, updatedAt: { gte: weekFrom, lt: now } } }),
    prisma.actionTaken.count({ where: { performedById: userId, actionDateTime: { gte: actionFrom, lt: now } } }),
    prisma.ticket.findMany({ where: { ...accessible, updatedAt: { gte: weekFrom, lt: now } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 8, select: ticketSelect }),
  ]);
  const accountCounts = role === "ADMIN" ? await prisma.user.groupBy({ by: ["role", "active"], _count: { _all: true } }) : [];

  const metrics = [
    metric("unassignedTickets", "Unassigned Tickets", unassigned, "/staff/queue?assigneeId=unassigned&statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,RESOLVED,REOPENED"),
    metric("myOwnedTickets", "My Owned Tickets", owned, "/staff/queue?assigneeId=me&statuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,RESOLVED,REOPENED"),
    metric("inProgressWaiting", "In-Progress / Waiting", inProgressWaiting, "/staff/queue?statuses=IN_PROGRESS,WAITING_FOR_REQUESTER"),
    metric("recentlyUpdated", "Recently Updated (7 days)", recentlyUpdated, `/staff/queue?updatedFrom=${encodeURIComponent(weekFrom.toISOString())}&updatedTo=${encodeURIComponent(now.toISOString())}`),
    metric("myActionsTaken", "My Actions Taken (30 days)", myActions, `/staff/actions?performedBy=me&from=${encodeURIComponent(actionFrom.toISOString())}&to=${encodeURIComponent(now.toISOString())}`),
  ];
  const accounts = role === "ADMIN"
    ? accountCounts.reduce<Record<string, number>>((result, row) => { result[`${row.role.toLowerCase()}${row.active ? "Active" : "Inactive"}`] = row._count._all; return result; }, {})
    : undefined;
  return {
    metrics,
    items: items.map((ticket) => item(ticket, `/staff/tickets/${ticket.id}`)),
    meta: { timezone: "UTC", from: weekFrom.toISOString(), to: now.toISOString() },
    ...(accounts ? { accounts } : {}),
  };
}

export function createDashboardRouter() {
  const router = Router();
  router.get("/requester", requireAuth(), requesterOnly, async (req, res) => {
    const window = parseWindow(req, weekMs);
    if (!window) return apiError(res, 400, "VALIDATION_ERROR", "Dashboard window must contain valid UTC timestamps", { from: "from must be before to" });
    const requesterId = req.auth!.user.id;
    try {
      const prisma = getPrisma();
      const base = { requesterId } satisfies Prisma.TicketWhereInput;
      const [openTickets, waiting, recentlyUpdated, recentlyResolved, tickets] = await prisma.$transaction([
        prisma.ticket.count({ where: { ...base, currentStatus: { in: [...openStatuses] } } }),
        prisma.ticket.count({ where: { ...base, currentStatus: "WAITING_FOR_REQUESTER" } }),
        prisma.ticket.count({ where: { ...base, updatedAt: { gte: window.from, lt: window.to } } }),
        prisma.ticket.count({ where: { ...base, currentStatus: { in: ["RESOLVED", "CLOSED"] }, updatedAt: { gte: window.from, lt: window.to } } }),
        prisma.ticket.findMany({ where: { ...base, updatedAt: { gte: window.from, lt: window.to } }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: 8, select: ticketSelect }),
      ]);
      return res.status(200).json({ data: {
        metrics: [
          metric("openTickets", "Open Tickets", openTickets, "/my-tickets?currentStatuses=NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED"),
          metric("waitingForRequester", "Waiting for Requester", waiting, "/my-tickets?currentStatus=WAITING_FOR_REQUESTER"),
          metric("recentlyUpdated", "Recently Updated (7 days)", recentlyUpdated, `/my-tickets?updatedFrom=${encodeURIComponent(window.from.toISOString())}&updatedTo=${encodeURIComponent(window.to.toISOString())}`),
          metric("recentlyResolved", "Recently Resolved (7 days)", recentlyResolved, `/my-tickets?currentStatuses=RESOLVED,CLOSED&updatedFrom=${encodeURIComponent(window.from.toISOString())}&updatedTo=${encodeURIComponent(window.to.toISOString())}`),
        ],
        items: tickets.map((ticket) => item(ticket, `/tickets/${ticket.id}`)),
        meta: { timezone: "UTC", from: window.from.toISOString(), to: window.to.toISOString() },
      } });
    } catch {
      return apiError(res, 500, "INTERNAL_ERROR", "Unable to load requester dashboard");
    }
  });

  router.get("/staff", requireAuth(), staffOnly, async (req, res) => {
    const window = parseWindow(req, weekMs);
    if (!window) return apiError(res, 400, "VALIDATION_ERROR", "Dashboard window must contain valid UTC timestamps", { from: "from must be before to" });
    try { return res.status(200).json({ data: await staffDashboardData(req.auth!.user.id, req.auth!.user.role as "IT_STAFF" | "ADMIN", window.to) }); }
    catch { return apiError(res, 500, "INTERNAL_ERROR", "Unable to load staff dashboard"); }
  });

  router.get("/admin", requireAuth(), adminOnly, async (req, res) => {
    const window = parseWindow(req, weekMs);
    if (!window) return apiError(res, 400, "VALIDATION_ERROR", "Dashboard window must contain valid UTC timestamps", { from: "from must be before to" });
    try { return res.status(200).json({ data: await staffDashboardData(req.auth!.user.id, "ADMIN", window.to) }); }
    catch { return apiError(res, 500, "INTERNAL_ERROR", "Unable to load administrator dashboard"); }
  });

  return router;
}
