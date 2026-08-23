from typing import Optional
from pathlib import Path
from PySide6.QtWidgets import QMainWindow, QStackedWidget, QMessageBox
from PySide6.QtCore import Qt, QByteArray
from PySide6.QtGui import QCloseEvent, QIcon

from readbook.database.db import DatabaseManager
from readbook.database.models import Book
from readbook.services.library_service import LibraryService
from readbook.services.annotation_service import AnnotationService
from readbook.services.reader_service import ReaderService
from readbook.ui.library_view import LibraryView
from readbook.ui.reader_view import ReaderView
from readbook.ui.theme import APP_STYLESHEET

class MainWindow(QMainWindow):
    """
    Main application window managing transitions between Library and Reader.
    """

    def __init__(
        self,
        db: DatabaseManager,
        books_dir: Optional[Path | str] = None,
        initial_book_path: Optional[str] = None
    ):
        super().__init__()
        self.db = db
        self.library_service = LibraryService(db, books_dir=books_dir)
        self.annotation_service = AnnotationService(db)
        self.reader_service = ReaderService()

        self.setWindowTitle("ReadBook - My Library")
        self.resize(1150, 780)
        self.setMinimumSize(800, 550)
        self.setStyleSheet(APP_STYLESHEET)

        self._setup_ui()
        self._restore_geometry()

        # Initial scan
        self.library_view.scan_and_refresh()

        # If a book path was passed via CLI (e.g. readbook ~/books/mybook.pdf)
        if initial_book_path:
            self._open_initial_book(initial_book_path)

    def _setup_ui(self) -> None:
        self.stack = QStackedWidget()
        self.setCentralWidget(self.stack)

        # 0: Library View
        self.library_view = LibraryView(self.library_service)
        self.library_view.book_selected.connect(self.open_reader)
        self.stack.addWidget(self.library_view)

        # 1: Reader View
        self.reader_view = ReaderView(
            reader_service=self.reader_service,
            annotation_service=self.annotation_service,
            library_service=self.library_service
        )
        self.reader_view.back_to_library.connect(self.show_library)
        self.stack.addWidget(self.reader_view)

    def _open_initial_book(self, book_path: str) -> None:
        from readbook.config import SUPPORTED_EXTENSIONS
        p = Path(book_path).resolve()
        if p.exists() and p.suffix.lower() in SUPPORTED_EXTENSIONS:
            book = self.library_service.get_book_by_path(str(p))
            if not book:
                # Upsert into db
                from readbook.utils.pdf_utils import get_pdf_info
                info = get_pdf_info(p)
                raw_title = (info.get("title") or "").strip()
                title = raw_title if raw_title and not raw_title.endswith(".dvi") else p.stem
                book = self.db.upsert_book(
                    path=str(p),
                    title=title,
                    category="General",
                    total_pages=info["total_pages"]
                )
            self.open_reader(book)

    def open_reader(self, book: Book) -> None:
        self.setWindowTitle(f"{book.title} — ReadBook")
        self.reader_view.open_book(book)
        self.stack.setCurrentWidget(self.reader_view)

    def show_library(self) -> None:
        self.setWindowTitle("ReadBook — My Library")
        self.library_view.scan_and_refresh()
        self.stack.setCurrentWidget(self.library_view)

    def _restore_geometry(self) -> None:
        geo_hex = self.db.get_setting("window_geometry")
        if geo_hex:
            try:
                self.restoreGeometry(QByteArray.fromHex(geo_hex.encode("utf-8")))
            except Exception:
                pass

    def closeEvent(self, event: QCloseEvent) -> None:
        # Save geometry
        geo_hex = bytes(self.saveGeometry().toHex()).decode("utf-8")
        self.db.set_setting("window_geometry", geo_hex)

        # Flush any unsaved note
        if self.reader_view.notes_panel.is_dirty:
            self.reader_view.notes_panel.save_current_note()

        # Close PDF
        self.reader_service.close()
        super().closeEvent(event)
