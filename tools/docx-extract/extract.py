#!/usr/bin/env python3
"""
docx-extract: 抽取 .docx 文件中的图片，按文档段落顺序建立索引。

用法:
    python extract.py OA平台项目管理需求规格说明书20260417.docx

输出:
    docs/assets/ui-ref/img01.png ... imgNN.png
    docs/assets/ui-ref/index.yaml
    docs/assets/ui-ref/README.md
"""

import sys
import zipfile
import re
import shutil
from pathlib import Path
from typing import Optional
import xml.etree.ElementTree as ET

try:
    import yaml
except ImportError:
    yaml = None  # pyyaml optional


# ── XML namespaces ─────────────────────────────────────────────────────────────

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

# ── Heading detection ──────────────────────────────────────────────────────────

HEADING_RE = re.compile(r"^(?P<level>\d+)\.\s+(?P<title>.+)$")


def _strip_tag(tag: str) -> str:
    """Remove namespace prefix from a fully-qualified tag."""
    return tag.split("}")[-1] if "}" in tag else tag


def _heading_info(para: ET.Element) -> Optional[tuple[int, str]]:
    """Return (level, text) if the paragraph looks like a Heading, else None."""
    pStyle = para.find("w:pPr/w:pStyle", NS)
    style_val = pStyle.get(f"{{{NS['w']}}}val", "") if pStyle is not None else ""
    if "Heading" in style_val or "heading" in style_val.lower():
        text = "".join(t.text or "" for t in para.iter(f"{{{NS['w']}}}t"))
        m = HEADING_RE.match(text.strip())
        if m:
            return int(m.group("level")), m.group("title")
        return None, text.strip()
    return None


# ── Core extraction ───────────────────────────────────────────────────────────

def extract_images(docx_path: Path, output_dir: Path) -> list[dict]:
    """
    Read `docx_path`, extract all images from `word/media/`, build
    `[{file, order, section_path, caption_guess}]` index ordered by
    first appearance in the document body.

    Returns the index list and writes image files to `output_dir`.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    index: list[dict] = []
    heading_stack: list[str] = []  # tracks open heading context

    with zipfile.ZipFile(docx_path) as zf:
        # ── 1. Collect all media entries ───────────────────────────────────────
        media_files = sorted(
            (n for n in zf.namelist() if n.startswith("word/media/")),
        )

        # Build embed → filename map from .rels
        rels_xml = zf.read("word/_rels/document.xml.rels")
        rels_root = ET.fromstring(rels_xml)
        embed_to_file: dict[str, str] = {}
        for rel in rels_root:
            r_id = rel.get("Id", "")
            target = rel.get("Target", "")
            if target.startswith("media/"):
                embed_to_file[r_id] = target  # e.g. "media/image1.png"

        # ── 2. Walk document.xml in order, collecting image references ─────────
        doc_xml = zf.read("word/document.xml")
        doc_root = ET.fromstring(doc_xml)

        seen_embeds: set[str] = set()
        order = 0

        for elem in doc_root.iter():
            tag = _strip_tag(elem.tag)

            # Track headings to build section_path
            if tag == "p":
                hi = _heading_info(elem)
                if hi is not None:
                    level, title = hi
                    # Pop headings of same or deeper level
                    while heading_stack and heading_stack[-1][0] >= level:
                        heading_stack.pop()
                    heading_stack.append((level, title))
                continue

            # Look for drawing references
            if tag in ("drawing", "pict"):
                # `wp:inline` or `wp:anchor` — both have `wp:docPr id`
                for child in elem.iter():
                    ctag = _strip_tag(child.tag)
                    if ctag == "docPr":
                        # The r:id lives in the parent `wp:anchor`/`wp:inline`
                        continue
                    if ctag == "blip":
                        r_embed = child.get(f"{{{NS['r']}}}embed", "")
                    elif ctag == "blipFill":
                        blip = child.find("blip", NS)
                        if blip is not None:
                            r_embed = blip.get(f"{{{NS['r']}}}embed", "")
                        else:
                            continue
                    else:
                        continue

                    if not r_embed or r_embed in seen_embeds:
                        continue

                    fname = embed_to_file.get(r_embed)
                    if not fname or fname not in media_files:
                        continue

                    seen_embeds.add(r_embed)
                    order += 1

                    src_name = Path(fname).name
                    ext = Path(src_name).suffix.lower()
                    out_name = f"img{order:02d}{ext}"
                    out_path = output_dir / out_name

                    with zf.open(fname) as src, out_path.open("wb") as dst:
                        shutil.copyfileobj(src, dst)

                    section_path = [h[1] for h in heading_stack]
                    index.append({
                        "file": out_name,
                        "order": order,
                        "section_path": section_path,
                        "caption_guess": _guess_caption(elem),
                    })

    return index


def _guess_caption(elem: ET.Element) -> str:
    """Try to extract a nearby `<w:t>` that looks like an image caption."""
    # Walk sibling paragraphs (next only) looking for "图" or "Figure"
    return ""  # Keep simple; captions are rare in source doc


def write_outputs(index: list[dict], output_dir: Path) -> None:
    """Write index.yaml and README.md."""
    # index.yaml
    yaml_path = output_dir / "index.yaml"
    with yaml_path.open("w", encoding="utf-8") as f:
        yaml.safe_dump(index, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
    print(f"[docx-extract] Wrote {yaml_path}")

    # README.md
    readme = output_dir / "README.md"
    lines = [
        "# UI 参考图索引\n",
        f"> 由 `tools/docx-extract/extract.py` 自动生成\n",
        "## 图片列表\n",
        "| # | 文件 | 章节路径 | 猜测说明 |\n",
        "|--|--|--|--|\n",
    ]
    for entry in index:
        section = " / ".join(entry["section_path"]) if entry["section_path"] else "(无标题)"
        caption = entry.get("caption_guess") or "—"
        lines.append(f"| {entry['order']} | `{entry['file']}` | {section} | {caption} |\n")

    with readme.open("w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"[docx-extract] Wrote {readme}")


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python extract.py <path-to.docx>")
        sys.exit(1)

    docx_path = Path(sys.argv[1])
    if not docx_path.exists():
        print(f"[docx-extract] ERROR: file not found: {docx_path}")
        sys.exit(1)

    # Output to repo-relative docs/assets/ui-ref/
    repo_root = Path(__file__).resolve().parents[2]
    output_dir = repo_root / "docs" / "assets" / "ui-ref"

    print(f"[docx-extract] Extracting images from {docx_path}")
    index = extract_images(docx_path, output_dir)
    print(f"[docx-extract] Extracted {len(index)} image(s)")

    if yaml:
        write_outputs(index, output_dir)
    else:
        # Fallback: write index as JSON
        json_path = output_dir / "index.json"
        import json
        with json_path.open("w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, indent=2)
        print(f"[docx-extract] Wrote {json_path} (yaml not available)")

    print("[docx-extract] Done.")


if __name__ == "__main__":
    main()
