import json
from typing import Optional, List, Dict, Any
from readbook.database.db import DatabaseManager
from readbook.database.models import Note, Bookmark, Highlight

class AnnotationService:
    """Service to handle notes, tags/bookmarks, and highlights."""

    def __init__(self, db: DatabaseManager):
        self.db = db

    # --- Notes ---

    def get_note(self, book_id: int, page: int) -> Optional[str]:
        note = self.db.get_note(book_id, page)
        return note.content if note else ""

    def save_note(self, book_id: int, page: int, content: str) -> None:
        self.db.save_note(book_id, page, content)

    def get_notes_for_book(self, book_id: int) -> List[Note]:
        return self.db.get_notes_for_book(book_id)

    # --- Bookmarks / Tags ---

    def add_bookmark(self, book_id: int, page: int, name: str) -> Bookmark:
        return self.db.add_bookmark(book_id, page, name)

    def get_bookmarks(self, book_id: int) -> List[Bookmark]:
        return self.db.get_bookmarks(book_id)

    def delete_bookmark(self, bookmark_id: int) -> None:
        self.db.delete_bookmark(bookmark_id)

    # --- Highlights ---

    def add_highlight(
        self,
        book_id: int,
        page: int,
        selected_text: str,
        coordinates: List[Dict[str, float]],
        color: str = "#FFEB3B"
    ) -> Highlight:
        coords_json = json.dumps(coordinates)
        return self.db.add_highlight(book_id, page, selected_text, coords_json, color)

    def get_highlights(self, book_id: int, page: Optional[int] = None) -> List[Highlight]:
        return self.db.get_highlights(book_id, page)

    def delete_highlight(self, highlight_id: int) -> None:
        self.db.delete_highlight(highlight_id)
