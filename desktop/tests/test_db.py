import pytest
import sqlite3
from readbook.database.db import DatabaseManager

@pytest.fixture
def db():
    manager = DatabaseManager(":memory:")
    return manager

def test_init_db(db):
    books = db.get_all_books()
    assert books == []

def test_books_crud(db):
    b1 = db.upsert_book("/path/to/book1.pdf", "Book 1", "AI", 100)
    assert b1.id is not None
    assert b1.title == "Book 1"
    assert b1.category == "AI"
    assert b1.total_pages == 100
    assert b1.last_page == 1

    # Update last page
    db.update_last_page(b1.id, 42)
    b1_updated = db.get_book_by_id(b1.id)
    assert b1_updated.last_page == 42
    assert b1_updated.last_opened is not None

    # Upsert existing book should preserve last_page and last_opened
    b1_again = db.upsert_book("/path/to/book1.pdf", "Book 1 Updated", "AI", 105)
    assert b1_again.id == b1.id
    assert b1_again.title == "Book 1 Updated"
    assert b1_again.last_page == 42

    # Query all
    b2 = db.upsert_book("/path/to/book2.pdf", "Clean Code", "Programming", 300)
    all_books = db.get_all_books()
    assert len(all_books) == 2

    # Filter category
    ai_books = db.get_all_books(category="AI")
    assert len(ai_books) == 1
    assert ai_books[0].id == b1.id

    # Filter search
    search_books = db.get_all_books(search_query="Clean")
    assert len(search_books) == 1
    assert search_books[0].id == b2.id

    # Categories list
    cats = db.get_categories()
    assert sorted(cats) == ["AI", "Programming"]

def test_notes_crud(db):
    b = db.upsert_book("/path/to/book.pdf", "Title", "Cat", 50)
    
    # Save note
    db.save_note(b.id, 10, "Note for page 10")
    note = db.get_note(b.id, 10)
    assert note is not None
    assert note.content == "Note for page 10"

    # Update note
    db.save_note(b.id, 10, "Updated note for page 10")
    note2 = db.get_note(b.id, 10)
    assert note2.content == "Updated note for page 10"

    # Clear note
    db.save_note(b.id, 10, "")
    assert db.get_note(b.id, 10) is None

def test_bookmarks_crud(db):
    b = db.upsert_book("/path/to/book.pdf", "Title", "Cat", 50)
    
    bm1 = db.add_bookmark(b.id, 42, "Attention mechanism")
    assert bm1.id is not None
    assert bm1.name == "Attention mechanism"
    assert bm1.page == 42

    bm2 = db.add_bookmark(b.id, 67, "Transformer")

    bookmarks = db.get_bookmarks(b.id)
    assert len(bookmarks) == 2
    assert bookmarks[0].page == 42
    assert bookmarks[1].page == 67

    db.delete_bookmark(bm1.id)
    bookmarks_after = db.get_bookmarks(b.id)
    assert len(bookmarks_after) == 1
    assert bookmarks_after[0].id == bm2.id

def test_highlights_crud(db):
    b = db.upsert_book("/path/to/book.pdf", "Title", "Cat", 50)
    
    coords = '[{"x0": 10.0, "y0": 20.0, "x1": 100.0, "y1": 30.0}]'
    hl1 = db.add_highlight(b.id, 10, "highlighted text", coords, "#FFE082")
    assert hl1.id is not None
    assert hl1.page == 10
    assert hl1.selected_text == "highlighted text"
    assert hl1.color == "#FFE082"
    assert len(hl1.parsed_coordinates()) == 1

    # Query by page
    hls_p10 = db.get_highlights(b.id, page=10)
    assert len(hls_p10) == 1

    hls_p11 = db.get_highlights(b.id, page=11)
    assert len(hls_p11) == 0

    # Query all
    hl2 = db.add_highlight(b.id, 15, "second highlight", coords, "#A5D6A7")
    all_hls = db.get_highlights(b.id)
    assert len(all_hls) == 2

    # Delete
    db.delete_highlight(hl1.id)
    assert len(db.get_highlights(b.id, page=10)) == 0
    assert len(db.get_highlights(b.id)) == 1

def test_settings_crud(db):
    assert db.get_setting("custom_key", "default_val") == "default_val"
    db.set_setting("custom_key", "saved_val")
    assert db.get_setting("custom_key") == "saved_val"
