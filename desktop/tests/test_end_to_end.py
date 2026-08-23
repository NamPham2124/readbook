import hashlib
from pathlib import Path
import pymupdf
import pytest

from readbook.database.db import DatabaseManager
from readbook.services.library_service import LibraryService
from readbook.services.annotation_service import AnnotationService
from readbook.services.reader_service import ReaderService

def get_file_hash(path: Path) -> str:
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        hasher.update(f.read())
    return hasher.hexdigest()

def create_multi_page_pdf(path: Path, title: str, pages_count: int = 25):
    doc = pymupdf.open()
    for i in range(pages_count):
        p = doc.new_page(width=595, height=842)
        p.insert_text((50, 50), f"{title} - Page {i+1}")
        if i + 1 == 10:
            p.insert_text((50, 150), "Attention mechanism is a crucial concept in modern deep learning models.")
    doc.set_metadata({"title": title})
    doc.save(str(path))
    doc.close()

def test_full_user_flow_and_definition_of_done(tmp_path, qapp):
    """
    Test the exact user workflow specified in prompt:
    1. Scan books directory containing book1.pdf and book2.pdf.
    2. Open book1.
    3. Navigate to page 10.
    4. Write note on page 10.
    5. Highlight text on page 10.
    6. Create tag 'Important' on page 10.
    7. Close app / reader.
    8. Reopen book1 and verify:
       - Automatically returns to page 10.
       - Note on page 10 is present and unchanged.
       - Highlight on page 10 is present with correct color and coordinates.
       - Tag 'Important' is present pointing to page 10.
       - Original PDF file has NOT been modified (SHA256 identical).
    """
    books_dir = tmp_path / "books"
    books_dir.mkdir()

    book1_path = books_dir / "book1.pdf"
    book2_path = books_dir / "book2.pdf"

    create_multi_page_pdf(book1_path, "Deep Learning Book", 25)
    create_multi_page_pdf(book2_path, "Robotics SLAM", 30)

    initial_book1_hash = get_file_hash(book1_path)
    initial_book2_hash = get_file_hash(book2_path)

    db_path = tmp_path / "test_readbook.db"

    # === SESSION 1: Open app, read, annotate ===
    db1 = DatabaseManager(db_path)
    lib_svc1 = LibraryService(db1, books_dir=books_dir)
    ann_svc1 = AnnotationService(db1)
    reader1 = ReaderService()

    # 1. Scan books
    scanned_books = lib_svc1.scan_library()
    assert len(scanned_books) == 2
    book1 = lib_svc1.get_book_by_path(str(book1_path))
    assert book1 is not None
    assert book1.last_page == 1

    # 2. Open book1
    reader1.open_book(book1.path)
    assert reader1.get_page_count() == 25

    # 3. Navigate to page 10
    lib_svc1.update_last_page(book1.id, 10)

    # 4. Write note on page 10
    note_text = "Attention mechanism giup model tap trung vao cac token quan trong."
    ann_svc1.save_note(book1.id, 10, note_text)

    # 5. Highlight text on page 10
    hl_coords = [{"x0": 50.0, "y0": 150.0, "x1": 350.0, "y1": 170.0}]
    ann_svc1.add_highlight(
        book_id=book1.id,
        page=10,
        selected_text="Attention mechanism is a crucial concept",
        coordinates=hl_coords,
        color="#FFE082"
    )

    # 6. Create tag 'Important' on page 10
    ann_svc1.add_bookmark(book1.id, 10, "Important")

    # 7. Close reader and app
    reader1.close()

    # Verify source PDF files were NEVER modified
    assert get_file_hash(book1_path) == initial_book1_hash
    assert get_file_hash(book2_path) == initial_book2_hash

    # === SESSION 2: Re-open app, verify all state is restored ===
    db2 = DatabaseManager(db_path)
    lib_svc2 = LibraryService(db2, books_dir=books_dir)
    ann_svc2 = AnnotationService(db2)
    reader2 = ReaderService()

    reopened_books = lib_svc2.scan_library()
    book1_reopened = lib_svc2.get_book_by_path(str(book1_path))

    # 8. Check restored state:
    # A. Last page restored to 10
    assert book1_reopened.last_page == 10
    reader2.open_book(book1_reopened.path)

    # B. Note on page 10 is present
    loaded_note = ann_svc2.get_note(book1_reopened.id, 10)
    assert loaded_note == note_text

    # Page 9 and Page 11 notes are empty
    assert ann_svc2.get_note(book1_reopened.id, 9) == ""
    assert ann_svc2.get_note(book1_reopened.id, 11) == ""

    # C. Highlight on page 10 is present
    page10_highlights = ann_svc2.get_highlights(book1_reopened.id, page=10)
    assert len(page10_highlights) == 1
    assert page10_highlights[0].selected_text == "Attention mechanism is a crucial concept"
    assert page10_highlights[0].color == "#FFE082"
    assert page10_highlights[0].parsed_coordinates() == hl_coords

    # D. Tag 'Important' is present
    bookmarks = ann_svc2.get_bookmarks(book1_reopened.id)
    assert len(bookmarks) == 1
    assert bookmarks[0].name == "Important"
    assert bookmarks[0].page == 10

    # Clean up
    reader2.close()

    # Source files remain untouched
    assert get_file_hash(book1_path) == initial_book1_hash
    assert get_file_hash(book2_path) == initial_book2_hash
