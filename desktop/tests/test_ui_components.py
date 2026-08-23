import pytest
from pathlib import Path
import pymupdf
from PySide6.QtCore import Qt

from readbook.database.db import DatabaseManager
from readbook.services.library_service import LibraryService
from readbook.services.annotation_service import AnnotationService
from readbook.services.reader_service import ReaderService
from readbook.ui.main_window import MainWindow
from readbook.ui.library_view import LibraryView
from readbook.ui.reader_view import ReaderView

def create_sample_pdf(path: Path, title: str = "Test Book", pages: int = 15):
    doc = pymupdf.open()
    for i in range(pages):
        p = doc.new_page(width=595, height=842)
        p.insert_text((50, 50), f"{title} - Page {i+1}")
        p.insert_text((50, 100), "Sample text content for testing text selection and highlighting.")
    doc.set_metadata({"title": title})
    doc.save(str(path))
    doc.close()

def test_main_window_and_views_integration(tmp_path, qapp):
    books_dir = tmp_path / "books"
    books_dir.mkdir()
    pdf1 = books_dir / "AI_Book.pdf"
    create_sample_pdf(pdf1, "AI Book", 15)

    db_path = tmp_path / "ui_test.db"
    db = DatabaseManager(db_path)

    # Initialize MainWindow with isolated books_dir
    win = MainWindow(db, books_dir=books_dir)

    # Verify books in library
    books = win.library_service.get_all_books()
    assert len(books) == 1
    assert books[0].title == "AI Book"

    # Open book in reader view
    win.open_reader(books[0])
    assert win.reader_view.current_book is not None
    assert win.reader_view.current_page == 1
    assert win.reader_view.total_pages == 15

    # Navigate to page 5
    win.reader_view.go_to_page(5)
    assert win.reader_view.current_page == 5

    # Type a note on page 5
    win.reader_view.notes_panel.text_edit.setPlainText("Important summary of page 5")
    win.reader_view.notes_panel.save_current_note()

    # Add a tag on page 5
    win.annotation_service.add_bookmark(books[0].id, 5, "Key Theorem")
    win.reader_view.tags_panel.refresh_tags()
    assert len(win.reader_view.tags_panel.bookmarks) == 1

    # Add highlight on page 5
    hl_coords = [{"x0": 50.0, "y0": 100.0, "x1": 300.0, "y1": 115.0}]
    win.annotation_service.add_highlight(books[0].id, 5, "Sample text content", hl_coords, "#FFE082")
    win.reader_view.highlights_panel.refresh_highlights()
    assert len(win.reader_view.highlights_panel.highlights) == 1

    # Return to library
    win.show_library()
    assert win.stack.currentWidget() == win.library_view

    # Verify book last_page is 5
    reloaded_book = win.library_service.get_book_by_id(books[0].id)
    assert reloaded_book.last_page == 5

    # Re-open book and verify last page 5 is restored
    win.open_reader(reloaded_book)
    assert win.reader_view.current_page == 5
    assert win.reader_view.notes_panel.text_edit.toPlainText() == "Important summary of page 5"

    win.close()
