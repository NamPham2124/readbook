import sqlite3
import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from readbook.config import DEFAULT_DB_PATH, ensure_app_dirs
from readbook.database.models import Book, Note, Bookmark, Highlight

class DatabaseManager:
    """Manages SQLite database connections and queries for ReadBook."""

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH):
        self.db_path = str(db_path)
        self._memory_conn: Optional[sqlite3.Connection] = None

        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        else:
            # Keep a persistent connection for in-memory database
            self._memory_conn = sqlite3.connect(":memory:")
            self._memory_conn.row_factory = sqlite3.Row
            self._memory_conn.execute("PRAGMA foreign_keys = ON")

        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        if self._memory_conn is not None:
            return self._memory_conn
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def init_db(self) -> None:
        """Initialize database schema if not exists."""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.executescript("""
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            total_pages INTEGER DEFAULT 1,
            last_page INTEGER DEFAULT 1,
            last_opened TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            page INTEGER NOT NULL,
            content TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
            UNIQUE (book_id, page)
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            page INTEGER NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS highlights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            page INTEGER NOT NULL,
            selected_text TEXT NOT NULL,
            coordinates TEXT NOT NULL,
            color TEXT DEFAULT '#FFEB3B',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_books_path ON books (path);
        CREATE INDEX IF NOT EXISTS idx_notes_book_page ON notes (book_id, page);
        CREATE INDEX IF NOT EXISTS idx_bookmarks_book ON bookmarks (book_id);
        CREATE INDEX IF NOT EXISTS idx_highlights_book_page ON highlights (book_id, page);
        """)
        conn.commit()
        if self._memory_conn is None:
            conn.close()

    # --- Books Operations ---

    def upsert_book(self, path: str, title: str, category: str, total_pages: int) -> Book:
        now_str = datetime.datetime.now().isoformat()
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, last_page, last_opened, created_at FROM books WHERE path = ?", (path,))
            row = cursor.fetchone()
            if row:
                book_id = row["id"]
                last_page = row["last_page"]
                last_opened = row["last_opened"]
                created_at = row["created_at"]
                cursor.execute("""
                    UPDATE books
                    SET title = ?, category = ?, total_pages = ?
                    WHERE id = ?
                """, (title, category, total_pages, book_id))
            else:
                cursor.execute("""
                    INSERT INTO books (path, title, category, total_pages, last_page, last_opened, created_at)
                    VALUES (?, ?, ?, ?, 1, NULL, ?)
                """, (path, title, category, total_pages, now_str))
                book_id = cursor.lastrowid
                last_page = 1
                last_opened = None
                created_at = now_str
            conn.commit()
            return Book(
                id=book_id,
                path=path,
                title=title,
                category=category,
                total_pages=total_pages,
                last_page=last_page,
                last_opened=last_opened,
                created_at=created_at
            )
        finally:
            if self._memory_conn is None:
                conn.close()

    def get_book_by_id(self, book_id: int) -> Optional[Book]:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM books WHERE id = ?", (book_id,))
            row = cursor.fetchone()
            if row:
                return Book(**dict(row))
        finally:
            if self._memory_conn is None:
                conn.close()
        return None

    def get_book_by_path(self, path: str) -> Optional[Book]:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM books WHERE path = ?", (path,))
            row = cursor.fetchone()
            if row:
                return Book(**dict(row))
        finally:
            if self._memory_conn is None:
                conn.close()
        return None

    def get_all_books(self, search_query: str = "", category: str = "") -> List[Book]:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            query = "SELECT * FROM books WHERE 1=1"
            params = []
            if search_query:
                query += " AND (title LIKE ? OR path LIKE ?)"
                params.extend([f"%{search_query}%", f"%{search_query}%"])
            if category and category != "All":
                query += " AND category = ?"
                params.append(category)
            query += " ORDER BY CASE WHEN last_opened IS NULL THEN 1 ELSE 0 END, last_opened DESC, title ASC"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [Book(**dict(r)) for r in rows]
        finally:
            if self._memory_conn is None:
                conn.close()

    def get_categories(self) -> List[str]:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT category FROM books ORDER BY category ASC")
            rows = cursor.fetchall()
            return [r["category"] for r in rows if r["category"]]
        finally:
            if self._memory_conn is None:
                conn.close()

    def update_last_page(self, book_id: int, page: int) -> None:
        now_str = datetime.datetime.now().isoformat()
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE books
                SET last_page = ?, last_opened = ?
                WHERE id = ?
            """, (page, now_str, book_id))
            conn.commit()
        finally:
            if self._memory_conn is None:
                conn.close()

    def delete_book(self, book_id: int) -> None:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM books WHERE id = ?", (book_id,))
            conn.commit()
        finally:
            if self._memory_conn is None:
                conn.close()

    def cleanup_missing_books(self, existing_paths: List[str]) -> None:
        """Remove database records for book files that have been deleted from disk."""
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, path FROM books")
            rows = cursor.fetchall()
            existing_set = set(existing_paths)
            for row in rows:
                if row["path"] not in existing_set:
                    cursor.execute("DELETE FROM books WHERE id = ?", (row["id"],))
            conn.commit()
        finally:
            if self._memory_conn is None:
                conn.close()

    # --- Notes Operations ---

    def get_note(self, book_id: int, page: int) -> Optional[Note]:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notes WHERE book_id = ? AND page = ?", (book_id, page))
            row = cursor.fetchone()
            if row:
                return Note(**dict(row))
        finally:
            if self._memory_conn is None:
                conn.close()
        return None

    def save_note(self, book_id: int, page: int, content: str) -> None:
        now_str = datetime.datetime.now().isoformat()
        content = content.strip()
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            if not content:
                cursor.execute("DELETE FROM notes WHERE book_id = ? AND page = ?", (book_id, page))
            else:
                cursor.execute("""
                    INSERT INTO notes (book_id, page, content, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(book_id, page) DO UPDATE SET
                        content = excluded.content,
                        updated_at = excluded.updated_at
                """, (book_id, page, content, now_str))
            conn.commit()
        finally:
            if self._memory_conn is None:
                conn.close()

    def get_notes_for_book(self, book_id: int) -> List[Note]:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM notes WHERE book_id = ? ORDER BY page ASC", (book_id,))
            rows = cursor.fetchall()
            return [Note(**dict(r)) for r in rows]
        finally:
            if self._memory_conn is None:
                conn.close()

    # --- Bookmarks / Tags Operations ---

    def add_bookmark(self, book_id: int, page: int, name: str) -> Bookmark:
        now_str = datetime.datetime.now().isoformat()
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO bookmarks (book_id, page, name, created_at)
                VALUES (?, ?, ?, ?)
            """, (book_id, page, name.strip(), now_str))
            bookmark_id = cursor.lastrowid
            conn.commit()
            return Bookmark(
                id=bookmark_id,
                book_id=book_id,
                page=page,
                name=name.strip(),
                created_at=now_str
            )
        finally:
            if self._memory_conn is None:
                conn.close()

    def get_bookmarks(self, book_id: int) -> List[Bookmark]:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM bookmarks WHERE book_id = ? ORDER BY page ASC, created_at ASC", (book_id,))
            rows = cursor.fetchall()
            return [Bookmark(**dict(r)) for r in rows]
        finally:
            if self._memory_conn is None:
                conn.close()

    def delete_bookmark(self, bookmark_id: int) -> None:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM bookmarks WHERE id = ?", (bookmark_id,))
            conn.commit()
        finally:
            if self._memory_conn is None:
                conn.close()

    # --- Highlights Operations ---

    def add_highlight(
        self,
        book_id: int,
        page: int,
        selected_text: str,
        coordinates: str,
        color: str = "#FFEB3B"
    ) -> Highlight:
        now_str = datetime.datetime.now().isoformat()
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO highlights (book_id, page, selected_text, coordinates, color, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (book_id, page, selected_text.strip(), coordinates, color, now_str))
            hl_id = cursor.lastrowid
            conn.commit()
            return Highlight(
                id=hl_id,
                book_id=book_id,
                page=page,
                selected_text=selected_text.strip(),
                coordinates=coordinates,
                color=color,
                created_at=now_str
            )
        finally:
            if self._memory_conn is None:
                conn.close()

    def get_highlights(self, book_id: int, page: Optional[int] = None) -> List[Highlight]:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            if page is not None:
                cursor.execute("""
                    SELECT * FROM highlights
                    WHERE book_id = ? AND page = ?
                    ORDER BY id ASC
                """, (book_id, page))
            else:
                cursor.execute("""
                    SELECT * FROM highlights
                    WHERE book_id = ?
                    ORDER BY page ASC, id ASC
                """, (book_id,))
            rows = cursor.fetchall()
            return [Highlight(**dict(r)) for r in rows]
        finally:
            if self._memory_conn is None:
                conn.close()

    def delete_highlight(self, highlight_id: int) -> None:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM highlights WHERE id = ?", (highlight_id,))
            conn.commit()
        finally:
            if self._memory_conn is None:
                conn.close()

    # --- Settings Operations ---

    def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            if row:
                return row["value"]
        finally:
            if self._memory_conn is None:
                conn.close()
        return default

    def set_setting(self, key: str, value: str) -> None:
        conn = self.get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO settings (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """, (key, value))
            conn.commit()
        finally:
            if self._memory_conn is None:
                conn.close()
