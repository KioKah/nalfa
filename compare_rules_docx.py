from __future__ import annotations

import argparse
import difflib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def normalize_text(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def paragraph_text(paragraph: ET.Element) -> str:
    pieces: list[str] = []
    for node in paragraph.iter():
        tag = node.tag.rsplit("}", 1)[-1]
        if tag in {"t", "delText"} and node.text:
            pieces.append(node.text)
        elif tag == "tab":
            pieces.append("\t")
        elif tag in {"br", "cr"}:
            pieces.append("\n")
    return normalize_text("".join(pieces))


def cell_text(cell: ET.Element) -> str:
    parts: list[str] = []
    for child in cell:
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            text = paragraph_text(child)
            if text:
                parts.append(text)
        elif tag == "tbl":
            nested = table_lines(child)
            if nested:
                parts.append(" / ".join(nested))
    return normalize_text(" | ".join(parts))


def table_lines(table: ET.Element) -> list[str]:
    lines: list[str] = []
    for row in table.findall("w:tr", NS):
        cells = [cell_text(cell) for cell in row.findall("w:tc", NS)]
        if any(cells):
            lines.append("TABLE | " + " || ".join(cells))
    return lines


def extract_docx(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as docx:
        xml = docx.read("word/document.xml")

    root = ET.fromstring(xml)
    body = root.find("w:body", NS)
    if body is None:
        return []

    lines: list[str] = []
    for child in body:
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "p":
            text = paragraph_text(child)
            if text:
                lines.append(text)
        elif tag == "tbl":
            lines.extend(table_lines(child))
    return lines


def write_lines(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def grouped_changes(old: list[str], new: list[str]) -> list[dict[str, object]]:
    matcher = difflib.SequenceMatcher(a=old, b=new, autojunk=False)
    changes: list[dict[str, object]] = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        changes.append(
            {
                "tag": tag,
                "old_start": i1 + 1,
                "old_end": i2,
                "new_start": j1 + 1,
                "new_end": j2,
                "old": old[i1:i2],
                "new": new[j1:j2],
            }
        )
    return changes


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("old_docx", type=Path)
    parser.add_argument("new_docx", type=Path)
    parser.add_argument("--out", type=Path, default=Path("rules_diff_1_2_0"))
    args = parser.parse_args()

    args.out.mkdir(exist_ok=True)
    old_lines = extract_docx(args.old_docx)
    new_lines = extract_docx(args.new_docx)

    old_txt = args.out / "Nalfa Regles 1.1.0 extracted.txt"
    new_txt = args.out / "Nalfa Regles 1.2.0 extracted.txt"
    write_lines(old_txt, old_lines)
    write_lines(new_txt, new_lines)

    diff = difflib.unified_diff(
        old_lines,
        new_lines,
        fromfile=str(args.old_docx),
        tofile=str(args.new_docx),
        lineterm="",
    )
    write_lines(args.out / "unified.diff", list(diff))

    changes = grouped_changes(old_lines, new_lines)
    (args.out / "changes.json").write_text(
        json.dumps(changes, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    summary = [
        f"Old lines: {len(old_lines)}",
        f"New lines: {len(new_lines)}",
        f"Change groups: {len(changes)}",
        "",
    ]
    for index, change in enumerate(changes, start=1):
        summary.append(
            f"## Change {index}: {change['tag']} "
            f"old {change['old_start']}-{change['old_end']} "
            f"new {change['new_start']}-{change['new_end']}"
        )
        old_block = change["old"]
        new_block = change["new"]
        if old_block:
            summary.append("OLD:")
            summary.extend(f"- {line}" for line in old_block)  # type: ignore[union-attr]
        if new_block:
            summary.append("NEW:")
            summary.extend(f"+ {line}" for line in new_block)  # type: ignore[union-attr]
        summary.append("")
    write_lines(args.out / "changes.md", summary)

    print(f"Wrote {args.out}")
    print(f"Old lines: {len(old_lines)}")
    print(f"New lines: {len(new_lines)}")
    print(f"Change groups: {len(changes)}")


if __name__ == "__main__":
    main()
