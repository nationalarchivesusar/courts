#!/usr/bin/env python3
"""Generate locally hosted U.S. Judges Code pages from the official U.S. Courts HTML."""
from pathlib import Path
import re
import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md

SOURCE_PAGE = "https://www.uscourts.gov/administration-policies/judiciary-policies/ethics-policies/code-conduct-united-states-judges"
SOURCE_PDF = "https://www.uscourts.gov/file/25752/download"
OUT = Path("_conduct/judges")
REVISION = "March 12, 2019"

SECTIONS = [
    ("Introduction", "introduction.md", 10, "Code of Conduct for United States Judges, Introduction", 1200),
    ("Canon 1:", "canon-1.md", 20, "Code of Conduct for United States Judges, Canon 1", 1800),
    ("Canon 2:", "canon-2.md", 30, "Code of Conduct for United States Judges, Canon 2", 4500),
    ("Canon 3:", "canon-3.md", 40, "Code of Conduct for United States Judges, Canon 3", 12000),
    ("Canon 4:", "canon-4.md", 50, "Code of Conduct for United States Judges, Canon 4", 10000),
    ("Canon 5:", "canon-5.md", 60, "Code of Conduct for United States Judges, Canon 5", 900),
    ("Compliance with the Code of Conduct", "compliance.md", 70, "Code of Conduct for United States Judges, Compliance", 2200),
    ("Applicable Date of Compliance", "applicable-date.md", 80, "Code of Conduct for United States Judges, Applicable Date of Compliance", 450),
]

CANON_TITLES = {
    "canon-1.md": "Canon 1: A Judge Should Uphold the Integrity and Independence of the Judiciary",
    "canon-2.md": "Canon 2: A Judge Should Avoid Impropriety and the Appearance of Impropriety in All Activities",
    "canon-3.md": "Canon 3: A Judge Should Perform the Duties of the Office Fairly, Impartially and Diligently",
    "canon-4.md": "Canon 4: A Judge May Engage in Extrajudicial Activities That Are Consistent With the Obligations of Judicial Office",
    "canon-5.md": "Canon 5: A Judge Should Refrain From Political Activity",
    "introduction.md": "Introduction",
    "compliance.md": "Compliance with the Code of Conduct",
    "applicable-date.md": "Applicable Date of Compliance",
}

def marker_text(line: str) -> str:
    line = re.sub(r"^\s*#{1,6}\s*", "", line).strip()
    line = re.sub(r"\s+", " ", line)
    return line

def matches(line: str, marker: str) -> bool:
    text = marker_text(line)
    return text.startswith(marker) if marker.endswith(":") else text == marker

def yaml_quote(value: str) -> str:
    return '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'

def main():
    response = requests.get(SOURCE_PAGE, timeout=45, headers={"User-Agent": "USAR-Courts-Code-Sync/1.0"})
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    main_el = soup.find("main") or soup
    rendered = md(str(main_el), heading_style="ATX", bullets="-")
    lines = rendered.splitlines()

    starts = []
    cursor = 0
    for marker, *_ in SECTIONS:
        found = None
        for i in range(cursor, len(lines)):
            if matches(lines[i], marker):
                found = i
                break
        if found is None:
            raise RuntimeError(f"Could not locate section marker: {marker}")
        starts.append(found)
        cursor = found + 1

    OUT.mkdir(parents=True, exist_ok=True)
    expected = set()
    for idx, (marker, filename, order, citation, min_chars) in enumerate(SECTIONS):
        expected.add(filename)
        begin = starts[idx] + 1
        end = starts[idx + 1] if idx + 1 < len(starts) else len(lines)
        body = "\n".join(lines[begin:end]).strip()
        body = re.sub(r"(?m)^\s*COMMENTARY\s*$", "## Commentary", body)
        body = re.sub(r"\n{3,}", "\n\n", body).strip()
        if len(body) < min_chars:
            raise RuntimeError(f"Section {marker} is unexpectedly short ({len(body)} chars)")

        title = CANON_TITLES[filename]
        front = "\n".join([
            "---",
            f"title: {yaml_quote(title)}",
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

    print("Generated:")
    for path in sorted(OUT.glob("*.md")):
        print(f"  {path} ({path.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
