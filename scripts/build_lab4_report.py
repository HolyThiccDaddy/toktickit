from __future__ import annotations

import html
import json
import os
import re
import shutil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, Image, KeepTogether, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get("LAB4_REPORT_OUTPUT", str(ROOT / "output/pdf/LAB_04_FINAL_SUBMISSION_REPORT.pdf")))
MD = ROOT / "docs/lab-04/LAB_04_FINAL_SUBMISSION_REPORT.md"
TMP = ROOT / "tmp/pdfs"
SHOTS = ROOT / "artifacts/lab-04/screenshots"
LAB3_SHOTS = ROOT / "artifacts/lab-03/screenshots"
REPORT_SHOTS = SHOTS / "report"
VERIFY = ROOT / "artifacts/lab-04/verification"
REPORT_VERIFY = VERIFY / "report"
SNAPSHOT = json.loads((VERIFY / "report-source-snapshot.json").read_text(encoding="utf-8"))
RECOVERY = json.loads((REPORT_VERIFY / "recovery.json").read_text(encoding="utf-8"))
BROWSER_FLOW = json.loads((REPORT_VERIFY / "browser-flow.json").read_text(encoding="utf-8"))
DASHBOARD_DB = json.loads((REPORT_VERIFY / "dashboard-db-comparison.json").read_text(encoding="utf-8"))
INACTIVE = json.loads((REPORT_VERIFY / "inactive-assignee.json").read_text(encoding="utf-8"))
POST_MERGE = json.loads((VERIFY / "ui-rework/post-merge-validation.json").read_text(encoding="utf-8"))
POST_SHOTS = SHOTS / "post-merge-ui"
RESPONSIVE_FIX = SNAPSHOT["responsiveFix"]
RESPONSIVE_CLIENT = json.loads((VERIFY / "ui-rework/responsive-fix-client-results.json").read_text(encoding="utf-8"))
RESPONSIVE_E2E = json.loads((VERIFY / "ui-rework/responsive-fix-e2e-results.json").read_text(encoding="utf-8"))
FINAL_MAIN_SHA = SNAPSHOT["main"]["sha"]

for name in ("post-merge-server-results.json", "post-merge-client-results.json", "post-merge-e2e-results.json"):
    if not (VERIFY / "ui-rework" / name).exists():
        raise FileNotFoundError(f"Required verification evidence is missing: {name}")
SERVER = json.loads((VERIFY / "ui-rework/final-server-results.json").read_text(encoding="utf-8"))
SERVER_RUN = json.loads((VERIFY / "ui-rework/final-server-run.json").read_text(encoding="utf-8"))
CLIENT = RESPONSIVE_CLIENT
E2E = RESPONSIVE_E2E
PR_MERGED = [x for x in SNAPSHOT["prs"] if x.get("merged")]
UI_PR = SNAPSHOT["ui"]
CURRENT_UI_SHA = UI_PR["head"]
IMPL_SHA = UI_PR["implementation"]
MERGE_SHA = UI_PR["merge"]
if RECOVERY.get("status") != "PASS" or BROWSER_FLOW.get("status") != "PASS" or DASHBOARD_DB.get("status") != "PASS":
    raise ValueError("Report-time verification evidence is not green; refusing to describe it as passed.")

INK = colors.HexColor("#1F293D")
BLACK = colors.HexColor("#111111")
BLUE = colors.HexColor("#0563C1")
PALE = colors.HexColor("#EEF2F7")
PALE2 = colors.HexColor("#E4EBF3")
GRAY = colors.HexColor("#5B6472")
GRID = colors.HexColor("#181818")
GREEN = colors.HexColor("#006B3C")
PAGE_W, PAGE_H = A4
LEFT = RIGHT = 27
TOP, BOTTOM = 23 * mm, 17 * mm
CONTENT_W = PAGE_W - LEFT - RIGHT
FULL_IMAGE_MAX_H = PAGE_H - TOP - BOTTOM - 54

FONT_REG = "LabArial"
FONT_BOLD = "LabArial-Bold"
pdfmetrics.registerFont(TTFont(FONT_REG, "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont(FONT_BOLD, "C:/Windows/Fonts/arialbd.ttf"))

base = getSampleStyleSheet()
styles = {
    "title": ParagraphStyle("LabTitle", fontName=FONT_REG, fontSize=20, leading=24, alignment=TA_CENTER, textColor=INK, spaceAfter=12),
    "body": ParagraphStyle("LabBody", fontName=FONT_REG, fontSize=9.5, leading=12.5, textColor=BLACK, spaceAfter=5),
    "small": ParagraphStyle("LabSmall", fontName=FONT_REG, fontSize=8.1, leading=10, textColor=BLACK, spaceAfter=2),
    "tiny": ParagraphStyle("LabTiny", fontName=FONT_REG, fontSize=7.2, leading=8.7, textColor=BLACK, spaceAfter=1),
    "part": ParagraphStyle("LabPart", fontName=FONT_BOLD, fontSize=15.5, leading=19, textColor=BLACK, spaceBefore=2, spaceAfter=10),
    "h2": ParagraphStyle("LabH2", fontName=FONT_BOLD, fontSize=11.7, leading=14, textColor=BLACK, spaceBefore=6, spaceAfter=5),
    "h3": ParagraphStyle("LabH3", fontName=FONT_BOLD, fontSize=10, leading=12, textColor=BLACK, spaceBefore=4, spaceAfter=3),
    "caption": ParagraphStyle("LabCaption", fontName=FONT_REG, fontSize=7.5, leading=9.2, textColor=GRAY, alignment=TA_CENTER, spaceBefore=3, spaceAfter=5),
    "table": ParagraphStyle("LabTable", fontName=FONT_REG, fontSize=8.05, leading=9.8, textColor=BLACK, spaceAfter=0),
    "tablebold": ParagraphStyle("LabTableBold", fontName=FONT_BOLD, fontSize=8.05, leading=9.8, textColor=BLACK, spaceAfter=0),
    "tree": ParagraphStyle("LabTree", fontName="Courier", fontSize=7.9, leading=10, textColor=BLACK, backColor=PALE, borderColor=GRID, borderWidth=.6, borderPadding=7, spaceBefore=3, spaceAfter=7),
    "quote": ParagraphStyle("LabQuote", fontName=FONT_REG, fontSize=9.4, leading=13, leftIndent=12, rightIndent=10, borderColor=colors.HexColor("#9AA9BA"), borderWidth=.8, borderPadding=8, backColor=PALE, spaceBefore=4, spaceAfter=7),
}


def esc(value: object) -> str:
    return html.escape(str(value), quote=False)


def p(text: object, style: str = "body") -> Paragraph:
    return Paragraph(str(text), styles[style])


def link(label: str, url: str) -> Paragraph:
    return p(f'<link href="{html.escape(url, quote=True)}" color="#0563C1"><u>{esc(label)}</u></link>', "body")


def tbl(rows, widths, header=True, font="table", padd=4.2, repeat=1):
    converted = []
    for ri, row in enumerate(rows):
        converted.append([x if isinstance(x, (Paragraph, Table)) else p(esc(x), "tablebold" if header and ri == 0 else font) for x in row])
    t = Table(converted, colWidths=widths, repeatRows=repeat if header else 0, hAlign="LEFT", splitByRow=1)
    cmds = [
        ("GRID", (0, 0), (-1, -1), .65, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), padd),
        ("RIGHTPADDING", (0, 0), (-1, -1), padd),
        ("TOPPADDING", (0, 0), (-1, -1), padd),
        ("BOTTOMPADDING", (0, 0), (-1, -1), padd),
    ]
    if header:
        cmds += [("BACKGROUND", (0, 0), (-1, 0), PALE)]
    t.setStyle(TableStyle(cmds))
    return t


def section(title: str, points: int, anchor: str):
    story.append(Paragraph(f'<a name="{anchor}"/><u>Answer Part {anchor.split("part")[1]}: {esc(title)} ({points} Points)</u>', styles["part"]))


def h(text: str, level=2):
    story.append(p(text, "h2" if level == 2 else "h3"))


def body(text: str):
    story.append(p(text))


def image_flow(path: Path, maxw=CONTENT_W, maxh=335 * mm / 1.7, title="", caption=""):
    if not path.is_file():
        raise FileNotFoundError(f"Screenshot missing: {path.relative_to(ROOT)}")
    im = Image(str(path))
    factor = min(maxw / im.imageWidth, maxh / im.imageHeight, 1.0)
    im.drawWidth = im.imageWidth * factor
    im.drawHeight = im.imageHeight * factor
    parts = []
    if title:
        parts.append(p(title, "h3"))
    parts.append(im)
    if caption:
        parts.append(p(caption, "caption"))
    return KeepTogether(parts)


class ImageSlice(Flowable):
    """Draw a vertically cropped section of an original screenshot without altering it."""
    def __init__(self, path: Path, width: float, top_px: int, height_px: int, max_height: float):
        super().__init__()
        self.path = path
        self.reader = ImageReader(str(path))
        self.image_width, self.image_height = self.reader.getSize()
        self.display_width = width
        self.top_px = top_px
        self.height_px = height_px
        self.scale = min(width / self.image_width, max_height / height_px)
        self.image_display_width = self.image_width * self.scale
        self.width = width
        self.height = height_px * self.scale

    def wrap(self, avail_width: float, avail_height: float):
        return min(self.width, avail_width), self.height

    def draw(self):
        self.canv.saveState()
        clip = self.canv.beginPath()
        clip.rect(0, 0, self.width, self.height)
        self.canv.clipPath(clip, stroke=0, fill=0)
        bottom_px = self.image_height - self.top_px - self.height_px
        self.canv.drawImage(
            str(self.path), (self.display_width - self.image_display_width) / 2, -bottom_px * self.scale,
            width=self.image_display_width,
            height=self.image_height * self.scale,
            preserveAspectRatio=False,
            mask="auto",
        )
        self.canv.restoreState()


def image_evidence(path: Path, title: str, caption: str, *, break_before=True, max_height=None, viewport_height_px=None):
    """Give each screenshot page-sized space; show very long captures as two readable views."""
    if not path.is_file():
        raise FileNotFoundError(f"Screenshot missing: {path.relative_to(ROOT)}")
    if break_before:
        story.append(PageBreak())
    image_width, image_height = ImageReader(str(path)).getSize()
    max_height = max_height or FULL_IMAGE_MAX_H
    aspect = image_height / image_width
    if aspect < 2.0:
        factor = min(CONTENT_W / image_width, max_height / image_height)
        im = Image(str(path), width=image_width * factor, height=image_height * factor)
        im.hAlign = "CENTER"
        story.append(p(esc(title), "h3"))
        story.append(im)
        story.append(p(esc(caption), "caption"))
        return
    px_per_page = max(1, int(max_height * image_width / CONTENT_W))
    if viewport_height_px:
        slice_px = min(viewport_height_px, image_height)
        slices = [(0, slice_px), (max(0, image_height - slice_px), slice_px)]
        labels = ["Top segment", "Bottom segment"]
        captions = [
            f"{caption} Top segment of the full-page browser capture; complete original is preserved separately.",
            f"{caption} Bottom segment of the full-page browser capture; complete original is preserved separately.",
        ]
    elif aspect > 2.5:
        slices = [(0, min(px_per_page, image_height)), (max(0, image_height - px_per_page), min(px_per_page, image_height))]
        labels = ["Top view", "Bottom view"]
        captions = [
            f"{caption} Top of the original long capture; full source is preserved in the evidence folder.",
            f"{caption} Bottom of the original long capture; full source is preserved in the evidence folder.",
        ]
    else:
        split_px = (image_height + 1) // 2
        slices = [(0, split_px), (split_px, image_height - split_px)]
        labels = ["View 1 of 2", "View 2 of 2"]
        captions = [
            f"{caption} Continuous capture, first half.",
            f"{caption} Continuous capture, second half.",
        ]
    for index, (top_px, height_px) in enumerate(slices):
        if index:
            story.append(PageBreak())
        story.append(p(esc(f"{title} · {labels[index]}"), "h3"))
        story.append(ImageSlice(path, CONTENT_W, top_px, height_px, max_height))
        story.append(p(esc(captions[index]), "caption"))


def responsive_viewport_evidence(surface: str, filename: str, description: str):
    """Show the same authenticated Lab 4 surface at real desktop/tablet/mobile viewports."""
    story.append(PageBreak())
    h(f"9.2 Responsive viewport evidence · {surface}")
    body(description)
    specs = [
        ("Desktop", "desktop", 1280, 720),
        ("Tablet", "tablet", 768, 1024),
        # Pixel 5 screenshots are device-scale-factor 2.75: 393 × 851 CSS pixels.
        ("Mobile", "mobile", 1081, 2340),
    ]
    for label, folder, _width, viewport_height in specs:
        path = SHOTS / "release" / folder / filename
        if not path.is_file():
            raise FileNotFoundError(f"Responsive screenshot missing: {path.relative_to(ROOT)}")
        _image_width, image_height = ImageReader(str(path)).getSize()
        crop_height = min(viewport_height, image_height)
        story.append(PageBreak())
        story.append(p(f"{surface} · {label}", "h3"))
        story.append(ImageSlice(path, CONTENT_W, 0, crop_height, FULL_IMAGE_MAX_H))
        story.append(p(
            f"Real Playwright {folder} viewport capture; source was recorded by the current full E2E run.",
            "caption",
        ))


def panel(path: Path, heading: str, caption: str, maxw: float, maxh: float, *, local=True):
    im = Image(str(path))
    factor = min((maxw - 12) / im.imageWidth, maxh / im.imageHeight, 1.0)
    im.drawWidth = im.imageWidth * factor
    im.drawHeight = im.imageHeight * factor
    content = Table([[im], [p(caption, "caption")]], colWidths=[maxw - 8], hAlign="CENTER")
    content.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 1)]))
    box = Table([[p(esc(heading), "tablebold")], [content]], colWidths=[maxw], hAlign="CENTER")
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PALE2), ("BOX", (0, 0), (-1, -1), .7, GRID),
        ("INNERGRID", (0, 0), (-1, -1), .4, colors.HexColor("#777777")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return box


def pair(paths, titles, captions, maxh=245):
    gap = 9
    col = (CONTENT_W - gap) / 2
    items = [panel(paths[i], titles[i], captions[i], col, maxh) for i in range(len(paths))]
    row = [items[0], ""] if len(items) == 1 else [items[0], items[1]]
    t = Table([row], colWidths=[col, col], hAlign="LEFT")
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0)]))
    story.append(t)
    story.append(Spacer(1, 7))


story = []
OUT.parent.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)
REPORT_VERIFY.mkdir(parents=True, exist_ok=True)
REPORT_SHOTS.mkdir(parents=True, exist_ok=True)
if OUT.exists() and not (TMP / "LAB_04_before_report_refresh.pdf").exists():
    shutil.copy2(OUT, TMP / "LAB_04_before_report_refresh.pdf")

# Title and identity block follow the Lab 2 report's A4, Arial, blue-gray table, and black-grid treatment.
story.append(p('<b>LAB 4:</b> TokTickIT Service Desk Workflow and Dashboards', "title"))
identity = [
    [p("<b>Student Name:</b> Thira Rungruangkaset", "table"), p("<b>Student ID:</b> 67070503419", "table")],
    [p("<b>GitHub Username:</b> HolyThiccDaddy", "table"), p("<b>Peer Reviewer:</b> Ashira Sansoda (67070503445)", "table")],
]
it = Table(identity, colWidths=[CONTENT_W / 2] * 2)
it.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PALE), ("GRID", (0, 0), (-1, -1), .75, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7)]))
story.append(it)
story.append(Spacer(1, 7))
body(f"<b>Report edition:</b> Evidence edition, 1 November 2026. Lab 4 Issues #51–#56 / PRs #57–#62, UX/UI Issue #63 / PR #64, and responsive follow-up Issue #65 / PR #66 are closed and merged. The latest merge is <font name='Courier'>{FINAL_MAIN_SHA}</font>, verified as the current main tip. This report records evidence by the source revision it covers and does not claim a guaranteed mark.")

# PART 1 — Git and delivery process
section("Git Use with Engineering Workflow", 10, "part1")
h("1.1 Repository, Project, Issue and PR URLs")
urls = [
    ["Evidence", "Verified destination"],
    ["GitHub repository", link("HolyThiccDaddy/toktickit", "https://github.com/HolyThiccDaddy/toktickit")],
    ["GitHub Project board", link("TokTickIT project #1", "https://github.com/users/HolyThiccDaddy/projects/1")],
    ["Lab 4 Issues", p(" · ".join(f'<link href="https://github.com/HolyThiccDaddy/toktickit/issues/{n}" color="#0563C1"><u>#{n}</u></link>' for n in range(51, 57)), "body")],
    ["Lab 4 final integration", link("PR #62 → main", "https://github.com/HolyThiccDaddy/toktickit/pull/62")],
    ["UI rework follow-up", link("Issue #63 / PR #64", "https://github.com/HolyThiccDaddy/toktickit/pull/64")],
    ["Tablet responsive correction", link("Issue #65 / PR #66", "https://github.com/HolyThiccDaddy/toktickit/pull/66")],
    ["Lab 4 source documents", link("docs/lab-04 on main", "https://github.com/HolyThiccDaddy/toktickit/tree/main/docs/lab-04")],
    ["README / .gitignore", p('<link href="https://github.com/HolyThiccDaddy/toktickit/blob/main/README.md" color="#0563C1"><u>README</u></link> · <link href="https://github.com/HolyThiccDaddy/toktickit/blob/main/.gitignore" color="#0563C1"><u>.gitignore</u></link>', "body")],
]
story.append(tbl(urls, [145, CONTENT_W - 145], font="table"))
h("1.2 Ordered feature branches and peer approvals")
workflow_rows = [["Issue", "Feature branch → base", "PR", "Merged SHA (short)", "Peer review"]]
for issue, pr in zip(SNAPSHOT["issues"][:6], PR_MERGED):
    workflow_rows.append([
        f"#{issue['number']} {issue['title'].replace('Lab 4 Issue ', '').replace('Feature ', '')}",
        f"{pr['head']} → {pr['base']}",
        link(f"#{pr['number']}", f"https://github.com/HolyThiccDaddy/toktickit/pull/{pr['number']}"),
        pr["merge"][:10],
        "Approved by osizk; merged by osizk" if pr["merged"] else "Pending",
    ])
story.append(tbl(workflow_rows, [130, 150, 36, 78, CONTENT_W - 394], font="tiny", padd=3.1))
body(f"PRs #57–#61 integrate the ordered feature slices into <b>lab4-staging</b>; PR #62 integrated the Lab 4 release into <b>main</b> at <font name='Courier'>96a34538efcb6675ac8129fd7e7b7c63e619e724</font>. The corresponding Issues #51–#56 are closed. The UI rework PR #64 and responsive follow-up PR #66 were separately merged to <b>main</b>; GitHub's main branch now points to <font name='Courier'>{FINAL_MAIN_SHA}</font>. The Project board could not be independently re-read from the connected account, so this report does not infer its card columns from closed Issues.")
story.append(Spacer(1, 4))
h("1.3 Follow-up branch records")
followup_rows = [
    ["Issue", "Branch → base", "PR", "Head SHA", "Merge SHA", "Review"],
    ["#63 · UX/UI", "codex/63-ux-ui-rework → main", link("#64", "https://github.com/HolyThiccDaddy/toktickit/pull/64"), UI_PR["head"][:12], UI_PR["merge"][:12], "Approved / merged"],
    ["#65 · Tablet overlap", f"{RESPONSIVE_FIX['headBranch']} → main", link("#66", "https://github.com/HolyThiccDaddy/toktickit/pull/66"), RESPONSIVE_FIX["head"][:12], RESPONSIVE_FIX["merge"][:12], "Approved / merged"],
]
story.append(tbl(followup_rows, [84, 147, 35, 91, 91, CONTENT_W - 448], font="tiny", padd=2.8))
story.append(KeepTogether([
    p("1.4 UI rework history and responsive follow-up", "h2"),
    p(f"Issue #63 / PR #64 addressed the UX/UI rework and restored permitted direct URLs; it was approved by @osizk and merged at <font name='Courier'>{MERGE_SHA}</font>. Subsequent final responsive QA identified overlapping Ticket-operation controls at tablet widths. Issue #65 / PR #66 changed the Staff Ticket Detail grid and added regression assertions at 768px, 991px and 992px. PR #66 was formally approved by @osizk and merged to <b>main</b> at <font name='Courier'>{RESPONSIVE_FIX['merge']}</font>; Issue #65 is closed. Part 3 separates the server run on the preceding main tree from the client and full E2E results recorded for the PR #66 follow-up.", "body"),
]))
h("1.5 Main branch and review evidence")
body(f"The verified main branch tip is <font name='Courier'>{FINAL_MAIN_SHA}</font>, the PR #66 merge commit. The earlier PR #64 main SHA <font name='Courier'>{MERGE_SHA}</font> remains documented as a distinct release milestone. GitHub returned zero status checks and zero workflow runs for the final merge SHA; local tests in Part 3 are not presented as GitHub CI.")
h("1.6 Rendered peer-review evidence")
review_focus = {
    57: "Action lifecycle, resolution evidence, dashboard count/drill-down parity, and complete AC mapping.",
    58: "Seed rerun preservation and idempotent replay after assignee deactivation.",
    59: "Follow-up value clearing, timestamp precision, revision history, and eligible assignees.",
    60: "Reject unsupported stale preconditions and recover Action evidence after load failure.",
    61: "Route My Actions correctly and match dashboard predicates/date windows.",
    62: "Nine-part PDF criteria, awaited metric data, and exact SHA-bound command output.",
    64: "Restore permitted direct URLs and retain queue/date filters in new-tab navigation.",
    66: "Fix tablet overlap between assignment and IT Priority controls; add boundary-width regression assertions.",
}
review_rows = [["PR / linked Issue", "Peer feedback and author re-review", "Formal decision"]]
ui_review_links = {
    "CHANGES_REQUESTED": "https://github.com/HolyThiccDaddy/toktickit/pull/64#pullrequestreview-5727131017",
    "APPROVED": "https://github.com/HolyThiccDaddy/toktickit/pull/64#pullrequestreview-5727937797",
}
ui_comment_links = [
    "https://github.com/HolyThiccDaddy/toktickit/pull/64#issuecomment-6557660725",
]
ui_reviews = [dict(r, url=ui_review_links.get(r.get("state"))) for r in UI_PR["reviews"]]
ui_comments = [dict(c, url=ui_comment_links[index]) for index, c in enumerate(UI_PR["comments"][:2])]
review_prs = list(PR_MERGED) + [{
    "number": 64, "issue": 63, "reviews": ui_reviews, "comments": ui_comments,
}, {
    "number": 66, "issue": 65,
    "reviews": [dict(RESPONSIVE_FIX["review"], url="https://github.com/HolyThiccDaddy/toktickit/pull/66")],
    "comments": [{"user": "HolyThiccDaddy", "body": RESPONSIVE_FIX["authorReply"], "url": "https://github.com/HolyThiccDaddy/toktickit/pull/66"}],
}]
for pr in review_prs:
    approved = next((r for r in reversed(pr.get("reviews", [])) if r.get("state") == "APPROVED"), None)
    previous = [r for r in pr.get("reviews", []) if r.get("state") != "APPROVED"]
    last_feedback = previous[-1] if previous else None
    comments = pr.get("comments", [])
    re_review = next((c for c in reversed(comments) if "re-review" in c.get("body", "").lower()), None)
    merge_reply = next((c for c in reversed(comments) if c is not re_review), None)
    feedback_url = last_feedback.get("url") if last_feedback else f"https://github.com/HolyThiccDaddy/toktickit/pull/{pr['number']}"
    feedback_link = f'<link href="{esc(feedback_url)}" color="#0563C1"><u>Peer review</u></link>'
    author_link = f'<link href="{esc(re_review["url"])}" color="#0563C1"><u>Author re-review</u></link>' if re_review else "Author response recorded"
    approval_link = f'<link href="{esc(approved["url"])}" color="#0563C1"><u>APPROVED</u></link>' if approved and approved.get("url") else "Approval recorded"
    if merge_reply and merge_reply.get("url"):
        approval_link += f'<br/><link href="{esc(merge_reply["url"])}" color="#0563C1"><u>Merge reply</u></link>'
    issue_number = pr.get("issue", 63 if pr["number"] == 64 else pr["number"] - 6)
    review_rows.append([
        f'PR #{pr["number"]} / Issue #{issue_number}',
        p(f'{esc(review_focus[pr["number"]])}<br/>{feedback_link} · {author_link}', "tiny"),
        p(approval_link, "tiny"),
    ])
story.append(tbl(review_rows, [102, 276, CONTENT_W - 378], font="tiny", padd=3.1))
body("The links show peer findings, author re-review responses, formal approvals, and merge acknowledgments for the six ordered Lab 4 PRs plus the two separate UI follow-ups. The full review history is in reviewer.md. Issue closure and PR merge are verified; Project-card Done remains a separate unverified gate.")
h("1.7 Repository structure and delivery hygiene")
story.append(p("toktickit/\n├── client/ · React UI, component tests, and Playwright dependency\n├── server/ · Express API, Prisma schema/migrations, and API tests\n├── e2e/ · Playwright journeys and deterministic setup/teardown\n├── docs/lab-02/ · prior-lab contract and test evidence\n├── docs/lab-03/ · authenticated workflow contract and evidence\n├── docs/lab-04/ · specification, API/UI contracts, tests, AI-use and reviewer record\n├── artifacts/lab-04/ · verification output and real screenshots\n└── output/pdf/ · final submission report", "tree"))
body("README records the React/TypeScript, Express/Prisma, PostgreSQL stack and inherited Lab 1–3 behaviors. The committed .gitignore excludes dependency folders, local environment files/secrets, build output, local databases, logs, uploads, and Playwright outputs.")
story.append(link("README", "https://github.com/HolyThiccDaddy/toktickit/blob/main/README.md"))
story.append(link(".gitignore", "https://github.com/HolyThiccDaddy/toktickit/blob/main/.gitignore"))
# PART 2 — Specification DD
story.append(PageBreak())
section("Specification Driven Development (Spec DD)", 5, "part2")
h("2.1 Sprint goal and explicit boundaries")
body("Extend the authenticated service desk with traceable Actions Taken, a complete Ticket workflow and resolution gate, and role-scoped dashboards, while preserving Lab 1–3 behavior. The contract explicitly excludes SLA/escalation engines, external notifications, inventory/purchasing/cost accounting, multi-level approval/signatures, advanced BI/export warehouses, and unapproved production/multi-tenant features.")
spec_url = "https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/specification.md"
story.append(link("Full numbered specification.md", spec_url))
h("2.2 Functional requirements")
fr = [
    ["ID", "Requirement"],
    ["FR-01–04", "One Ticket to many chronologically listed Actions; authenticated Staff/Admin create and versioned edit; Requester reads only owned Ticket Actions."],
    ["FR-05–07", "Respect public/internal visibility; conditional follow-up note; descriptive attachment notes reuse existing file-upload policy."],
    ["FR-08–10", "Support all eight Ticket statuses; enforce role-specific transitions, terminal protection, stale-write handling, and resolution evidence server-side."],
    ["FR-11–14", "Role-scoped Requester/Staff/Admin dashboards; concise server-side metrics and exact drill-downs; zero results remain explicit."],
    ["FR-15–16", "Every protected API uses authenticated session, role/ownership checks, and safe conflicts for stale writes."],
    ["FR-17–20", "Forward-compatible migration preserves prior Lab data; deterministic idempotent seed; Lab 1–3 regressions remain covered; all loading, empty, validation, success, forbidden, not-found, conflict and retry states are testable."],
]
story.append(tbl(fr, [79, CONTENT_W - 79]))
h("2.3 Action fields and lifecycle")
fields = [
    ["Field", "Contract"],
    ["Action date/time", "Required; timezone-aware; display in the documented application timezone."],
    ["Description / result", "Trimmed; required; description 10–2,000 characters; result 1–2,000; whitespace-only rejected."],
    ["Performer", "Derived from the authenticated server session; client actor IDs are ignored."],
    ["Assignee", "Optional active IT Staff/Admin only; assignment does not change performer or audit history."],
    ["State / audit", "OPEN → IN_PROGRESS / COMPLETED / CANCELLED; IN_PROGRESS → COMPLETED / CANCELLED; terminal states do not transition."],
    ["Follow-up", "If required, note is required. Resolution records time and authenticated resolver, appends revision, increments version; Action remains COMPLETED."],
    ["Attachment notes", "Optional descriptive text; does not upload a file or expose a storage key."],
    ["Edit history", "Each accepted versioned edit stores a prior immutable snapshot; stale/rejected edits append no revision."],
]
story.append(tbl(fields, [105, CONTENT_W - 105]))
status_heading = p("2.4 Ticket status transitions and resolution gate", "h2")
trans = [["From", "To", "Role", "Confirmation / gate"]]
trans += [
    ["NEW", "OPEN", "Staff/Admin", "None"], ["OPEN", "IN_PROGRESS", "Staff/Admin", "None"],
    ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "Staff/Admin", "None"], ["WAITING_FOR_REQUESTER", "IN_PROGRESS", "Staff/Admin", "None"],
    ["IN_PROGRESS", "RESOLVED", "Staff/Admin", "Confirm + qualifying completed Action + no outstanding follow-up"],
    ["RESOLVED", "CLOSED", "Staff/Admin", "Confirm + same resolution gate"], ["RESOLVED", "REOPENED", "Staff/Admin", "Confirm"],
    ["REOPENED", "IN_PROGRESS", "Staff/Admin", "None"],
    ["NEW / OPEN / IN_PROGRESS / WAITING_FOR_REQUESTER / REOPENED", "CANCELLED", "Staff/Admin", "Confirm; terminal afterwards"],
]
status_table = tbl(trans, [190, 68, 66, CONTENT_W - 324], font="tiny", padd=2.0)
status_contract = p("A qualifying Action must be COMPLETED, belong to the Ticket, contain non-empty description/result, and have completion time and actor. Every follow-up must also be resolved before RESOLVED/CLOSED. Requester status indications are advisory only. Any unlisted, unauthorized, stale, or terminal transition is rejected without mutation.")
story.append(KeepTogether([status_heading, status_table, status_contract]))
h("2.5 Dashboard metric predicates")
metric_rows = [
    ["Role / metric", "Exact server predicate", "Drill-down"],
    ["Requester · Open", "Owned by session; NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED", "/my-tickets?currentStatuses=…"],
    ["Requester · Waiting", "Owned by session; WAITING_FOR_REQUESTER", "/my-tickets?currentStatus=…"],
    ["Requester · Updated", "Owned by session; now−7d ≤ updatedAt < now", "/my-tickets?updatedFrom…&updatedTo…"],
    ["Requester · Resolved", "Owned by session; RESOLVED/CLOSED; last 7 UTC days", "/my-tickets?currentStatuses…"],
    ["Staff/Admin · Unassigned", "ownerId IS NULL; active work statuses", "/staff/queue?assigneeId=unassigned"],
    ["Staff/Admin · My owned", "ownerId=session; active work statuses", "/staff/queue?assigneeId=me"],
    ["Staff/Admin · In progress", "IN_PROGRESS or WAITING_FOR_REQUESTER", "/staff/queue?statuses=…"],
    ["Staff/Admin · Updated", "Accessible Ticket; now−7d ≤ updatedAt < now", "/staff/queue?updatedFrom…"],
    ["Staff/Admin · My Actions", "performedBy=session; now−30d ≤ actionDateTime < now", "/staff/actions?performedBy=me"],
]
story.append(tbl(metric_rows, [110, 258, CONTENT_W - 368], font="tiny", padd=3.0))
h("2.6 Authorization matrix")
authz = [
    ["Capability", "Requester", "IT Staff", "Administrator"],
    ["View Dashboard", "Own metrics only", "Operational metrics", "Staff metrics + permitted account summary"],
    ["Read Ticket", "Own Tickets", "Authorized queue/detail", "Authorized queue/detail"],
    ["Read Actions", "Own Ticket history", "Accessible Ticket history", "Accessible Ticket history"],
    ["Create / edit Action", "Denied", "Active session + CSRF + version", "Active session + CSRF + version"],
    ["Change Ticket status", "Denied; response advisory", "Allowed transition + server gate", "Allowed transition + server gate"],
    ["Administer users", "Denied", "Denied", "Admin role + last-admin safeguard"],
]
story.append(tbl(authz, [130, 98, 145, CONTENT_W - 373], font="tiny", padd=3.1))
h("2.7 Shared UI, accessibility and responsive contract")
body("All roles reuse the Lab 2/3 Zen Green tokens and shared controls. Active navigation and keyboard focus remain visible. Inputs have accessible labels; status and priority include text cues rather than color alone; field errors connect to controls and announce through a live region. Recoverable failures preserve entered form values.")
body("Desktop begins at 992px, tablet at 768–991px, and mobile below 768px. Tables and dashboard columns reflow within their component; the page itself must not scroll horizontally. Keyboard focus follows visible navigation, dialogs restore focus to their trigger, and reduced-motion preferences suppress decorative transitions.")
story.append(link("API filters, auth matrix and dashboard contract", "https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/api-spec.md"))
story.append(link("Responsive screen, component and state contract", "https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/ui-spec.md"))
h("2.8 Migration, definition of done, and spec-first evidence")
delivery_rows = [
    ["Release contract", "Acceptance rule"],
    ["Migration", "Forward-only, additive schema changes preserve Lab 1–3 records; seeded data is deterministic and rerunnable."],
    ["Verification", "Protected APIs enforce session, role and ticket ownership; stale mutations conflict without partial writes."],
    ["Definition of done", "Every numbered AC maps to an executable test path; full inherited regressions, responsive/accessibility evidence, recovery checks, docs and nine-part PDF are reviewed before final integration."],
    ["Out of scope", "No SLA/escalation engine, external notification system, inventory/cost accounting, multi-level approval, or unapproved production feature."],
]
story.append(tbl(delivery_rows, [102, CONTENT_W - 102]))
proof = [
    ["Evidence", "Verified timestamp / relationship"],
    ["Initial spec + Test DD commit", "8b8577781957d6079fcfbed421a77e2a5f6345c9 · 29 Oct 2026, 19:06 +07"],
    ["Reviewed contract commit", "2cf44f91c3fc949f5ce4b515e4218b60589b00ef · merged in PR #57 before implementation work"],
    ["First implementation PR opened", "PR #58 opened 30 Oct 2026, 20:59 UTC (31 Oct, 03:59 +07), after the reviewed contract was merged"],
]
story.append(tbl(proof, [150, CONTENT_W - 150], font="tiny", padd=3.2))
story.append(link("PR #57 contract history", "https://github.com/HolyThiccDaddy/toktickit/pull/57"))
story.append(link("PR #58 implementation timeline", "https://github.com/HolyThiccDaddy/toktickit/pull/58"))

# PART 3 — Test DD
story.append(PageBreak())
section("Test Driven Development and Traceability (Test DD)", 10, "part3")
h("3.1 Acceptance-criterion traceability")
tests_md = (ROOT / "docs/lab-04/tests.md").read_text(encoding="utf-8")
lines = tests_md.splitlines()
start = next(i for i, line in enumerate(lines) if "Acceptance-criterion traceability" in line)
table_lines = []
for line in lines[start + 1:]:
    if line.startswith("## "):
        break
    if line.startswith("|") and not re.match(r"\|\s*:?-{2,}", line):
        cells = [x.strip() for x in line.strip().strip("|").split("|")]
        if cells and cells[0] not in ("Test ID", "Test"):
            table_lines.append(cells)
if not table_lines:
    raise ValueError("Could not read the AC test mapping from docs/lab-04/tests.md")
trace = [["Test ID", "AC", "Coverage and executable file", "Status"]]
for cells in table_lines:
    if len(cells) >= 6:
        summary = re.sub(r"`([^`]+)`", r"\1", cells[3])
        summary = re.sub(r"\s+", " ", summary)
        if len(summary) > 105:
            summary = summary[:102].rsplit(" ", 1)[0] + "…"
        file_names = [Path(x).name for x in re.findall(r"`([^`]+)`", cells[4])]
        paths = ", ".join(dict.fromkeys(file_names[:3]))
        coverage = p(f"{esc(summary)}<br/><font color='#5B6472'>File: {esc(paths or 'see tests.md')}</font>", "table")
        trace.append([cells[0], cells[2], coverage, "PASS"])
trace_widths = [55, 73, CONTENT_W - 55 - 73 - 47, 47]
story.append(tbl(trace[:12], trace_widths, font="table", padd=3.1))
story.append(PageBreak())
story.append(p("Acceptance-criterion traceability · continued", "h3"))
story.append(tbl([trace[0]] + trace[12:], trace_widths, font="table", padd=3.1))
h("3.2 Executed Lab 4 test files")
file_rows = [["Suite", "Executable test file", "Passed / failed"]]
for suite_name, payload in (("Server", SERVER), ("Client", CLIENT)):
    for result in payload.get("testResults", []):
        name = result.get("name", "").replace("\\", "/")
        if "/lab-04/" not in name:
            continue
        path = name.split("/tests/", 1)[-1]
        assertions = result.get("assertionResults", [])
        passed = sum(1 for item in assertions if item.get("status") == "passed")
        failed = sum(1 for item in assertions if item.get("status") == "failed")
        file_rows.append([suite_name, path, f"{passed} / {failed}"])
if len(file_rows) == 1:
    raise ValueError("The current server/client test outputs contain no Lab 4 test-file details.")
story.append(tbl(file_rows, [58, CONTENT_W - 157, 99], font="tiny", padd=2.9))
h("3.3 Verified suite outputs and commit boundaries")
suite_rows = [
    ["Suite / build", "Observed result", "Evidence binding"],
    ["Server Vitest", f"{SERVER['numPassedTestSuites']} files; {SERVER['numPassedTests']} passed; {SERVER['numFailedTests']} failed", f"Fresh run on {SERVER_RUN['sourceCommit'][:12]}; server sources unchanged by PR #66 through main {FINAL_MAIN_SHA[:12]}"],
    ["Client Vitest", f"{CLIENT['numPassedTestSuites']} files; {CLIENT['numPassedTests']} passed; {CLIENT['numFailedTests']} failed", f"PR #66 verification; merged head {RESPONSIVE_FIX['head'][:12]}; raw JSON retained"],
    ["Playwright full E2E", f"{E2E['stats']['expected']} passed; {E2E['stats']['unexpected']} failed; {E2E['stats']['skipped']} skipped", "Desktop, tablet and mobile; includes the 768/991/992px overlap assertions"],
    ["Production builds", "Server TypeScript build freshly passed; client TypeScript + Vite build passed for PR #66", "Server verified after merge; PR #66 changed only client UI and E2E test"],
    ["Responsive captures", "27 Lab 4 release PNGs (9 screens × 3 viewports) plus 28 compliance captures", "Follow-up evidence includes 7 explicit width-boundary captures"],
    ["Migrations / seed", "6 migrations; no pending migration; guarded _test seed twice", "Operational-table fingerprints unchanged"],
    ["GitHub checks", f"0 commit statuses; 0 workflow runs for {FINAL_MAIN_SHA[:12]}", "No GitHub CI success is claimed"],
]
story.append(tbl(suite_rows, [114, 224, CONTENT_W - 338], font="tiny", padd=3.0))
body(f"Server tests and TypeScript build were freshly rerun from source commit {SERVER_RUN['sourceCommit'][:12]} after PR #66 had merged. PR #66 changed only <font name='Courier'>client/src/StaffTicketDetail.tsx</font> and <font name='Courier'>e2e/lab-04/compliance-responsive.visual.spec.ts</font>, so the server sources are unchanged through final main {FINAL_MAIN_SHA[:12]}. Server: {SERVER['numPassedTestSuites']} files / {SERVER['numPassedTests']} passed / {SERVER['numFailedTests']} failed; build command <font name='Courier'>npm run build</font> passed. PR #66's verification record reports Client {CLIENT['numPassedTestSuites']} files / {CLIENT['numPassedTests']} passed, the production build passed, and Playwright {E2E['stats']['expected']} passed / {E2E['stats']['unexpected']} failed / {E2E['stats']['skipped']} skipped across desktop/tablet/mobile. Raw server output and run metadata: <font name='Courier'>artifacts/lab-04/verification/ui-rework/final-server-results.json</font> and <font name='Courier'>final-server-run.json</font>. GitHub returned no status checks or workflow runs for the final merge SHA; no CI pass is claimed.")
story.append(link("PR #66 review, verification record and merge", "https://github.com/HolyThiccDaddy/toktickit/pull/66"))
story.append(PageBreak())
h("3.4 Guarded migration, repeat seed and recovery rehearsal")
body("The seed rehearsal loaded only server/.env.test, parsed the PostgreSQL URL, and verified the database name ends in <font name='Courier'>_test</font> before using Prisma. Six migrations were already applied. Two compiled seed runs completed; 13 operational tables were fingerprinted. The repeat-seed check excludes only inherited upsert timestamps <font name='Courier'>User.updatedAt</font> and <font name='Courier'>RequesterUser.updatedAt</font>; it does not claim byte-identical values for those two fields.")
body(f"A separate report-time recovery rehearsal used only a new scratch schema whose name ended in _test, ran the six migrations and deterministic seed, dumped/restored the schema, verified all {RECOVERY['restoredTables']} table fingerprints and {RECOVERY['restoredSequences']} sequences plus the seeded protected attachment bytes, then removed only its own scratch schema/temp folder. This rehearsal is supplemental and was not counted as a test suite or as production/main evidence.")
body("The database examples are intentionally labeled with their sample counts. Seeded revision, public-comment and internal-note tables are empty in this fixture; the recovery rehearsal verified their table fingerprints, but this run does not assert non-empty revision/comment content.")
h("3.5 Scratch recovery row-count snapshot")
counts = RECOVERY["rowCounts"]
count_rows = [["Table", "Rows", "Table", "Rows", "Table", "Rows"]]
for offset in range(0, len(counts), 3):
    row = []
    for item in counts[offset:offset + 3]:
        row.extend([item["table"], str(item["count"])])
    while len(row) < 6:
        row.extend(["", ""])
    count_rows.append(row)
story.append(tbl(count_rows, [CONTENT_W * .21, CONTENT_W * .08, CONTENT_W * .21, CONTENT_W * .08, CONTENT_W * .28, CONTENT_W * .14], font="tiny", padd=3.0))

# PART 4 — AI use/reflection
story.append(PageBreak())
section("AI Use with Reflection", 5, "part4")
ai = (ROOT / "docs/lab-04/ai-use.md").read_text(encoding="utf-8")
prompt_rows = [
    ["#", "Prompt focus", "Decision / verification"],
    ["1", "Extract assignment scope, workflow, repository and PDF rules", "Handout sections 3, 11–14; specification"],
    ["2", "Design Action Taken data model and audit", "Authenticated performer; immutable revisions"],
    ["3", "Enumerate status matrix and resolution gate", "Specification BR-11/12; API tests"],
    ["4", "Define dashboard metrics and drill-down equality", "UTC bounds; API/UI equality tests"],
    ["5", "Review API authorization, CSRF, stale write and idempotency", "Lab 3 session contract; server tests"],
    ["6", "Map acceptance criteria to test types", "tests.md traceability table"],
    ["7", "Review desktop/tablet/mobile and accessibility", "ui-spec and Playwright evidence"],
    ["8", "Audit release evidence against exact revision", "SHA binding; no claim from unrun tests"],
    ["9", "Resolve peer comments on revisions, retries and limits", "PR #57 review history; Lab 2/3 conventions"],
    ["10", "Resolve follow-up before Ticket resolution", "BR-12a and API/UI/E2E workflow"],
]
body("The contract record names OpenAI Codex (GPT-5) for the original Lab 4 work. The separate Issue #63 UI-conformance pass used OpenAI Codex (GPT-6); this does not retrospectively change the original model record.")
story.append(tbl(prompt_rows, [28, 238, CONTENT_W - 266], font="tiny", padd=3.1))
h("4.1 My Reflection")
body("I set the product direction and acceptance expectations. I asked Codex to compare the Lab 4 requirements with earlier labs, implement the planned slices, run checks, prepare screenshots and the report, and follow the branch, Issue-linking, and peer-review flow. For the UI, I supplied reference images and a video and specified the palette, typography, background, selected-state color, full-page layout, rounded corners, border contrast, responsive behavior, and transitions. I also pointed out when evidence or GitHub workflow details did not match what I had asked for, including the need to link each PR to its Issue.")
body("Codex wrote and changed code and tests, ran commands, captured browser evidence, and prepared the report and pull requests; I did not personally perform every implementation or verification step. My contribution was setting the requirements, choosing the visual direction, reviewing the presented results, and asking for corrections when they missed the assignment or our agreed workflow. This process taught me to check the actual screens and the exact branch and commit behind a report: a green test count or a merged PR by itself does not prove every responsive state or submission artifact is correct. Before submitting, I need the final report and screenshots to match the reviewed code on main, and the Kanban state to match the actual review and merge history.")
body("This reflection is based on the student's recorded directions in this conversation and should be checked for personal accuracy before final submission.")
story.append(link("Full selected prompt record and reflection", "https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/ai-use.md"))

# PART 5 — Dashboards
story.append(PageBreak())
section("Working IT Staff Dashboard UI", 5, "part5")
body("Requester metrics remain ownership-scoped. IT Staff and Administrator dashboards share an authorized operational view, including unassigned/currently-owned work, active queue counts, recent/urgent tickets, and My Actions. Cards link to filters with matching predicates; loading, empty, error/retry, forbidden and responsive states are represented in the suite and evidence.")
h("5.1 Independent API and database comparison")
comparison_rows = [["Metric", "Staff API", "Independent Prisma count", "Drill-down"]]
short_drilldowns = {
    "unassignedTickets": "Queue: unassigned + active statuses",
    "myOwnedTickets": "Queue: me + active statuses",
    "inProgressWaiting": "Queue: IN_PROGRESS / WAITING",
}
for m in DASHBOARD_DB["metrics"]:
    comparison_rows.append([m["label"], str(m["api"]), str(m["database"]), short_drilldowns.get(m["key"], m["href"])])
story.append(tbl(comparison_rows, [126, 55, 116, CONTENT_W - 297], font="table", padd=3.0))
body("The counts were read as IT Staff, then independently recomputed from the guarded test database. These numbers are a fixture snapshot, not live production data; each API count equals its matching database count in this run.")
image_evidence(REPORT_SHOTS / "11_staff_dashboard_database_checked.png", "IT Staff · report-time capture", "1 Nov 2026 browser capture; shown metrics checked against independent Prisma counts.")
image_evidence(POST_SHOTS / "lab-04/screenshots/release/desktop/04_admin_dashboard.png", "Administrator · post-merge E2E", "Fresh authenticated desktop capture after PR #64 merged to main.")

# PART 6 — Actions Taken
story.append(PageBreak())
section("Working Actions Taken UI", 10, "part6")
body(f"Authorized Staff/Admin users can create, assign/reassign, edit, complete and cancel Actions Taken. The form validates required values, preserves safe retry states, rejects inactive assignees, and shows immutable revision history. Requesters see a read-only history for their own Ticket. This report combines focused report-time browser evidence with the {E2E['stats']['expected']}-test post-merge browser run; the full screenshot set is kept separately in the post-merge evidence folder.")
body(f"A separate authenticated API request attempted to assign an Action to an inactive IT Staff account. The server returned HTTP {INACTIVE['status']} with field error: “{esc(INACTIVE['response']['error']['fieldErrors']['assigneeId'])}”. The Action count stayed at {INACTIVE['unchangedActionCount']}, confirming no partial mutation.")
image_evidence(REPORT_SHOTS / "01_action_validation.png", "Required-field validation", "Empty save shows field errors and does not create an Action.")
image_evidence(REPORT_SHOTS / "02_action_assigned_followup.png", "Action with assignee and follow-up", "Real filled form; active Staff assignee and required follow-up note.")
image_evidence(REPORT_SHOTS / "03_action_reassign_edit.png", "Edit and reassign", "Current Staff editor changes assignee and result before save.")
image_evidence(REPORT_SHOTS / "04_action_revision_history.png", "Immutable revision timeline", "Saved prior result, assignee and version remain visible in the history.")
image_evidence(REPORT_SHOTS / "05_multiple_completed_cancelled.png", "Multiple Action states", "The Ticket contains one COMPLETED Action and a second CANCELLED Action.")
image_evidence(REPORT_SHOTS / "10_requester_two_actions_readonly.png", "Requester read-only history", "Requester sees both Actions; create/edit and internal-note controls are absent.")
story.append(PageBreak())
h("6.1 Field-level and lifecycle evidence")
action_rows = [
    ["Case", "Observed result"],
    ["Required-field validation", "Empty description/date/result is rejected inline; no Action row is created."],
    ["Active assignment + follow-up", "Active Staff assignee is allowed; a note is required when follow-up is selected."],
    ["Inactive assignment", f"HTTP {INACTIVE['status']} field error; Action count remained {INACTIVE['unchangedActionCount']}."],
    ["Edit / audit", "Accepted edit creates a prior-value revision; creation and performer audit remain visible."],
    ["Action states", "A COMPLETED Action and a CANCELLED Action are both shown; terminal controls are unavailable."],
    ["Requester view", "Both Actions are visible, with no create/edit controls and no internal-note controls."],
]
story.append(tbl(action_rows, [137, CONTENT_W - 137], font="table", padd=3.2))
story.append(link("Actions API and field contracts", "https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/api-spec.md"))

# PART 7 — Ticket workflow
story.append(PageBreak())
section("Ticket Workflow and Resolution Gate", 5, "part7")
body("The server requires a completed qualifying Action and no unresolved follow-up before RESOLVED or CLOSED. An unresolved follow-up blocks resolution even when the Action itself is COMPLETED. Authorized Staff/Admin can resolve the follow-up using its current version; that appends an audit revision while preserving the Action completion state. Reopen follows the defined confirmation rule.")
body(f"The browser flow recorded Ticket {BROWSER_FLOW['ticketId']} on the local test database. A resolution attempt was blocked with the actual server message: “{esc(BROWSER_FLOW['gateMessage'])}”. After follow-up resolution, the Ticket transitioned to RESOLVED and then REOPENED. These are the actual tested transitions; they do not indicate a change to the production database.")
image_evidence(REPORT_SHOTS / "06_followup_blocks_resolution.png", "Resolution blocked by outstanding follow-up", "Ticket remains IN_PROGRESS; exact server gate message is stated above.")
image_evidence(REPORT_SHOTS / "07_followup_resolved.png", "Follow-up resolved", "Authorized Staff resolves the follow-up; Action remains COMPLETED.")
image_evidence(REPORT_SHOTS / "08_ticket_resolved.png", "Ticket formally resolved", "After clearing the follow-up, Staff resolves the Ticket.")
image_evidence(REPORT_SHOTS / "09_ticket_reopened.png", "Reopen from RESOLVED", "The reopened Ticket and permitted next-step controls are visible.")

# PART 8 — regression, accessibility, visual evidence
story.append(PageBreak())
section("Requester Dashboard and Lab 1–3 Regression", 5, "part8")
body("The full regression suites retain the approved Lab 1–3 contracts: ticket creation and ownership, attachment rules, requester isolation, authentication/password gate/logout, role authorization, comments/notes, Staff queue/detail operations and Administrator user management. The refreshed responsive release views below were captured in the post-merge E2E run; Lab 4 dashboard, Actions and workflow examples appear in Parts 5–7.")
image_evidence(POST_SHOTS / "lab-04/screenshots/release/desktop/01_requester_dashboard.png", "Requester Dashboard · desktop", "Fresh authenticated requester view after PR #64 merged; dashboard counts and ticket links are scoped to the signed-in requester.")
story.append(PageBreak())
h("8.1 Regression and state coverage")
reg = [
    ["Area", "Evidence preserved"],
    ["Lab 1–2 ticket journeys", "Authenticated creation, My Tickets, detail, attachment allow/deny, safe ownership and requester isolation."],
    ["Lab 3 authentication", "Valid/invalid login, inactive account, first-login password change, role-aware navigation, logout and direct-access protection."],
    ["Lab 3 staff operations", "Queue sorting/filtering/pagination, claim/reassign, status confirmation, public comment/internal note and forbidden access."],
    ["Lab 3 Administrator", "User list/search, create/edit, role/status changes, password reset and non-admin/last-admin protections."],
    ["Lab 4 regression", "Actions, dashboard metrics/drill-downs, status transitions, stale updates, resolution gate, retry and responsive states."],
]
story.append(tbl(reg, [126, CONTENT_W - 126]))
h("8.2 Inherited requester, communication and Administrator screens")
image_evidence(ROOT / "artifacts/lab-02/screenshots/my-tickets/01_ticket_list_desktop.png", "Lab 2 · authenticated My Tickets", "Real browser evidence of the signed-in requester's owned ticket list; maintained as Lab 4 regression coverage.")
image_evidence(ROOT / "artifacts/lab-02/screenshots/ticket-detail/02_attachment_list.png", "Lab 2 · Ticket Detail attachments", "Real browser evidence of the attachment list and permitted download/removal controls.")
image_evidence(LAB3_SHOTS / "staff-flow/states/14_public_comment.png", "Lab 3 · public communication", "Staff posts a public response visible in the requester conversation.")
image_evidence(LAB3_SHOTS / "staff-flow/states/15_internal_note.png", "Lab 3 · staff-only internal note", "The internal note is labeled staff-only and remains outside the requester conversation.")
image_evidence(LAB3_SHOTS / "user-management/states/01_user_list.png", "Lab 3 · Administrator user management", "Authenticated Administrator view of searchable/filterable user accounts.")
h("8.3 Existing authentication state evidence")
auth = [
    [POST_SHOTS / "lab-03/screenshots/authentication/states/01_invalid_login.png", "Invalid password; generic sign-in error."],
    [POST_SHOTS / "lab-03/screenshots/authentication/states/02_inactive_account.png", "Inactive seeded account response."],
    [POST_SHOTS / "lab-03/screenshots/authentication/states/03_valid_login_filled.png", "Valid credentials submitted through the UI."],
    [POST_SHOTS / "lab-03/screenshots/authentication/states/04_first_login_gate.png", "First-login password gate takes precedence."],
]
for path, title in auth:
    image_evidence(path, title, "Real browser evidence for the inherited Lab 3 authentication flow.")
for name, title in [
    ("05_password_change_form.png", "First-login password change form"),
    ("06_login_and_change_success.png", "Password change and sign-in success"),
    ("07_after_logout_protected.png", "Protected route after logout"),
]:
    image_evidence(POST_SHOTS / "lab-03/screenshots/authentication/states" / name, title, "Fresh authenticated E2E capture after PR #64 merged to main.")

h("8.4 Inherited protected screens")
body("These representative Lab 3 screens are preserved as real E2E captures. The inherited responsive behavior remains covered by the named Lab 1–3 regression flows and the original screenshot set; Part 9 contains the full desktop/tablet/mobile comparison for every major Lab 4 view.")
image_evidence(POST_SHOTS / "lab-03/screenshots/authentication/desktop.png", "Authenticated shell · desktop", "The shared session shell and role-aware navigation continue to gate protected screens.")
image_evidence(POST_SHOTS / "lab-03/screenshots/staff-queue/desktop.png", "Staff Queue · desktop", "Authenticated Staff can filter and open the shared operational queue.")
image_evidence(POST_SHOTS / "lab-03/screenshots/staff-ticket-detail/desktop.png", "Staff Ticket Detail · desktop", "Staff sees assignment, priority, status, Actions Taken, comments and internal notes.")
image_evidence(POST_SHOTS / "lab-03/screenshots/user-management/desktop.png", "Administrator User Management · desktop", "Administrator-only account management remains part of the inherited release.")
image_evidence(REPORT_SHOTS / "user_management_tablet_991_top.png", "User Management · Tablet top (991px)", "Real 991 × 1200 browser viewport; all five table columns including Actions fit on screen.")
image_evidence(REPORT_SHOTS / "user_management_tablet_991_bottom.png", "User Management · Tablet lower (991px)", "Actual lower browser viewport after vertical scrolling; controls remain accessible and the page width stays at 991px.")

# PART 9 — final gates
story.append(PageBreak())
section("Final Release Summary and Readiness", 5, "part9")
body(f"Lab 4 Issues #51–#56, UX/UI Issue #63 / PR #64, and responsive Issue #65 / PR #66 are closed and merged. PR #66 was formally approved and merged to main at <font name='Courier'>{FINAL_MAIN_SHA}</font>, now verified as the main branch tip. Client and full E2E results cover the overlap correction. Server tests/build were freshly rerun at source commit <font name='Courier'>{SERVER_RUN['sourceCommit'][:12]}</font>; PR #66 contains no server changes, so the tested server source is unchanged at final main. GitHub returned no status checks or workflow runs. The Project board state and the student's own review of the reflection still need confirmation.")
h("9.1 Rendered UI specification and accessibility checklist")
ui_checks = [
    ["Contract", "Verified design rule"],
    ["Shared system", "Reuse Lab 2/3 Zen Green tokens, forms, tables, shared shell and focus rings; no second palette."],
    ["Typography", "Bundled Inter with system fallback; documented 24px/18px/15px/14px/12px hierarchy."],
    ["Responsive", "Desktop ≥992px; tablet 768–991px; mobile <768px. Reflow components; page itself never overflows horizontally."],
    ["Navigation", "Sticky desktop/tablet navigation; mobile disclosure is keyboard operable, closes on Escape and restores focus."],
    ["Accessibility", "Named controls, visible focus, field-linked errors, live mutation feedback, non-color status cues, reduced-motion support."],
    ["Visual review", "PR #66 adds no-overlap and no-overflow assertions at 768, 991 and 992px; its full E2E record reports 36 passed across desktop/tablet/mobile."],
]
story.append(tbl(ui_checks, [110, CONTENT_W - 110], font="table", padd=3.2))
h("Core Zen Green tokens and type scale")
token_rows = [
    ["Token", "Value / use"],
    ["Primary / focus green", "#006B3C / #0B7A46"],
    ["Pale / page / surface", "#EAF6EF / #F5F7F6 / #FFFFFF"],
    ["Primary / secondary text", "#1B2E24 / #52665A"],
    ["Neutral border / error", "#D1DDD6 / #C53030"],
    ["Typography", "Inter; 24 / 18 / 15 / 14 / 12px heading-to-caption scale."],
]
story.append(tbl(token_rows, [150, CONTENT_W - 150], font="tiny", padd=3.0))
story.append(link("Full committed ui-spec.md", "https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/ui-spec.md"))
h("9.2 Lab 4 screen evidence · desktop, tablet and mobile")
responsive_viewport_evidence("Requester Dashboard", "01_requester_dashboard.png", "Role-scoped dashboard and ticket list; see the same route at all three required viewport bands.")
responsive_viewport_evidence("IT Staff Dashboard", "02_staff_dashboard.png", "Operational metrics, queue drill-downs and recent/urgent work at desktop, tablet and mobile widths.")
responsive_viewport_evidence("My Actions Taken", "03_staff_actions.png", "Authenticated staff Action list and date/user-scoped results at each breakpoint.")
responsive_viewport_evidence("Administrator Dashboard", "04_admin_dashboard.png", "Administrator's authorized operational summary at each breakpoint.")
responsive_viewport_evidence("Staff Ticket Detail and resolution gate", "09_staff_ticket_resolution_gate.png", "Ticket operations, Actions Taken and requester/staff communication at each breakpoint.")
h("9.3 Assignment gate status")
gates = [
    ["Gate", "Current evidence", "Status"],
    ["Six ordered Issues / Kanban workflow", "Issues #51–#56 and PRs #57–#62 closed/merged; UI follow-up Issues #63/#65 and PRs #64/#66 also closed/merged. Project card columns remain unreadable.", "Verify board"],
    ["Spec DD / Test DD", "Numbered requirements, API/UI contracts, AC mapping and named test sources are committed on main.", "Evidence included"],
    ["Core Lab 4 and UI regression", f"Server {SERVER['numPassedTestSuites']} files / {SERVER['numPassedTests']} passed; build passed at {SERVER_RUN['sourceCommit'][:12]}. The PR #66 diff has no server files; client {CLIENT['numPassedTests']} passed and Playwright {E2E['stats']['expected']} passed.", "Verified source; no CI"],
    ["UX/UI rework", f"Issue #63 closed; PR #64 approved and merged at {MERGE_SHA[:12]}.", "Merged"],
    ["Tablet responsive correction", f"Issue #65 closed; PR #66 approved and merged at {FINAL_MAIN_SHA[:12]}; this is the current main tip.", "Merged"],
    ["UI responsive/accessibility evidence", f"{POST_MERGE['screenshots']['count']} post-PR #64 captures plus 27 release and 28 compliance captures from the responsive follow-up; E2E spans desktop/tablet/mobile.", "Evidence included"],
    ["GitHub checks", "No commit status checks or workflow runs returned for the merge SHA.", "No CI result"],
    ["Student reflection / final PDF", "Report regenerated with current merge and test evidence; student should verify the reflection and final wording.", "Student review"],
]
story.append(tbl(gates, [119, 307, CONTENT_W - 426], font="tiny", padd=3.2))
h("9.4 Final actions before submission")
for item in [
    "Confirm the Issue #63 and #65 cards are in the expected final columns on the Project board; the connected GitHub API could not read Project status.",
    "Read the AI-use reflection and adjust it in your own words so it accurately describes your work.",
    "Keep the real browser screenshots and their current manifest with the PDF if the instructor expects the source evidence separately; the report embeds representative Lab 2–4 captures.",
    "Review all nine parts and links in the refreshed PDF before uploading the canonical Lab 4 report.",
]:
    story.append(p("• " + esc(item), "body"))
story.append(Spacer(1, 8))
story.append(p("The reviewed UI follow-up is merged at the current main tip. Client and E2E results cover the responsive fix. Server tests/build were rerun at the recorded source commit; the final PR changed no server files, so the tested server source is unchanged at main. The remaining student-owned checks are the Project board column and reflection wording. No GitHub CI result or guaranteed grade is claimed.", "quote"))
story.append(link("Lab 4 specification and test contracts", "https://github.com/HolyThiccDaddy/toktickit/tree/main/docs/lab-04"))


class ReportDoc(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and isinstance(flowable.text, str) and flowable.text.startswith('<a name="part'):
            match = re.search(r'<a name="(part\d+)"', flowable.text)
            if match:
                key = match.group(1)
                self.canv.bookmarkPage(key)
                label = re.sub(r"<[^>]+>", "", flowable.getPlainText())
                self.canv.addOutlineEntry(label[:90], key, 0, False)


def draw_page(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#AAB3BF"))
    canvas.setLineWidth(.45)
    canvas.line(LEFT, 12 * mm, PAGE_W - RIGHT, 12 * mm)
    canvas.setFont(FONT_REG, 7.5)
    canvas.setFillColor(GRAY)
    canvas.drawString(LEFT, 7.5 * mm, "TokTickIT Lab 4 | Evidence edition | 1 November 2026")
    canvas.drawRightString(PAGE_W - RIGHT, 7.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


frame = Frame(LEFT, BOTTOM, CONTENT_W, PAGE_H - TOP - BOTTOM, id="normal", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc = ReportDoc(str(OUT), pagesize=A4, leftMargin=LEFT, rightMargin=RIGHT, topMargin=TOP, bottomMargin=BOTTOM, title="LAB 4: TokTickIT Service Desk Workflow and Dashboards", author="Thira Rungruangkaset", subject="Nine-part Lab 4 evidence edition")
doc.addPageTemplates([PageTemplate(id="main", frames=frame, onPage=draw_page)])
doc.build(story)

# Markdown source mirrors the nine-part PDF and links to committed contracts plus report-time captures.
markdown = f'''# LAB 4: TokTickIT Service Desk Workflow and Dashboards

**Student:** Thira Rungruangkaset (67070503419)<br>
**GitHub:** HolyThiccDaddy<br>
**Peer reviewer:** Ashira Sansoda (67070503445)<br>
**Edition:** Evidence edition — 1 November 2026

> **Readiness:** Lab 4 Issues #51–#56 / PRs #57–#62, UX/UI Issue #63 / PR #64, and responsive follow-up Issue #65 / PR #66 are closed and merged. The latest merge, `a76ee09dc558aa2efcd6f4ef3f3bd759ba3bed7e`, is the current `main` tip. Server tests/build were freshly rerun at source commit `ca82049e16816729c8883c98c105659625696464`; PR #66 changed no server files. Client and Playwright results cover the responsive follow-up. GitHub returned no status checks or workflow runs. Project board status and student reflection still need the student's confirmation; no guaranteed grade is claimed.

## Answer Part 1 — Git Use with Engineering Workflow (10 Points)

The five feature PRs (#57–#61) were reviewed and merged to `lab4-staging`; PR #62 was approved and merged into `main` at `96a34538efcb6675ac8129fd7e7b7c63e619e724` by Ashira Sansoda (`osizk`). The associated Issues #51–#56 are closed. [Repository](https://github.com/HolyThiccDaddy/toktickit) · [Project board](https://github.com/users/HolyThiccDaddy/projects/1) · [PR #62](https://github.com/HolyThiccDaddy/toktickit/pull/62).

PR #64 was approved and merged by @osizk at `{MERGE_SHA}` from `codex/63-ux-ui-rework` (head `{CURRENT_UI_SHA}`). The tablet-overlap follow-up Issue #65 / PR #66 used `codex/65-tablet-ticket-operations` → `main`, head `{RESPONSIVE_FIX['head']}`, and merge `{FINAL_MAIN_SHA}`; it was formally approved and merged. The reviewer record renders peer findings, author re-review responses, formal approvals, and merge acknowledgments for PRs #57–#62, #64, and #66. The Project board card status remains unverified because the connected account could not read it. README and .gitignore repository evidence is rendered in this report and linked.

## Answer Part 2 — Specification Driven Development (Spec DD) (5 Points)

The scope, exclusions, FR-01–FR-20, Action business rules, eight Ticket statuses, authorization, resolution gate, dashboard metrics, and DoD are in [specification.md](https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/specification.md). API filters and role boundaries are in [api-spec.md](https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/api-spec.md); screen states, shared tokens and breakpoints are in [ui-spec.md](https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/ui-spec.md). Initial spec/Test DD commit `8b8577781957d6079fcfbed421a77e2a5f6345c9` predates implementation PR #58, opened 30 Oct 2026 at 20:59 UTC; the reviewed contract was merged before implementation began.

## Answer Part 3 — Test Driven Development and Traceability (Test DD) (10 Points)

The complete AC-to-test mapping and named test files are in [tests.md](https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/tests.md). Server: {SERVER['numPassedTestSuites']} files / {SERVER['numPassedTests']} passed / {SERVER['numFailedTests']} failed, with the TypeScript build passing, freshly run at source commit `{SERVER_RUN['sourceCommit']}`. PR #66 changed no server files, so this server source is unchanged at the final main SHA. PR #66's [verification record](https://github.com/HolyThiccDaddy/toktickit/pull/66) reports Client {CLIENT['numPassedTestSuites']} files / {CLIENT['numPassedTests']} passed, the production client build passed, and Playwright {E2E['stats']['expected']} passed / {E2E['stats']['unexpected']} failed / {E2E['stats']['skipped']} skipped across desktop/tablet/mobile, including the 768/991/992px overlap regression. Raw outputs: `final-server-results.json`, `final-server-run.json`, `responsive-fix-client-results.json`, and `responsive-fix-e2e-results.json`. GitHub returned zero checks for final main `{FINAL_MAIN_SHA}`, so no CI pass is claimed.

## Answer Part 4 — AI Use with Reflection (5 Points)

Ten selected prompt summaries, model identification, verification sources and a reflection that distinguishes the student's requirements/review decisions from Codex-assisted implementation and verification are recorded in [ai-use.md](https://github.com/HolyThiccDaddy/toktickit/blob/main/docs/lab-04/ai-use.md). The student should confirm that the personal account is accurate before final submission.

## Answer Part 5 — Working IT Staff Dashboard UI (5 Points)

Requester/staff/admin dashboards use server-calculated role-scoped metrics and matching drill-down predicates. A report-time authenticated Staff dashboard check compared three API metrics against independent Prisma counts; all three matched. Fresh release evidence captures all three role dashboards and My Actions at desktop/tablet/mobile widths.

## Answer Part 6 — Working Actions Taken UI (10 Points)

Real browser captures show validation, assigned follow-up creation, reassignment/edit, immutable history, multiple completed/cancelled Actions, inactive-assignee rejection without mutation, and requester read-only history. Evidence: `artifacts/lab-04/screenshots/report/` and `artifacts/lab-04/verification/report/`.

## Answer Part 7 — Ticket Workflow and Resolution Gate (5 Points)

A real API-backed browser run shows outstanding follow-up blocking resolution, follow-up resolution, Ticket RESOLVED, and REOPENED states. The full gate message and run metadata are in `artifacts/lab-04/verification/report/browser-flow.json`.

## Answer Part 8 — Requester Dashboard and Lab 1–3 Regression (5 Points)

Requester Dashboard, My Tickets, Ticket attachments, public comments, internal notes, Administrator user management, and seven authentication states are shown. Inherited Lab 3 Staff Queue, Ticket Detail and User Management are shown at desktop/tablet/mobile. The 991 × 1200 tablet User Management capture keeps all columns visible. Existing Lab 1–3 regression categories remain mapped in `tests.md`.

## Answer Part 9 — Final Release Summary and Readiness (5 Points)

The UI specification, palette, type scale, responsive/accessibility checklist, and 15 desktop/tablet/mobile Lab 4 screen captures are rendered in Part 9. PR #66's tablet-overlap correction is approved and merged at `{FINAL_MAIN_SHA}`; its client/full E2E results and the freshly rerun server tests/build are recorded with their source revisions. GitHub checks were absent and no CI pass is claimed. Confirm the Project board cards and personal reflection before submission. This report does not guarantee a 10/10 grade.
'''
MD.write_text(markdown, encoding="utf-8", newline="\n")
print(f"Built {OUT.relative_to(ROOT)}")
print(f"Pages: {doc.page}; size: {OUT.stat().st_size:,} bytes")
