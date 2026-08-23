import pytest
from pathlib import Path
import pymupdf
from readbook.database.db import DatabaseManager
from readbook.services.library_service import LibraryService

def create_sample_pdf(path: Path, title: str, num_pages: int = 5):
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open()
    for i in range(num_pages):
        page = doc.new_page(width=595, height=842)
        page.insert_text((50, 50), f"{title} - Page {i+1}")
    doc.set_metadata({"title": title})
    doc.save(str(path))
    doc.close()

@pytest.fixture
def temp_library(tmp_path):
    books_dir = tmp_path / "books"
    books_dir.mkdir()

    # Create books in root and subdirectories
    create_sample_pdf(books_dir / "Deep Learning.pdf", "Deep Learning", num_pages=20)
    create_sample_pdf(books_dir / "Computer Vision.pdf", "Computer Vision", num_pages=15)
    create_sample_pdf(books_dir / "Robotics" / "SLAM.pdf", "SLAM Book", num_pages=30)
    create_sample_pdf(books_dir / "Programming" / "Clean Code.pdf", "Clean Code", num_pages=40)

    db = DatabaseManager(":memory:")
    service = LibraryService(db, books_dir=books_dir)
    return service, books_dir

def test_scan_library(temp_library):
    service, books_dir = temp_library
    books = service.scan_library()

    assert len(books) == 4
    titles = [b.title for b in books]
    assert "Deep Learning" in titles
    assert "SLAM Book" in titles

    # Categories check
    categories = service.get_categories()
    assert "Robotics" in categories
    assert "Programming" in categories
    assert "General" in categories

def test_filter_and_search(temp_library):
    service, _ = temp_library
    service.scan_library()

    # Category filter
    robotics_books = service.get_all_books(category="Robotics")
    assert len(robotics_books) == 1
    assert robotics_books[0].title == "SLAM Book"

    # Search filter
    vision_books = service.get_all_books(search_query="Vision")
    assert len(vision_books) == 1
    assert vision_books[0].title == "Computer Vision"

def test_scan_supported_formats(tmp_path):
    books_dir = tmp_path / "Book"
    books_dir.mkdir()
    create_sample_pdf(books_dir / "sample.pdf", "Sample PDF")
    
    # Create empty epub (or dummy file with epub extension)
    (books_dir / "novel.epub").write_bytes(b"dummy epub")

    db = DatabaseManager(":memory:")
    service = LibraryService(db, books_dir=books_dir)
    books = service.scan_library()
    assert len(books) == 2
    paths = [b.path for b in books]
    assert any(p.endswith(".epub") for p in paths)
    assert any(p.endswith(".pdf") for p in paths)

