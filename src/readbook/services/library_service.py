import os
from pathlib import Path
from typing import List, Optional
from readbook.database.db import DatabaseManager
from readbook.database.models import Book
from readbook.utils.paths import expand_path, get_relative_category
from readbook.utils.pdf_utils import get_pdf_info
from readbook.config import DEFAULT_BOOKS_DIR, SUPPORTED_EXTENSIONS

class LibraryService:
    """Service to scan, manage, and query books in the local library."""

    def __init__(self, db: DatabaseManager, books_dir: Optional[Path | str] = None):
        self.db = db
        if books_dir is not None:
            self.books_dir = expand_path(books_dir)
        else:
            saved_dir = self.db.get_setting("books_dir")
            # If saved_dir points to old ~/books and ~/Book exists, switch to ~/Book
            if saved_dir and Path(saved_dir).name.lower() == "books" and DEFAULT_BOOKS_DIR.exists():
                self.books_dir = DEFAULT_BOOKS_DIR
                self.db.set_setting("books_dir", str(self.books_dir))
            elif saved_dir:
                self.books_dir = expand_path(saved_dir)
            else:
                self.books_dir = DEFAULT_BOOKS_DIR

    def set_books_dir(self, books_dir: Path | str) -> None:
        self.books_dir = expand_path(books_dir)
        self.db.set_setting("books_dir", str(self.books_dir))

    def get_books_dir(self) -> Path:
        return self.books_dir

    def scan_library(self) -> List[Book]:
        """
        Recursively scan books_dir for all supported book files (PDF, EPUB, etc.).
        Extract metadata and upsert into database.
        Returns list of all active books.
        """
        if not self.books_dir.exists():
            self.books_dir.mkdir(parents=True, exist_ok=True)
            return []

        book_files: List[Path] = []
        for root, _, files in os.walk(self.books_dir):
            for file in files:
                ext = Path(file).suffix.lower()
                if ext in SUPPORTED_EXTENSIONS:
                    book_files.append(Path(root) / file)

        # Upsert each found book
        found_paths: List[str] = []
        for book_path in book_files:
            abs_path = str(book_path.resolve())
            found_paths.append(abs_path)
            category = get_relative_category(book_path, self.books_dir)
            try:
                info = get_pdf_info(book_path)
                raw_title = (info["title"] or "").strip()
                # Clean up if raw_title is unhelpful (like .dvi or empty)
                if not raw_title or raw_title.endswith(".dvi") or len(raw_title) < 2:
                    title = book_path.stem
                else:
                    title = raw_title
                total_pages = info["total_pages"]
            except Exception:
                title = book_path.stem
                total_pages = 1

            self.db.upsert_book(
                path=abs_path,
                title=title,
                category=category,
                total_pages=total_pages
            )

        # Cleanup deleted books from database
        self.db.cleanup_missing_books(found_paths)

        return self.db.get_all_books()

    def get_all_books(self, search_query: str = "", category: str = "") -> List[Book]:
        return self.db.get_all_books(search_query, category)

    def get_categories(self) -> List[str]:
        return self.db.get_categories()

    def get_book_by_id(self, book_id: int) -> Optional[Book]:
        return self.db.get_book_by_id(book_id)

    def get_book_by_path(self, path: str) -> Optional[Book]:
        return self.db.get_book_by_path(path)

    def update_last_page(self, book_id: int, page: int) -> None:
        self.db.update_last_page(book_id, page)
