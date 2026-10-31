from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "LAB_04_FINAL_SUBMISSION_REPORT.pdf"
SHOT_ROOT = ROOT / "artifacts" / "lab-04" / "screenshots" / "release"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleGreen", parent=styles["Title"], alignment=TA_CENTER, textColor=colors.HexColor("#006B3C"), fontSize=19, leading=24, spaceAfter=10))
styles.add(ParagraphStyle(name="Part", parent=styles["Heading1"], textColor=colors.HexColor("#006B3C"), fontSize=14, leading=18, spaceBefore=6, spaceAfter=8))
styles.add(ParagraphStyle(name="Caption", parent=styles["BodyText"], alignment=TA_CENTER, fontSize=8, leading=10, textColor=colors.HexColor("#52665A"), spaceAfter=8))

def link(label, url):
    return Paragraph(f'<link href="{url}" color="#006B3C"><u>{label}</u></link>', styles["BodyText"])

parts = [
    ("Answer Part 1 - Git Use with Engineering Workflow", [
        "The ordered Lab 4 workflow is recorded in reviewer.md: Issues #51-#55 were implemented on feature branches, reviewed, and merged into lab4-staging; the final release branch then targets main through PR #62. The final Issue #56 remains pending formal approval and teammate merge, so no post-merge main result is claimed.",
        link("reviewer.md (peer identity, PR links, comments, responses, approvals)", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/reviewer.md"),
        link("PR #62 and commit history", "https://github.com/HolyThiccDaddy/toktickit/pull/62"),
        link("README", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/README.md"),
        link(".gitignore", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/.gitignore"),
        "The committed repository tree and the evidence folders provide the required directory-structure record; the final Kanban and main-branch checks are explicitly a post-merge gate.",
    ]),
    ("Answer Part 2 - Spec DD", [
        "The rendered specification contract defines numbered requirements, business rules, Actions Taken behavior, Ticket transition rules, dashboard calculations, acceptance criteria, migration decisions, and the Product Definition of Done. It was committed before the implementation PRs were completed.",
        link("specification.md", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/specification.md"),
        link("api-spec.md", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/api-spec.md"),
        link("ui-spec.md", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/ui-spec.md"),
        "Rendered excerpts in this report cover the contract headings and link directly to the committed source documents so a grader can inspect the full numbered requirements.",
    ]),
    ("Answer Part 3 - Test DD and Traceability", [
        "The Test DD maps acceptance criteria to actual server unit/API/integration tests, client UI tests, authorization/workflow tests, regression suites, and Playwright journeys. The final run reports server 22 files/136 tests, client 20 files/66 tests, and Playwright 30 total with 28 passed and 2 documented responsive variants skipped by the project guard.",
        link("tests.md (planned tests, AC mapping, paths, and final status)", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/tests.md"),
        link("server Lab 4 tests", "https://github.com/HolyThiccDaddy/toktickit/tree/feature/lab4-issue-6-final-release/server/tests/lab-04"),
        link("client Lab 4 tests", "https://github.com/HolyThiccDaddy/toktickit/tree/feature/lab4-issue-6-final-release/client/tests/lab-04"),
        link("Playwright Lab 4 tests", "https://github.com/HolyThiccDaddy/toktickit/tree/feature/lab4-issue-6-final-release/e2e/lab-04"),
    ]),
    ("Answer Part 4 - AI Use with Reflection", [
        "The AI-use record names OpenAI Codex (GPT-5), preserves ten selected specification/coding/review prompts, and includes a reflection that treats the handout, repository contracts, tests, and peer review as authoritative. It records rejection of suggestions that weaken authorization, overwrite work, expose credentials, or claim unexecuted tests.",
        link("ai-use.md (LLM identity, selected prompts, and My Reflection)", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/ai-use.md"),
    ]),
    ("Answer Part 5 - Working IT Staff Dashboard UI", [
        "The IT Staff and Administrator dashboards expose approved operational metrics, current-user Actions Taken, recent/urgent Tickets, exact query-backed counts, drill-down destinations, loading/empty/forbidden/error states, and responsive behavior. The smoke test now waits for loading to finish and for real metric content before measuring the performance budget.",
        link("staff-dashboard.api.test.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/server/tests/lab-04/staff-dashboard.api.test.ts"),
        link("dashboard UI tests", "https://github.com/HolyThiccDaddy/toktickit/tree/feature/lab4-issue-6-final-release/client/tests/lab-04"),
        link("dashboard-performance-smoke.spec.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/e2e/lab-04/dashboard-performance-smoke.spec.ts"),
    ]),
    ("Answer Part 6 - Working Actions Taken UI", [
        "Ticket Detail supports list/create/assign/edit/complete/cancel flows, validation, inactive-assignee rejection, role restrictions, safe failure and retry states, and multiple Actions Taken on one Ticket. Requesters receive a read-only history while staff/admin users receive authorized controls.",
        link("ActionsTaken.test.tsx", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/client/tests/lab-04/ActionsTaken.test.tsx"),
        link("actions-taken-flow.spec.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/e2e/lab-04/actions-taken-flow.spec.ts"),
        link("actions-taken API tests", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/server/tests/lab-04/actions-taken.api.test.ts"),
    ]),
    ("Answer Part 7 - Working Ticket Workflow", [
        "The workflow covers all permitted status transitions, stable ordering, append-only Action evidence, role-appropriate visibility, confirmation-required terminal transitions, stale-update conflicts, completed Action evidence, outstanding follow-up blocking, follow-up resolution audit/versioning, and reopen behavior.",
        link("ticket-workflow.api.test.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/server/tests/lab-04/ticket-workflow.api.test.ts"),
        link("TicketWorkflow.test.tsx", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/client/tests/lab-04/TicketWorkflow.test.tsx"),
        link("ticket-resolution.spec.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/e2e/lab-04/ticket-resolution.spec.ts"),
    ]),
    ("Answer Part 8 - Working Requester Dashboard and Final Regression UI", [
        "Requester metrics are ownership-scoped and drill down to recent and attention-required Tickets without leaking another requester's data. The regression matrix retains authentication, My Tickets, Ticket Detail, attachments, public comments, IT Staff functions, internal notes, and Administrator user management across the approved Lab 1-3 suites.",
        link("requester-dashboard.api.test.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/server/tests/lab-04/requester-dashboard.api.test.ts"),
        link("release-evidence.visual.spec.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/e2e/lab-04/release-evidence.visual.spec.ts"),
        link("verification artifacts", "https://github.com/HolyThiccDaddy/toktickit/tree/feature/lab4-issue-6-final-release/artifacts/lab-04/verification"),
    ]),
    ("Answer Part 9 - Zen Green UI, Responsive, Accessibility, and Final Polish", [
        "The committed ui-spec.md defines the Zen Green tokens and shared components. Release screenshots cover desktop, tablet, and mobile requester/staff/admin dashboards, Actions Taken, loading, empty, error/retry, forbidden, and resolution-gate states. The checklist verifies readable labels, keyboard/focus behavior, live feedback, clipping/overlap, and page-level horizontal overflow.",
        link("ui-spec.md", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/ui-spec.md"),
        link("release screenshots (desktop/tablet/mobile)", "https://github.com/HolyThiccDaddy/toktickit/tree/feature/lab4-issue-6-final-release/artifacts/lab-04/screenshots/release"),
        link("final Markdown report", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/LAB_04_FINAL_SUBMISSION_REPORT.md"),
        "The final integration gate remains explicit: formal peer approval, teammate merge into main, and post-merge verification of the PDF, documents, six Issues, and Kanban board are still required.",
    ]),
]

def screenshot(path, caption):
    if not path.exists():
        return []
    image = Image(str(path))
    max_w, max_h = 170 * mm, 92 * mm
    scale = min(max_w / image.imageWidth, max_h / image.imageHeight)
    image.drawWidth = image.imageWidth * scale
    image.drawHeight = image.imageHeight * scale
    return [image, Paragraph(caption, styles["Caption"])]

story = [Paragraph("TokTickIT Lab 4 Final Submission Report", styles["TitleGreen"]), Paragraph("Nine-part release evidence for Issue #56", styles["BodyText"]), Spacer(1, 5 * mm)]
for title, body in parts:
    story.append(Paragraph(title, styles["Part"]))
    for item in body:
        story.append(item if isinstance(item, Paragraph) else Paragraph(item, styles["BodyText"]))
        story.append(Spacer(1, 2 * mm))
    story.append(PageBreak())
story.pop()
story.append(Paragraph("Selected real screenshots", styles["Part"]))
selected = [
    ("desktop/01_requester_dashboard.png", "Desktop requester dashboard"),
    ("desktop/02_staff_dashboard.png", "Desktop IT Staff dashboard"),
    ("desktop/03_staff_actions.png", "Desktop My Actions drill-down"),
    ("desktop/04_admin_dashboard.png", "Desktop Administrator dashboard"),
    ("desktop/05_requester_loading.png", "Desktop loading state"),
    ("desktop/06_requester_empty.png", "Desktop empty state"),
    ("desktop/07_requester_error_retry.png", "Desktop error and retry state"),
    ("desktop/08_staff_forbidden.png", "Desktop forbidden state"),
    ("desktop/09_staff_ticket_resolution_gate.png", "Desktop staff ticket resolution gate"),
    ("tablet/01_requester_dashboard.png", "Tablet requester dashboard"),
    ("tablet/02_staff_dashboard.png", "Tablet IT Staff dashboard"),
    ("tablet/03_staff_actions.png", "Tablet My Actions drill-down"),
    ("mobile/01_requester_dashboard.png", "Mobile requester dashboard"),
    ("mobile/02_staff_dashboard.png", "Mobile IT Staff dashboard"),
    ("mobile/03_staff_actions.png", "Mobile My Actions drill-down"),
]
for name, caption in selected:
    story.extend(screenshot(SHOT_ROOT / name, caption))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#52665A"))
    canvas.drawString(18 * mm, 10 * mm, "TokTickIT Lab 4 | Issue #56 | Final evidence")
    canvas.drawRightString(192 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=20 * mm, leftMargin=20 * mm, topMargin=16 * mm, bottomMargin=18 * mm, title="TokTickIT Lab 4 Final Submission Report")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
