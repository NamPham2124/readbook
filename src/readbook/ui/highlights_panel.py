from typing import Optional, List
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QListWidget, QListWidgetItem, QLineEdit, QFrame
)
from PySide6.QtCore import Qt, Signal
from readbook.services.annotation_service import AnnotationService
from readbook.database.models import Highlight
from readbook.utils.paths import format_relative_time

class HighlightListItemWidget(QWidget):
    """Custom widget for a highlight list entry."""
    jump_requested = Signal(int)
    delete_requested = Signal(int)

    def __init__(self, highlight: Highlight, parent=None):
        super().__init__(parent)
        self.highlight = highlight

        layout = QHBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(8)

        # Color indicator pill + page button
        page_btn = QPushButton(f"p. {highlight.page}")
        color_hex = highlight.color or "#FFEB3B"
        page_btn.setStyleSheet(f"""
            QPushButton {{
                background-color: {color_hex};
                color: #11111b;
                font-weight: bold;
                font-size: 11px;
                padding: 3px 8px;
                border-radius: 4px;
            }}
            QPushButton:hover {{
                filter: brightness(1.1);
            }}
        """)
        page_btn.clicked.connect(lambda: self.jump_requested.emit(highlight.page))
        layout.addWidget(page_btn)

        # Highlight Text Snippet & Info
        info_layout = QVBoxLayout()
        info_layout.setSpacing(2)

        # Truncate text if long
        snippet = highlight.selected_text
        if len(snippet) > 80:
            snippet = snippet[:77] + "..."

        text_lbl = QLabel(f'"{snippet}"')
        text_lbl.setStyleSheet("font-style: italic; color: #cdd6f4; font-size: 12px;")
        text_lbl.setWordWrap(True)
        info_layout.addWidget(text_lbl)

        time_lbl = QLabel(format_relative_time(highlight.created_at))
        time_lbl.setStyleSheet("color: #6c7086; font-size: 10px;")
        info_layout.addWidget(time_lbl)

        layout.addLayout(info_layout, stretch=1)

        # Delete Button
        del_btn = QPushButton("🗑")
        del_btn.setFixedSize(28, 28)
        del_btn.setToolTip("Delete highlight")
        del_btn.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                color: #f38ba8;
                border: none;
                font-size: 13px;
            }
            QPushButton:hover {
                background-color: #313244;
                border-radius: 4px;
            }
        """)
        del_btn.clicked.connect(lambda: self.delete_requested.emit(highlight.id))
        layout.addWidget(del_btn)

class HighlightsPanel(QWidget):
    """Panel listing all highlights for the current book."""

    jump_to_page = Signal(int)
    highlight_deleted = Signal(int)

    def __init__(self, annotation_service: AnnotationService, parent=None):
        super().__init__(parent)
        self.annotation_service = annotation_service
        self.current_book_id: Optional[int] = None
        self.highlights: List[Highlight] = []

        self._setup_ui()

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)

        # Header
        header_layout = QHBoxLayout()
        title_lbl = QLabel("🖍 Highlights")
        font = title_lbl.font()
        font.setPointSize(12)
        font.setBold(True)
        title_lbl.setFont(font)
        header_layout.addWidget(title_lbl)
        layout.addLayout(header_layout)

        # Search / Filter
        self.search_edit = QLineEdit()
        self.search_edit.setPlaceholderText("🔍 Filter highlights...")
        self.search_edit.textChanged.connect(self._filter_highlights)
        layout.addWidget(self.search_edit)

        # List Widget
        self.list_widget = QListWidget()
        self.list_widget.setStyleSheet("border: 1px solid #313244; border-radius: 6px;")
        layout.addWidget(self.list_widget, stretch=1)

        self.empty_lbl = QLabel("No highlights yet.\nSelect text in PDF to highlight.")
        self.empty_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.empty_lbl.setStyleSheet("color: #6c7086; padding: 20px;")
        layout.addWidget(self.empty_lbl)

    def set_book(self, book_id: int) -> None:
        self.current_book_id = book_id
        self.refresh_highlights()

    def refresh_highlights(self) -> None:
        if self.current_book_id is None:
            self.highlights = []
        else:
            self.highlights = self.annotation_service.get_highlights(self.current_book_id)
        self._populate_list(self.highlights)

    def _filter_highlights(self, query: str) -> None:
        query = query.strip().lower()
        if not query:
            self._populate_list(self.highlights)
        else:
            filtered = [h for h in self.highlights if query in h.selected_text.lower()]
            self._populate_list(filtered)

    def _populate_list(self, highlights: List[Highlight]) -> None:
        self.list_widget.clear()

        if not highlights:
            self.list_widget.setVisible(False)
            self.empty_lbl.setVisible(True)
            return

        self.list_widget.setVisible(True)
        self.empty_lbl.setVisible(False)

        for hl in highlights:
            item = QListWidgetItem(self.list_widget)
            widget = HighlightListItemWidget(hl)
            widget.jump_requested.connect(self.jump_to_page.emit)
            widget.delete_requested.connect(self._on_delete_highlight)

            item.setSizeHint(widget.sizeHint())
            self.list_widget.addItem(item)
            self.list_widget.setItemWidget(item, widget)

    def _on_delete_highlight(self, highlight_id: int) -> None:
        self.annotation_service.delete_highlight(highlight_id)
        self.refresh_highlights()
        self.highlight_deleted.emit(highlight_id)
