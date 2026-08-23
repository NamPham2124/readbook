import pytest
from pathlib import Path
import pymupdf
from readbook.services.reader_service import ReaderService
from readbook.database.db import DatabaseManager
from readbook.services.annotation_service import AnnotationService

def create_sample_pdf(path: Path):
    doc = pymupdf.open()
    for i in range(12):
        page = doc.new_page(width=595, height=842)
        page.insert_text((72, 72), f"Chapter {i+1}")
        page.insert_text((72, 120), "Attention mechanism helps neural networks focus on specific inputs.")
    doc.save(str(path))
    doc.close()

def test_reader_service(tmp_path, qapp):
    pdf_path = tmp_path / "test.pdf"
    create_sample_pdf(pdf_path)

    reader = ReaderService()
    assert not reader.is_open()

    success = reader.open_book(pdf_path)
    assert success
    assert reader.is_open()
    assert reader.get_page_count() == 12

    # Rect
    w, h = reader.get_page_rect(1)
    assert w == 595.0
    assert h == 842.0

    # Words
    words = reader.extract_words(1)
    assert len(words) > 0
    words_text = [w["text"] for w in words]
    assert "Attention" in words_text
    assert "mechanism" in words_text

    # Search
    matches = reader.search_text_on_page(1, "Attention")
    assert len(matches) == 1
    assert "x0" in matches[0]

    # Render QImage
    img = reader.render_page(1, zoom=1.0)
    assert img is not None
    assert not img.isNull()
    assert img.width() == 595
    assert img.height() == 842

    reader.close()
    assert not reader.is_open()

def test_annotation_service():
    db = DatabaseManager(":memory:")
    book = db.upsert_book("/test.pdf", "Book", "General", 50)
    ann_svc = AnnotationService(db)

    # Note
    assert ann_svc.get_note(book.id, 5) == ""
    ann_svc.save_note(book.id, 5, "My Note on Page 5")
    assert ann_svc.get_note(book.id, 5) == "My Note on Page 5"

    # Tag
    bm = ann_svc.add_bookmark(book.id, 5, "Important Concept")
    assert bm.name == "Important Concept"
    assert len(ann_svc.get_bookmarks(book.id)) == 1

    # Highlight
    coords = [{"x0": 50.0, "y0": 100.0, "x1": 200.0, "y1": 120.0}]
    hl = ann_svc.add_highlight(book.id, 5, "neural networks", coords, "#FFE082")
    assert hl.selected_text == "neural networks"
    hls = ann_svc.get_highlights(book.id, page=5)
    assert len(hls) == 1
    assert hls[0].parsed_coordinates() == coords
