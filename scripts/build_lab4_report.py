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
    ("Answer Part 1 - Engineering contract and test design", [
        "Lab 4 uses four committed contracts: specification.md, api-spec.md, ui-spec.md, and tests.md. The contract regression test verifies their presence, required sections, and Action Taken/workflow/dashboard language.",
        link("specification.md", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/specification.md"),
        link("api-spec.md", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/api-spec.md"),
        link("ui-spec.md", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/ui-spec.md"),
        link("tests.md", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/tests.md"),
    ]),
    ("Answer Part 2 - Actions Taken data, migration, seed, and API", [
        "Issue 2 delivers the one-to-many Action Taken model, immutable revision history, foreign keys and indexes, idempotent seed data, retry-safe creation, validation, role authorization, assignment, terminal protection, and safe error envelopes.",
        "The guarded migration check used PostgreSQL database toktickit_test and reported no pending migrations. The compiled seed was run twice with the test-database guard enabled and produced the same categories, related systems, requesters, and ticket-counter output.",
        link("API tests", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/server/tests/lab-04/actions-taken.api.test.ts"),
    ]),
    ("Answer Part 3 - Actions Taken UI", [
        "Ticket Detail supports requester read-only history, staff/admin create and edit, validation, retry-preserved forms, idempotency keys, assignment and state controls, edit history, follow-up resolution, loading/empty/error states, accessible names, and responsive layouts.",
        link("ActionsTaken.test.tsx", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/client/tests/lab-04/ActionsTaken.test.tsx"),
        link("actions-taken-flow.spec.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/e2e/lab-04/actions-taken-flow.spec.ts"),
    ]),
    ("Answer Part 4 - Ticket workflow and resolution gate", [
        "The workflow covers the full status matrix, role restrictions, confirmation-required terminal transitions, stale-update conflicts, completed Action evidence, outstanding follow-up blocking, follow-up resolution audit/versioning, reopen behavior, and safe retry/error feedback.",
        link("ticket-workflow.api.test.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/server/tests/lab-04/ticket-workflow.api.test.ts"),
        link("TicketWorkflow.test.tsx", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/client/tests/lab-04/TicketWorkflow.test.tsx"),
        link("ticket-resolution.spec.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/e2e/lab-04/ticket-resolution.spec.ts"),
    ]),
    ("Answer Part 5 - Requester, IT Staff, and Administrator dashboards", [
        "Requester metrics are ownership-scoped. Staff and Administrator metrics use the authenticated role, exact queue predicates, UTC windows, and a real My Actions destination. Dashboard APIs and role-aware UI are covered by focused server, client, and browser tests.",
        link("requester-dashboard.api.test.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/server/tests/lab-04/requester-dashboard.api.test.ts"),
        link("staff-dashboard.api.test.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/server/tests/lab-04/staff-dashboard.api.test.ts"),
    ]),
    ("Answer Part 6 - Regression, accessibility, and responsive verification", [
        "All approved Lab 1-3 server and client suites and the existing Playwright flows remain in the final run. The release evidence spec captures dashboard, Actions Taken, workflow, loading, empty, error/retry, and forbidden states across desktop, tablet, and mobile widths. Accessible labels, keyboard operation, live feedback, focus-visible styling, and no page-level horizontal overflow are part of the checks.",
        link("release-evidence.visual.spec.ts", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/e2e/lab-04/release-evidence.visual.spec.ts"),
    ]),
    ("Answer Part 7 - Verification results", [
        "Server: 22 files and 136 tests passed; production build passed.",
        "Client: 20 files and 66 tests passed; production build passed.",
        "Playwright: 30 tests total, 28 passed and 2 responsive workflow variants intentionally skipped by the project guard.",
        "Prisma migrate deploy: passed with no pending migrations on the guarded _test database. Compiled seed: two consecutive guarded runs passed with 4 categories, 7 related systems, 5 development requesters, and an initialized ticket counter.",
        "git diff --check and credential-pattern scan: passed with no credential matches.",
    ]),
    ("Answer Part 8 - Screenshot and document evidence", [
        "The release screenshot set contains real requester, staff, administrator, Actions Taken, workflow, loading, empty, error/retry, and forbidden states. The full set is committed under artifacts/lab-04/screenshots/release with desktop, tablet, and mobile folders.",
        link("release screenshots", "https://github.com/HolyThiccDaddy/toktickit/tree/feature/lab4-issue-6-final-release/artifacts/lab-04/screenshots/release"),
        link("final Markdown report", "https://github.com/HolyThiccDaddy/toktickit/blob/feature/lab4-issue-6-final-release/docs/lab-04/LAB_04_FINAL_SUBMISSION_REPORT.md"),
    ]),
    ("Answer Part 9 - Final integration and delivery gate", [
        "The final release branch is based on merged lab4-staging commit 026ba36348b553449bc2e5b4fda799110ddad4e6 and targets main with Closes #56. Formal peer approval and teammate merge remain required before Issue #56 is marked Done. Final main verification must confirm the merge commit, PDF, document links, six Issue states, and Kanban board.",
        link("Issue #56", "https://github.com/HolyThiccDaddy/toktickit/issues/56"),
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
