#!/usr/bin/env python3
"""Generate locally hosted U.S. Judges Code pages from the official U.S. Courts PDF."""
from io import BytesIO
from pathlib import Path
import re

import requests
from pypdf import PdfReader

SOURCE_PDF = "https://www.uscourts.gov/file/25752/download"
OUT = Path("_conduct/judges")
REVISION = "March 12, 2019"

SECTIONS = [
    ("Introduction", "The Code of Conduct for United States Judges was initially adopted", "introduction.md", 10, "Code of Conduct for United States Judges, Introduction", 1200),
    ("Canon 1:", "An independent and honorable judiciary is indispensable", "canon-1.md", 20, "Code of Conduct for United States Judges, Canon 1", 1800),
    ("Canon 2:", "A. Respect for Law.", "canon-2.md", 30, "Code of Conduct for United States Judges, Canon 2", 4500),
    ("Canon 3:", "The duties of judicial office take precedence", "canon-3.md", 40, "Code of Conduct for United States Judges, Canon 3", 12000),
    ("Canon 4:", "A judge may engage in extrajudicial activities", "canon-4.md", 50, "Code of Conduct for United States Judges, Canon 4", 10000),
    ("Canon 5:", "A. General Prohibitions.", "canon-5.md", 60, "Code of Conduct for United States Judges, Canon 5", 900),
    ("Compliance with the Code of Conduct", "Anyone who is an officer of the federal judicial system", "compliance.md", 70, "Code of Conduct for United States Judges, Compliance", 2200),
    ("Applicable Date of Compliance", "Persons to whom this Code applies", "applicable-date.md", 80, "Code of Conduct for United States Judges, Applicable Date of Compliance", 450),
]

TITLES = {
    "introduction.md": "Introduction",
    "canon-1.md": "Canon 1: A Judge Should Uphold the Integrity and Independence of the Judiciary",
    "canon-2.md": "Canon 2: A Judge Should Avoid Impropriety and the Appearance of Impropriety in All Activities",
    "canon-3.md": "Canon 3: A Judge Should Perform the Duties of the Office Fairly, Impartially and Diligently",
    "canon-4.md": "Canon 4: A Judge May Engage in Extrajudicial Activities That Are Consistent With the Obligations of Judicial Office",
    "canon-5.md": "Canon 5: A Judge Should Refrain From Political Activity",
    "compliance.md": "Compliance with the Code of Conduct",
    "applicable-date.md": "Applicable Date of Compliance",
}

PAGE_FOOTER = re.compile(r"Guide to Judiciary Policy, Vol\. 2A, Ch\. 2 Page \d+\s*")
PROVISION = re.compile(r"^(?:[A-Z]\.\s|\(\d+\)\s|\([a-z]\)\s|\([ivxlcdm]+\)\s)")
COMMENTARY_LABEL = re.compile(r"^(Canon \d+[A-Z](?:\([^)]+\))*)\.\s+(.*)$")


def yaml_quote(value):
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def format_body(body):
    """Remove PDF furniture, reflow wrapped text, and expose source hierarchy as Markdown."""
    body = PAGE_FOOTER.sub("\n", body)
    lines = [re.sub(r"\s+", " ", line).strip() for line in body.splitlines()]
    blocks, current = [], []
    kind = None
    in_commentary = False

    def flush():
        nonlocal current, kind
        if not current:
            return
        text = " ".join(current).strip()
        if kind == "bullet":
            text = "- " + text
        blocks.append(text)
        current, kind = [], None

    for line in lines:
        if not line:
            flush()
            continue
        if line == "COMMENTARY":
            flush()
            blocks.append("## Commentary")
            in_commentary = True
            continue
        if line.startswith("•"):
            flush()
            current = [line[1:].strip()]
            kind = "bullet"
            continue
        if in_commentary:
            match = COMMENTARY_LABEL.match(line)
            if match:
                flush()
                blocks.append(f"### {match.group(1)}.")
                current = [match.group(2)]
                kind = "text"
                continue
        if PROVISION.match(line):
            flush()
            current = [line]
            kind = "provision"
            continue
        current.append(line)
    flush()
    return "\n\n".join(blocks).strip()


def find_actual_sections(text):
    """Skip the table of contents and locate the eight actual document sections in order."""
    first_intro = text.find("Introduction")
    cursor = text.find("Introduction", first_intro + len("Introduction"))
    if cursor < 0:
        raise RuntimeError("Could not locate the body Introduction")
    starts = []
    for index, (marker, *_rest) in enumerate(SECTIONS):
        if index == 0:
            found = cursor
        else:
            found = text.find(marker, cursor + 1)
        if found < 0:
            raise RuntimeError(f"Could not locate section marker: {marker}")
        starts.append(found)
        cursor = found
    return starts


def main():
    response = requests.get(SOURCE_PDF, timeout=45, headers={"User-Agent": "USAR-Courts-Code-Sync/1.0"})
    response.raise_for_status()
    if not response.content.startswith(b"%PDF"):
        raise RuntimeError("Official source did not return a PDF")

    reader = PdfReader(BytesIO(response.content))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    starts = find_actual_sections(text)
    ends = starts[1:] + [len(text)]

    OUT.mkdir(parents=True, exist_ok=True)
    expected = set()
    for (marker, first_phrase, filename, order, citation, min_chars), begin, end in zip(SECTIONS, starts, ends):
        expected.add(filename)
        section = text[begin:end]
        body_start = section.find(first_phrase)
        if body_start < 0:
            raise RuntimeError(f"Could not locate first body sentence for {marker}")
        body = format_body(section[body_start:])
        if len(body) < min_chars:
            raise RuntimeError(f"Section {marker} is unexpectedly short ({len(body)} chars)")

        front = "\n".join([
            "---",
            f"title: {yaml_quote(TITLES[filename])}",
            f"order: {order}",
            "code_key: judges",
            'code_title: "Code of Conduct for United States Judges"',
            "code_url: /conduct/judges/",
            f"citation: {yaml_quote(citation)}",
            'source_title: "Guide to Judiciary Policy, Vol. 2A, Ch. 2"',
            f"source_url: {yaml_quote(SOURCE_PDF)}",
            f"revision: {yaml_quote(REVISION)}",
            "---",
            "",
        ])
        (OUT / filename).write_text(front + body + "\n", encoding="utf-8")

    for path in OUT.glob("*.md"):
        if path.name not in expected:
            path.unlink()

    print("Generated official Judges Code pages:")
    for path in sorted(OUT.glob("*.md")):
        print(f"  {path}: {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
