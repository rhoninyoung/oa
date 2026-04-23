"""
pytest tests for docx-extract.
Covers: DT-DOCX-01, DT-DOCX-02
"""

import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
import shutil
import tempfile

import pytest

from extract import extract_images


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_minimal_docx(tmp_dir: Path, num_images: int = 3) -> Path:
    """
    Create a minimal .docx with `num_images` images in word/media/
    and a document.xml that references them in order.
    """
    docx_path = tmp_dir / "fixture.docx"

    # Build word/media/ image files (1×1 transparent PNG)
    # Minimal valid PNG (1×1 transparent)
    PNG_1x1 = (
        b"\x89PNG\r\n\x1a\n"
        b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08"
        b"\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc"
        b"\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    media_dir = tmp_dir / "word" / "media"
    media_dir.mkdir(parents=True)
    media_files = []
    for i in range(num_images):
        p = media_dir / f"image{i+1}.png"
        p.write_bytes(PNG_1x1)
        media_files.append(f"media/image{i+1}.png")

    # Build document.xml that references images in order
    # We use wp:inline with blip -> r:embed="rId{i}"
    doc_lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
        ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"'
        ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<w:body>',
    ]

    for i in range(num_images):
        rid = f"rId{i+1}"
        doc_lines.append(
            f'<w:p>'
            f'<w:r><w:drawing>'
            f'<wp:inline distT="0" distB="0" distL="0" distR="0">'
            f'<wp:extent cx="914400" cy="914400"/>'
            f'<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            f'<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            f'<pic:blipFill><a:blip r:embed="{rid}"/></pic:blipFill>'
            f'</pic:pic></a:graphicData></a:graphic>'
            f'</wp:inline></w:drawing></w:r></w:p>'
        )

    doc_lines.append('</w:body></w:document>')
    document_xml = "\n".join(doc_lines).encode("utf-8")

    # Build _rels/document.xml.rels
    rels_lines = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
    ]
    for i, mf in enumerate(media_files, 1):
        rels_lines.append(
            f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="{mf}"/>'
        )
    rels_lines.append('</Relationships>')
    rels_xml = "\n".join(rels_lines).encode("utf-8")

    # Build [Content_Types].xml
    ct_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="png" ContentType="image/png"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '</Types>'
    ).encode("utf-8")

    with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("word/media/image1.png", PNG_1x1)
        if num_images > 1:
            for mf in media_files[1:]:
                zf.writestr(f"word/{mf}", PNG_1x1)
        zf.writestr("word/document.xml", document_xml)
        zf.writestr("word/_rels/document.xml.rels", rels_xml)
        zf.writestr("[Content_Types].xml", ct_xml)

    return docx_path


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestExtractImages:
    """DT-DOCX-01: fixture with N images → N pngs + N index entries"""

    def test_three_images_produces_three_files(self, tmp_path: Path):
        docx = make_minimal_docx(tmp_path, num_images=3)
        out_dir = tmp_path / "ui-ref"
        index = extract_images(docx, out_dir)

        assert len(index) == 3
        assert all(e["file"].endswith(".png") for e in index)

        written_pngs = list(out_dir.glob("*.png"))
        assert len(written_pngs) == 3

    def test_index_order_matches_document_order(self, tmp_path: Path):
        docx = make_minimal_docx(tmp_path, num_images=3)
        out_dir = tmp_path / "ui-ref"
        index = extract_images(docx, out_dir)

        # Order must be sequential 1, 2, 3
        orders = [e["order"] for e in index]
        assert orders == [1, 2, 3]

    def test_section_path_absent_for_no_heading_fixture(self, tmp_path: Path):
        """DT-DOCX-02: no headings in fixture → section_path is empty list"""
        docx = make_minimal_docx(tmp_path, num_images=2)
        out_dir = tmp_path / "ui-ref"
        index = extract_images(docx, out_dir)

        for entry in index:
            assert entry["section_path"] == []
