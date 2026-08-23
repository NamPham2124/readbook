from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any
import pymupdf
from PySide6.QtGui import QImage, QPixmap

def get_pdf_info(file_path: Path) -> Dict[str, Any]:
    """Extract metadata, total pages and basic info from a PDF file."""
    doc = pymupdf.open(str(file_path))
    meta = doc.metadata or {}
    title = meta.get("title")
    if not title or not title.strip():
        # Fallback to filename without extension
        title = file_path.stem

    total_pages = len(doc)
    doc.close()

    return {
        "title": title.strip(),
        "author": meta.get("author", "").strip(),
        "total_pages": max(1, total_pages),
    }

def render_page_to_qimage(
    doc: pymupdf.Document,
    page_number: int,
    zoom: float = 1.0,
    rotation: int = 0
) -> Optional[QImage]:
    """
    Render a 1-indexed page from PyMuPDF document to a high-quality QImage.
    """
    page_idx = page_number - 1
    if page_idx < 0 or page_idx >= len(doc):
        return None

    page = doc[page_idx]
    matrix = pymupdf.Matrix(zoom, zoom).prerotate(rotation)
    pix = page.get_pixmap(matrix=matrix, alpha=False)

    # Convert Pixmap to QImage
    img = QImage(
        pix.samples,
        pix.width,
        pix.height,
        pix.stride,
        QImage.Format.Format_RGB888
    )
    # Return a copy to ensure memory safety after pixmap garbage collection
    return img.copy()

def render_cover_thumbnail(file_path: Path, max_width: int = 200, max_height: int = 280) -> Optional[QPixmap]:
    """Render the first page of a PDF as a thumbnail QPixmap."""
    try:
        doc = pymupdf.open(str(file_path))
        if len(doc) == 0:
            doc.close()
            return None

        page = doc[0]
        rect = page.rect
        # Calculate scale
        scale = min(max_width / rect.width, max_height / rect.height, 1.5)
        matrix = pymupdf.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=matrix, alpha=False)

        img = QImage(
            pix.samples,
            pix.width,
            pix.height,
            pix.stride,
            QImage.Format.Format_RGB888
        )
        pixmap = QPixmap.fromImage(img.copy())
        doc.close()
        return pixmap
    except Exception:
        return None

def extract_words_from_page(doc: pymupdf.Document, page_number: int) -> List[Dict[str, Any]]:
    """
    Extract word rects and text for text selection.
    Returns list of dict: [{'x0': ..., 'y0': ..., 'x1': ..., 'y1': ..., 'word': ...}]
    Coordinates in standard PDF points (independent of zoom).
    """
    page_idx = page_number - 1
    if page_idx < 0 or page_idx >= len(doc):
        return []

    page = doc[page_idx]
    # words: list of (x0, y0, x1, y1, "word", block_no, line_no, word_no)
    words = page.get_text("words")
    result = []
    for w in words:
        result.append({
            "x0": float(w[0]),
            "y0": float(w[1]),
            "x1": float(w[2]),
            "y1": float(w[3]),
            "text": str(w[4]),
            "block": int(w[5]),
            "line": int(w[6]),
            "word_idx": int(w[7]),
        })
    return result
