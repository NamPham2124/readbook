from typing import Optional, List
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QListWidget, QListWidgetItem, QInputDialog,
    QLineEdit, QFrame, QMessageBox
)
from PySide6.QtCore import Qt, Signal
from readbook.services.annotation_service import AnnotationService
from readbook.database.models import Bookmark
from readbook.utils.paths import format_relative_time

class TagListItemWidget(QWidget):
    """Custom widget for a tag list entry."""
    jump_requested = Signal(int)
    delete_requested = Signal(int)

    def __init__(self, bookmark: Bookmark, parent=None):
        super().__init__(parent)
        self.bookmark = bookmark

        layout = QHBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(8)

        # Page badge
        page_btn = QPushButton(f"p. {bookmark.page}")
        page_btn.setStyleSheet("""
            QPushButton {
                background-color: #89b4fa;
                color: #11111b;
                font-weight: bold;
                font-size: 11px;
                padding: 3px 8px;
                border-radius: 4px;
            }
            QPushButton:hover {
                background-color: #b4befe;
            }
        """)
        page_btn.clicked.connect(lambda: self.jump_requested.emit(bookmark.page))
        layout.addWidget(page_btn)

        # Tag Info
        info_layout = QVBoxLayout()
        info_layout.setSpacing(2)

        name_lbl = QLabel(bookmark.name)
        name_lbl.setStyleSheet("font-weight: 600; color: #cdd6f4; font-size: 13px;")
        info_layout.addWidget(name_lbl)

        time_lbl = QLabel(format_relative_time(bookmark.created_at))
        time_lbl.setStyleSheet("color: #6c7086; font-size: 10px;")
        info_layout.addWidget(time_lbl)

        layout.addLayout(info_layout, stretch=1)

        # Delete Button
        del_btn = QPushButton("🗑")
        del_btn.setFixedSize(28, 28)
        del_btn.setToolTip("Delete tag")
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
        del_btn.clicked.connect(lambda: self.delete_requested.emit(bookmark.id))
        layout.addWidget(del_btn)

class TagsPanel(QWidget):
    """Panel listing all tags/bookmarks for the current book with creation & navigation."""

    jump_to_page = Signal(int)
    tags_updated = Signal()

    def __init__(self, annotation_service: AnnotationService, parent=None):
        super().__init__(parent)
        self.annotation_service = annotation_service
        self.current_book_id: Optional[int] = None
        self.current_page: int = 1
        self.bookmarks: List[Bookmark] = []

        self._setup_ui()

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)

        # Header
        header_layout = QHBoxLayout()
        title_lbl = QLabel("🏷 Bookmarks & Tags")
        font = title_lbl.font()
        font.setPointSize(12)
        font.setBold(True)
        title_lbl.setFont(font)
        header_layout.addWidget(title_lbl)

        layout.addLayout(header_layout)

        # Add Tag Button
        self.add_tag_btn = QPushButton("+ Add Tag for Current Page")
        self.add_tag_btn.setObjectName("primaryButton")
        self.add_tag_btn.clicked.connect(self._on_add_tag_clicked)
        layout.addWidget(self.add_tag_btn)

        # Search / Filter
        self.search_edit = QLineEdit()
        self.search_edit.setPlaceholderText("🔍 Filter tags...")
        self.search_edit.textChanged.connect(self._filter_tags)
        layout.addWidget(self.search_edit)

        # List Widget
        self.list_widget = QListWidget()
        self.list_widget.setStyleSheet("border: 1px solid #313244; border-radius: 6px;")
        layout.addWidget(self.list_widget, stretch=1)

        self.empty_lbl = QLabel("No tags created yet.\nClick '+ Add Tag' to bookmark pages.")
        self.empty_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.empty_lbl.setStyleSheet("color: #6c7086; padding: 20px;")
        layout.addWidget(self.empty_lbl)

    def set_book(self, book_id: int, current_page: int = 1) -> None:
        self.current_book_id = book_id
        self.current_page = current_page
        self.add_tag_btn.setText(f"+ Add Tag for Page {current_page}")
        self.refresh_tags()

    def set_current_page(self, page: int) -> None:
        self.current_page = page
        self.add_tag_btn.setText(f"+ Add Tag for Page {page}")

    def refresh_tags(self) -> None:
        if self.current_book_id is None:
            self.bookmarks = []
        else:
            self.bookmarks = self.annotation_service.get_bookmarks(self.current_book_id)
        self._populate_list(self.bookmarks)

    def _filter_tags(self, query: str) -> None:
        query = query.strip().lower()
        if not query:
            self._populate_list(self.bookmarks)
        else:
            filtered = [b for b in self.bookmarks if query in b.name.lower()]
            self._populate_list(filtered)

    def _populate_list(self, bookmarks: List[Bookmark]) -> None:
        self.list_widget.clear()

        if not bookmarks:
            self.list_widget.setVisible(False)
            self.empty_lbl.setVisible(True)
            return

        self.list_widget.setVisible(True)
        self.empty_lbl.setVisible(False)

        for bm in bookmarks:
            item = QListWidgetItem(self.list_widget)
            widget = TagListItemWidget(bm)
            widget.jump_requested.connect(self.jump_to_page.emit)
            widget.delete_requested.connect(self._delete_tag)

            item.setSizeHint(widget.sizeHint())
            self.list_widget.addItem(item)
            self.list_widget.setItemWidget(item, widget)

    def _on_add_tag_clicked(self) -> None:
        if self.current_book_id is None:
            return

        tag_name, ok = QInputDialog.getText(
            self,
            "Add Tag / Bookmark",
            f"Enter name for bookmark on Page {self.current_page}:",
            QLineEdit.EchoMode.Normal,
            ""
        )
        if ok and tag_name.strip():
            self.annotation_service.add_bookmark(self.current_book_id, self.current_page, tag_name.strip())
            self.refresh_tags()
            self.tags_updated.emit()

    def _delete_tag(self, bookmark_id: int) -> None:
        self.annotation_service.delete_bookmark(bookmark_id)
        self.refresh_tags()
        self.tags_updated.emit()
