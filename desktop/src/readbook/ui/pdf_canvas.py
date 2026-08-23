import math
from typing import Optional, List, Dict, Any, Tuple
from PySide6.QtWidgets import (
    QWidget, QMenu, QApplication
)
from PySide6.QtGui import (
    QPainter, QColor, QPen, QBrush, QImage, QPixmap,
    QMouseEvent, QWheelEvent, QCursor, QAction, QKeySequence, QClipboard
)
from PySide6.QtCore import Qt, Signal, QRectF, QPointF
from readbook.database.models import Highlight
from readbook.ui.theme import HIGHLIGHT_COLORS

class PdfCanvas(QWidget):
    """
    High-fidelity PDF page canvas widget with smooth text selection,
    non-destructive highlight overlays, zoom handling, and interactive menus.
    """

    highlight_created = Signal(str, list, str)  # selected_text, list of rect dicts, color_hex
    highlight_deleted = Signal(int)             # highlight_id
    zoom_changed = Signal(float)
    page_navigation_requested = Signal(int)     # delta (+1 or -1)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMouseTracking(True)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)

        self.current_image: Optional[QImage] = None
        self.current_pixmap: Optional[QPixmap] = None
        self.page_rect: Tuple[float, float] = (595.0, 842.0)  # default A4
        self.zoom: float = 1.0
        self.words: List[Dict[str, Any]] = []
        self.highlights: List[Highlight] = []
        self.search_matches: List[Dict[str, float]] = []

        # Selection state
        self.is_selecting: bool = False
        self.selection_start: Optional[QPointF] = None  # in PDF points
        self.selection_end: Optional[QPointF] = None    # in PDF points
        self.selected_words: List[Dict[str, Any]] = []

    def set_page_data(
        self,
        image: Optional[QImage],
        page_rect: Tuple[float, float],
        words: List[Dict[str, Any]],
        highlights: List[Highlight],
        zoom: float = 1.0,
        search_matches: Optional[List[Dict[str, float]]] = None
    ) -> None:
        """Update canvas with new page render and metadata."""
        self.current_image = image
        self.current_pixmap = QPixmap.fromImage(image) if image else None
        self.page_rect = page_rect
        self.words = words
        self.highlights = highlights
        self.zoom = zoom
        self.search_matches = search_matches or []

        self.clear_selection()
        self.update_geometry()
        self.update()

    def update_geometry(self) -> None:
        if self.current_pixmap:
            w = self.current_pixmap.width()
            h = self.current_pixmap.height()
        else:
            w = int(self.page_rect[0] * self.zoom)
            h = int(self.page_rect[1] * self.zoom)
        self.setFixedSize(max(100, w), max(100, h))

    def clear_selection(self) -> None:
        self.is_selecting = False
        self.selection_start = None
        self.selection_end = None
        self.selected_words = []
        self.update()

    # --- Coordinate Transformations ---

    def _widget_to_pdf(self, point: QPointF) -> QPointF:
        """Convert widget coordinate to PDF point coordinate."""
        x = point.x() / self.zoom
        y = point.y() / self.zoom
        return QPointF(x, y)

    def _pdf_to_widget_rect(self, x0: float, y0: float, x1: float, y1: float) -> QRectF:
        """Convert PDF rect (points) to widget QRectF."""
        return QRectF(
            x0 * self.zoom,
            y0 * self.zoom,
            (x1 - x0) * self.zoom,
            (y1 - y0) * self.zoom
        )

    # --- Selection Detection ---

    def _update_selected_words(self) -> None:
        if not self.selection_start or not self.selection_end or not self.words:
            self.selected_words = []
            return

        p1 = self.selection_start
        p2 = self.selection_end

        # Calculate bounding box of drag in PDF coordinates
        min_x = min(p1.x(), p2.x())
        max_x = max(p1.x(), p2.x())
        min_y = min(p1.y(), p2.y())
        max_y = max(p1.y(), p2.y())

        # If drag covers multiple vertical lines vs single line
        y_diff = abs(p2.y() - p1.y())
        is_multiline = y_diff > 18  # typical line height

        selected = []
        for w in self.words:
            wx0, wy0, wx1, wy1 = w["x0"], w["y0"], w["x1"], w["y1"]
            w_mid_y = (wy0 + wy1) / 2.0
            w_mid_x = (wx0 + wx1) / 2.0

            if not is_multiline:
                # Simple box intersection
                if (min_x <= w_mid_x <= max_x or (wx0 <= max_x and wx1 >= min_x)) and \
                   (min_y <= w_mid_y <= max_y or (wy0 <= max_y and wy1 >= min_y)):
                    selected.append(w)
            else:
                # Multiline flow selection (top-to-bottom or bottom-to-top)
                start_p, end_p = (p1, p2) if p1.y() <= p2.y() else (p2, p1)
                
                # Word is between start and end y range
                if wy1 < start_p.y() - 5 or wy0 > end_p.y() + 5:
                    continue

                # Check if word is on start line
                on_start_line = abs(wy0 - start_p.y()) < 15 or (wy0 <= start_p.y() <= wy1)
                on_end_line = abs(wy1 - end_p.y()) < 15 or (wy0 <= end_p.y() <= wy1)

                if on_start_line and on_end_line:
                    if min(start_p.x(), end_p.x()) <= w_mid_x <= max(start_p.x(), end_p.x()):
                        selected.append(w)
                elif on_start_line:
                    if w_mid_x >= start_p.x():
                        selected.append(w)
                elif on_end_line:
                    if w_mid_x <= end_p.x():
                        selected.append(w)
                else:
                    # Fully in-between line
                    selected.append(w)

        self.selected_words = selected

    def _find_highlight_at_point(self, pdf_pt: QPointF) -> Optional[Highlight]:
        """Find if a point falls within an existing highlight."""
        for hl in reversed(self.highlights):
            rects = hl.parsed_coordinates()
            for r in rects:
                if r["x0"] <= pdf_pt.x() <= r["x1"] and r["y0"] <= pdf_pt.y() <= r["y1"]:
                    return hl
        return None

    # --- Mouse Events ---

    def mousePressEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            pdf_pt = self._widget_to_pdf(event.position())
            self.is_selecting = True
            self.selection_start = pdf_pt
            self.selection_end = pdf_pt
            self.selected_words = []
            self.update()
        elif event.button() == Qt.MouseButton.RightButton:
            pdf_pt = self._widget_to_pdf(event.position())
            hl = self._find_highlight_at_point(pdf_pt)
            if hl:
                self._show_highlight_context_menu(hl, event.globalPosition().toPoint())
            elif self.selected_words:
                self._show_selection_menu(event.globalPosition().toPoint())

    def mouseMoveEvent(self, event: QMouseEvent) -> None:
        if self.is_selecting and (event.buttons() & Qt.MouseButton.LeftButton):
            pdf_pt = self._widget_to_pdf(event.position())
            self.selection_end = pdf_pt
            self._update_selected_words()
            self.update()
        else:
            # Hover cursor change
            pdf_pt = self._widget_to_pdf(event.position())
            hl = self._find_highlight_at_point(pdf_pt)
            if hl:
                self.setCursor(Qt.CursorShape.PointingHandCursor)
            else:
                self.setCursor(Qt.CursorShape.IBeamCursor)

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.LeftButton and self.is_selecting:
            self.is_selecting = False
            pdf_pt = self._widget_to_pdf(event.position())
            self.selection_end = pdf_pt
            self._update_selected_words()
            self.update()

            if self.selected_words:
                self._show_selection_menu(event.globalPosition().toPoint())

    def wheelEvent(self, event: QWheelEvent) -> None:
        modifiers = event.modifiers()
        if modifiers & Qt.KeyboardModifier.ControlModifier:
            # Zoom in / out
            delta = event.angleDelta().y()
            if delta > 0:
                self.zoom_changed.emit(min(4.0, self.zoom * 1.15))
            else:
                self.zoom_changed.emit(max(0.3, self.zoom / 1.15))
            event.accept()
        else:
            super().wheelEvent(event)

    # --- Menus & Actions ---

    def _show_selection_menu(self, global_pos) -> None:
        if not self.selected_words:
            return

        text = " ".join([w["text"] for w in self.selected_words]).strip()
        if not text:
            return

        menu = QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background-color: #181825;
                color: #cdd6f4;
                border: 1px solid #45475a;
                border-radius: 6px;
                padding: 4px;
            }
            QMenu::item {
                padding: 6px 16px;
                border-radius: 4px;
            }
            QMenu::item:selected {
                background-color: #45475a;
            }
        """)

        # Highlight color actions
        for key, info in HIGHLIGHT_COLORS.items():
            act = menu.addAction(f"{info['icon']} Highlight ({info['name']})")
            hex_color = info["hex"]
            act.triggered.connect(lambda checked=False, c=hex_color: self._create_highlight(text, c))

        menu.addSeparator()

        copy_act = menu.addAction("📋 Copy Text")
        copy_act.triggered.connect(lambda: self._copy_text(text))

        clear_act = menu.addAction("❌ Clear Selection")
        clear_act.triggered.connect(self.clear_selection)

        menu.exec(global_pos)

    def _show_highlight_context_menu(self, hl: Highlight, global_pos) -> None:
        menu = QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background-color: #181825;
                color: #cdd6f4;
                border: 1px solid #45475a;
                border-radius: 6px;
                padding: 4px;
            }
            QMenu::item {
                padding: 6px 16px;
                border-radius: 4px;
            }
            QMenu::item:selected {
                background-color: #45475a;
            }
        """)

        copy_act = menu.addAction("📋 Copy Highlighted Text")
        copy_act.triggered.connect(lambda: self._copy_text(hl.selected_text))

        del_act = menu.addAction("🗑 Delete Highlight")
        del_act.triggered.connect(lambda: self.highlight_deleted.emit(hl.id))

        menu.exec(global_pos)

    def _create_highlight(self, text: str, color_hex: str) -> None:
        if not self.selected_words:
            return

        # Merge word rects into minimal bounding lines/rectangles
        rects = []
        for w in self.selected_words:
            rects.append({
                "x0": round(float(w["x0"]), 2),
                "y0": round(float(w["y0"]), 2),
                "x1": round(float(w["x1"]), 2),
                "y1": round(float(w["y1"]), 2),
            })

        self.highlight_created.emit(text, rects, color_hex)
        self.clear_selection()

    def _copy_text(self, text: str) -> None:
        clipboard = QApplication.clipboard()
        clipboard.setText(text)
        self.clear_selection()

    # --- Painting ---

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        # 1. Draw Page Pixmap
        if self.current_pixmap:
            painter.drawPixmap(0, 0, self.current_pixmap)
        else:
            # White background placeholder
            w = int(self.page_rect[0] * self.zoom)
            h = int(self.page_rect[1] * self.zoom)
            painter.fillRect(0, 0, w, h, QColor("#FFFFFF"))

        # 2. Draw Highlights Overlay
        for hl in self.highlights:
            coords = hl.parsed_coordinates()
            c = QColor(hl.color)
            c.setAlpha(115)  # Soft semi-transparent highlight
            brush = QBrush(c)
            painter.setBrush(brush)
            painter.setPen(Qt.PenStyle.NoPen)

            for r in coords:
                qrect = self._pdf_to_widget_rect(r["x0"], r["y0"], r["x1"], r["y1"])
                # Slight expansion for visual polish
                painter.drawRoundedRect(qrect.adjusted(-1, -1, 1, 1), 2.0, 2.0)

        # 3. Draw Search Matches
        if self.search_matches:
            search_color = QColor("#FF9800")
            search_color.setAlpha(120)
            painter.setBrush(QBrush(search_color))
            painter.setPen(QPen(QColor("#FF5722"), 1))
            for sm in self.search_matches:
                qrect = self._pdf_to_widget_rect(sm["x0"], sm["y0"], sm["x1"], sm["y1"])
                painter.drawRoundedRect(qrect, 2.0, 2.0)

        # 4. Draw Active Selection
        if self.selected_words:
            sel_color = QColor(137, 180, 250, 100)  # Catppuccin Blue semi-transparent
            painter.setBrush(QBrush(sel_color))
            painter.setPen(Qt.PenStyle.NoPen)
            for w in self.selected_words:
                qrect = self._pdf_to_widget_rect(w["x0"], w["y0"], w["x1"], w["y1"])
                painter.drawRoundedRect(qrect.adjusted(-1, 0, 1, 0), 2.0, 2.0)

        painter.end()
