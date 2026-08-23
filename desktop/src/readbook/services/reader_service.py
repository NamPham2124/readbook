from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
import pymupdf
from PySide6.QtGui import QImage
from readbook.utils.pdf_utils import render_page_to_qimage, extract_words_from_page

class ReaderService:
    """Service to handle active PDF document interaction, rendering, and text queries."""

    def __init__(self):
        self.doc: Optional[pymupdf.Document] = None
        self.current_path: Optional[str] = None
        self.total_pages: int = 0

    def open_book(self, path: str | Path) -> bool:
        """Open a PDF document. Returns True on success."""
        self.close()
        try:
            self.current_path = str(Path(path).resolve())
            self.doc = pymupdf.open(self.current_path)
            self.total_pages = max(1, len(self.doc))
            return True
        except Exception:
            self.doc = None
            self.current_path = None
            self.total_pages = 0
            return False

    def is_open(self) -> bool:
        return self.doc is not None and not self.doc.is_closed

    def get_page_count(self) -> int:
        return self.total_pages

    def get_page_rect(self, page_number: int) -> Tuple[float, float]:
        """Get (width, height) of page in PDF points."""
        if not self.is_open() or page_number < 1 or page_number > self.total_pages:
            return 595.0, 842.0
        page = self.doc[page_number - 1]
        return page.rect.width, page.rect.height

    def render_page(self, page_number: int, zoom: float = 1.0, rotation: int = 0) -> Optional[QImage]:
        if not self.is_open():
            return None
        return render_page_to_qimage(self.doc, page_number, zoom, rotation)

    def extract_words(self, page_number: int) -> List[Dict[str, Any]]:
        if not self.is_open():
            return []
        return extract_words_from_page(self.doc, page_number)

    def search_text_on_page(self, page_number: int, query: str) -> List[Dict[str, float]]:
        """Search query on page and return list of rects in PDF points."""
        if not self.is_open() or not query.strip() or page_number < 1 or page_number > self.total_pages:
            return []
        page = self.doc[page_number - 1]
        rects = page.search_for(query)
        result = []
        for r in rects:
            result.append({
                "x0": float(r.x0),
                "y0": float(r.y0),
                "x1": float(r.x1),
                "y1": float(r.y1),
            })
        return result

    def get_toc(self) -> List[Dict[str, Any]]:
        """Get Table of Contents as list of {'lvl': int, 'title': str, 'page': int}."""
        if not self.is_open():
            return []
        toc = self.doc.get_toc()
        result = []
        for item in toc:
            if len(item) >= 3:
                result.append({
                    "lvl": item[0],
                    "title": item[1],
                    "page": max(1, item[2])
                })
        return result

    def close(self) -> None:
        if self.doc is not None and not self.doc.is_closed:
            try:
                self.doc.close()
            except Exception:
                pass
        self.doc = None
        self.current_path = None
        self.total_pages = 0
