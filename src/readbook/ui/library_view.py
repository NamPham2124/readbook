from typing import Optional, List
from pathlib import Path
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QPushButton, QLineEdit, QComboBox,
    QScrollArea, QFrame, QFileDialog, QSizePolicy,
    QProgressBar, QGraphicsDropShadowEffect
)
from PySide6.QtCore import Qt, Signal, QSize
from PySide6.QtGui import QPixmap, QColor, QFont, QCursor

from readbook.database.models import Book
from readbook.services.library_service import LibraryService
from readbook.utils.pdf_utils import render_cover_thumbnail
from readbook.utils.paths import format_relative_time

# Category to emoji & accent color mapping
CATEGORY_ICONS = ["📕", "📘", "📗", "📙", "📓", "📔", "📖"]
CATEGORY_COLORS = ["#f38ba8", "#89b4fa", "#a6e3a1", "#fab387", "#cba6f7", "#94e2d5"]

class BookCardWidget(QFrame):
    """Modern interactive card representation for a book."""
    clicked = Signal(object)  # Book

    def __init__(self, book: Book, parent=None):
        super().__init__(parent)
        self.book = book
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFixedWidth(210)
        self.setFixedHeight(300)
        self.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)

        self._setup_ui()

    def _setup_ui(self) -> None:
        self.setStyleSheet("""
            BookCardWidget {
                background-color: #181825;
                border: 1px solid #313244;
                border-radius: 10px;
            }
            BookCardWidget:hover {
                background-color: #242438;
                border: 1px solid #89b4fa;
            }
        """)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(6)

        # 1. Cover / Thumbnail Box
        self.cover_lbl = QLabel()
        self.cover_lbl.setFixedHeight(160)
        self.cover_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.cover_lbl.setStyleSheet("""
            background-color: #11111b;
            border-radius: 6px;
        """)

        # Attempt to render thumbnail or fallback to colored placeholder
        pixmap = render_cover_thumbnail(Path(self.book.path), max_width=180, max_height=160)
        if pixmap and not pixmap.isNull():
            self.cover_lbl.setPixmap(pixmap.scaled(
                180, 160,
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation
            ))
        else:
            # Fallback stylized icon
            cat_hash = abs(hash(self.book.category or self.book.title))
            icon = CATEGORY_ICONS[cat_hash % len(CATEGORY_ICONS)]
            color = CATEGORY_COLORS[cat_hash % len(CATEGORY_COLORS)]
            self.cover_lbl.setText(icon)
            font = self.cover_lbl.font()
            font.setPointSize(44)
            self.cover_lbl.setFont(font)
            self.cover_lbl.setStyleSheet(f"""
                background-color: #11111b;
                color: {color};
                border-radius: 6px;
            """)

        layout.addWidget(self.cover_lbl)

        # 2. Category Pill
        cat_str = self.book.category or "General"
        cat_lbl = QLabel(f"📂 {cat_str}")
        cat_lbl.setStyleSheet("""
            color: #89b4fa;
            font-size: 10px;
            font-weight: bold;
        """)
        layout.addWidget(cat_lbl)

        # 3. Title
        title_lbl = QLabel(self.book.title)
        title_lbl.setStyleSheet("font-weight: 600; color: #cdd6f4; font-size: 13px;")
        title_lbl.setWordWrap(True)
        title_lbl.setFixedHeight(36)
        title_lbl.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft)
        layout.addWidget(title_lbl)

        layout.addStretch()

        # 4. Progress Bar & Info
        progress_layout = QVBoxLayout()
        progress_layout.setSpacing(2)

        last_p = self.book.last_page or 1
        total_p = max(1, self.book.total_pages or 1)
        percent = min(100, int((last_p / total_p) * 100))

        info_h = QHBoxLayout()
        page_lbl = QLabel(f"Page {last_p}/{total_p}")
        page_lbl.setStyleSheet("color: #a6adc8; font-size: 10px;")
        info_h.addWidget(page_lbl)

        info_h.addStretch()

        pct_lbl = QLabel(f"{percent}%")
        pct_lbl.setStyleSheet("color: #a6e3a1; font-size: 10px; font-weight: bold;")
        info_h.addWidget(pct_lbl)
        progress_layout.addLayout(info_h)

        pbar = QProgressBar()
        pbar.setRange(0, 100)
        pbar.setValue(percent)
        pbar.setFixedHeight(5)
        pbar.setTextVisible(False)
        progress_layout.addWidget(pbar)

        # Last read time
        time_lbl = QLabel(format_relative_time(self.book.last_opened))
        time_lbl.setStyleSheet("color: #6c7086; font-size: 9px; margin-top: 2px;")
        progress_layout.addWidget(time_lbl)

        layout.addLayout(progress_layout)

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit(self.book)
        super().mousePressEvent(event)

class LibraryView(QWidget):
    """
    Library browser view showing scanned books grid, filters, and search.
    """

    book_selected = Signal(object)  # Book

    def __init__(self, library_service: LibraryService, parent=None):
        super().__init__(parent)
        self.library_service = library_service
        self.books: List[Book] = []

        self._setup_ui()

    def _setup_ui(self) -> None:
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(24, 20, 24, 20)
        main_layout.setSpacing(16)

        # Header Bar
        header_layout = QHBoxLayout()

        title_lbl = QLabel("📚 MY LIBRARY")
        title_font = title_lbl.font()
        title_font.setPointSize(18)
        title_font.setBold(True)
        title_lbl.setFont(title_font)
        title_lbl.setStyleSheet("color: #89b4fa; letter-spacing: 1px;")
        header_layout.addWidget(title_lbl)

        # Books Dir Path Label
        self.dir_lbl = QLabel(f"({self.library_service.get_books_dir()})")
        self.dir_lbl.setStyleSheet("color: #6c7086; font-size: 12px; margin-top: 4px;")
        header_layout.addWidget(self.dir_lbl)

        header_layout.addStretch()

        # Change Folder Button
        self.change_dir_btn = QPushButton("📁 Folder")
        self.change_dir_btn.setToolTip("Change Books Directory")
        self.change_dir_btn.clicked.connect(self._on_change_folder)
        header_layout.addWidget(self.change_dir_btn)

        # Rescan Button
        self.rescan_btn = QPushButton("🔄 Rescan Library")
        self.rescan_btn.setObjectName("primaryButton")
        self.rescan_btn.clicked.connect(self.scan_and_refresh)
        header_layout.addWidget(self.rescan_btn)

        main_layout.addLayout(header_layout)

        # Filter & Search Bar
        filter_layout = QHBoxLayout()
        filter_layout.setSpacing(12)

        # Search Input
        self.search_edit = QLineEdit()
        self.search_edit.setPlaceholderText("🔍 Search books by title or path...")
        self.search_edit.setClearButtonEnabled(True)
        self.search_edit.textChanged.connect(self._filter_books)
        filter_layout.addWidget(self.search_edit, stretch=2)

        # Category Dropdown
        self.cat_combo = QComboBox()
        self.cat_combo.addItem("All Categories")
        self.cat_combo.currentTextChanged.connect(self._filter_books)
        self.cat_combo.setMinimumWidth(160)
        filter_layout.addWidget(self.cat_combo, stretch=1)

        main_layout.addLayout(filter_layout)

        # Content Area (Scroll Area with Grid)
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setStyleSheet("QScrollArea { background-color: transparent; border: none; }")

        self.grid_container = QWidget()
        self.grid_container.setStyleSheet("background-color: transparent;")
        self.grid_layout = QGridLayout(self.grid_container)
        self.grid_layout.setContentsMargins(4, 4, 4, 4)
        self.grid_layout.setSpacing(20)
        self.grid_layout.setAlignment(Qt.AlignmentFlag.AlignTop | Qt.AlignmentFlag.AlignLeft)

        self.scroll_area.setWidget(self.grid_container)
        main_layout.addWidget(self.scroll_area, stretch=1)

        # Empty State Widget
        self.empty_widget = QWidget()
        empty_layout = QVBoxLayout(self.empty_widget)
        empty_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        empty_layout.setSpacing(12)

        empty_icon = QLabel("📚")
        empty_icon.setFont(QFont("", 48))
        empty_icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        empty_layout.addWidget(empty_icon)

        empty_title = QLabel("No Books Found")
        empty_title.setFont(QFont("", 16, QFont.Weight.Bold))
        empty_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        empty_title.setStyleSheet("color: #cdd6f4;")
        empty_layout.addWidget(empty_title)

        self.empty_desc = QLabel(
            f"Add PDF or EPUB books into <b>{self.library_service.get_books_dir()}</b><br>"
            "or create subfolders (e.g. <i>~/Book/Robotics/</i>, <i>~/Book/Programming/</i>)<br>"
            "and click <b>Rescan Library</b>."
        )
        self.empty_desc.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.empty_desc.setStyleSheet("color: #a6adc8; line-height: 1.4;")
        empty_layout.addWidget(self.empty_desc)

        empty_scan_btn = QPushButton("🔄 Rescan Now")
        empty_scan_btn.setObjectName("primaryButton")
        empty_scan_btn.setFixedWidth(160)
        empty_scan_btn.clicked.connect(self.scan_and_refresh)
        empty_layout.addWidget(empty_scan_btn, alignment=Qt.AlignmentFlag.AlignCenter)

        self.empty_widget.setVisible(False)
        main_layout.addWidget(self.empty_widget, stretch=1)

    def scan_and_refresh(self) -> None:
        """Scan directory and reload books."""
        self.dir_lbl.setText(f"({self.library_service.get_books_dir()})")
        self.empty_desc.setText(
            f"Add PDF or EPUB books into <b>{self.library_service.get_books_dir()}</b><br>"
            "or create subfolders (e.g. <i>~/Book/Robotics/</i>, <i>~/Book/Programming/</i>)<br>"
            "and click <b>Rescan Library</b>."
        )
        self.books = self.library_service.scan_library()
        self._update_categories_combo()
        self._filter_books()

    def _update_categories_combo(self) -> None:
        current = self.cat_combo.currentText()
        self.cat_combo.blockSignals(True)
        self.cat_combo.clear()
        self.cat_combo.addItem("All Categories")
        categories = self.library_service.get_categories()
        for cat in categories:
            self.cat_combo.addItem(cat)
        if current in categories:
            self.cat_combo.setCurrentText(current)
        self.cat_combo.blockSignals(False)

    def _filter_books(self) -> None:
        search = self.search_edit.text().strip()
        cat = self.cat_combo.currentText()
        if cat == "All Categories":
            cat = ""
        filtered = self.library_service.get_all_books(search_query=search, category=cat)
        self._populate_grid(filtered)

    def _populate_grid(self, books: List[Book]) -> None:
        # Clear existing grid items
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            widget = item.widget()
            if widget:
                widget.deleteLater()

        if not books:
            self.scroll_area.setVisible(False)
            self.empty_widget.setVisible(True)
            return

        self.empty_widget.setVisible(False)
        self.scroll_area.setVisible(True)

        columns = 4  # Responsive grid columns
        for idx, book in enumerate(books):
            row = idx // columns
            col = idx % columns
            card = BookCardWidget(book)
            card.clicked.connect(self.book_selected.emit)
            self.grid_layout.addWidget(card, row, col)

    def _on_change_folder(self) -> None:
        new_dir = QFileDialog.getExistingDirectory(
            self,
            "Select Books Directory",
            str(self.library_service.get_books_dir())
        )
        if new_dir:
            self.library_service.set_books_dir(new_dir)
            self.scan_and_refresh()
