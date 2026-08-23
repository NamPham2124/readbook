from typing import Optional, List, Dict
from pathlib import Path
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QSpinBox, QScrollArea, QSplitter,
    QStackedWidget, QLineEdit, QToolBar, QSizePolicy,
    QFrame, QMessageBox, QApplication
)
from PySide6.QtCore import Qt, Signal, QSize, QTimer
from PySide6.QtGui import QFont, QKeySequence, QShortcut, QWheelEvent

from readbook.database.models import Book, Highlight
from readbook.services.reader_service import ReaderService
from readbook.services.annotation_service import AnnotationService
from readbook.services.library_service import LibraryService
from readbook.ui.pdf_canvas import PdfCanvas
from readbook.ui.notes_panel import NotesPanel
from readbook.ui.tags_panel import TagsPanel
from readbook.ui.highlights_panel import HighlightsPanel

class ReaderView(QWidget):
    """
    Main PDF reader view with dual-pane split screen, notes,
    tags/bookmarks, highlights, and smooth zoom & navigation.
    """

    back_to_library = Signal()

    def __init__(
        self,
        reader_service: ReaderService,
        annotation_service: AnnotationService,
        library_service: LibraryService,
        parent=None
    ):
        super().__init__(parent)
        self.reader_service = reader_service
        self.annotation_service = annotation_service
        self.library_service = library_service

        self.current_book: Optional[Book] = None
        self.current_page: int = 1
        self.total_pages: int = 1
        self.zoom: float = 1.2
        self.search_matches: List[Dict[str, float]] = []

        self._setup_ui()
        self._setup_shortcuts()

    def _setup_ui(self) -> None:
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Top Navigation & Control Toolbar
        self.toolbar = QToolBar()
        self.toolbar.setMovable(False)
        self.toolbar.setIconSize(QSize(18, 18))

        # Back Button
        self.back_btn = QPushButton("⬅ Library")
        self.back_btn.clicked.connect(self._on_back_clicked)
        self.toolbar.addWidget(self.back_btn)

        self.toolbar.addSeparator()

        # Book Title Label
        self.title_lbl = QLabel("")
        title_font = self.title_lbl.font()
        title_font.setBold(True)
        self.title_lbl.setFont(title_font)
        self.title_lbl.setStyleSheet("padding: 0 10px; color: #89b4fa;")
        self.toolbar.addWidget(self.title_lbl)

        self.toolbar.addSeparator()

        # Page Navigation Controls
        self.first_btn = QPushButton("⏮")
        self.first_btn.setToolTip("First Page (Home)")
        self.first_btn.setFixedSize(32, 30)
        self.first_btn.clicked.connect(lambda: self.go_to_page(1))
        self.toolbar.addWidget(self.first_btn)

        self.prev_btn = QPushButton("◀")
        self.prev_btn.setToolTip("Previous Page (Left Arrow / PageUp)")
        self.prev_btn.setFixedSize(32, 30)
        self.prev_btn.clicked.connect(self.prev_page)
        self.toolbar.addWidget(self.prev_btn)

        # Page Input (Page X / Y)
        page_widget = QWidget()
        page_layout = QHBoxLayout(page_widget)
        page_layout.setContentsMargins(4, 0, 4, 0)
        page_layout.setSpacing(6)

        page_prefix = QLabel("Page")
        page_prefix.setStyleSheet("color: #a6adc8;")
        page_layout.addWidget(page_prefix)

        self.page_spin = QSpinBox()
        self.page_spin.setRange(1, 99999)
        self.page_spin.setValue(1)
        self.page_spin.setFixedWidth(65)
        self.page_spin.valueChanged.connect(self._on_page_spin_changed)
        page_layout.addWidget(self.page_spin)

        self.total_pages_lbl = QLabel("/ 1")
        self.total_pages_lbl.setStyleSheet("color: #a6adc8;")
        page_layout.addWidget(self.total_pages_lbl)

        self.toolbar.addWidget(page_widget)

        self.next_btn = QPushButton("▶")
        self.next_btn.setToolTip("Next Page (Right Arrow / PageDown)")
        self.next_btn.setFixedSize(32, 30)
        self.next_btn.clicked.connect(self.next_page)
        self.toolbar.addWidget(self.next_btn)

        self.last_btn = QPushButton("⏭")
        self.last_btn.setToolTip("Last Page (End)")
        self.last_btn.setFixedSize(32, 30)
        self.last_btn.clicked.connect(lambda: self.go_to_page(self.total_pages))
        self.toolbar.addWidget(self.last_btn)

        self.toolbar.addSeparator()

        # Zoom Controls
        self.zoom_out_btn = QPushButton("🔍 -")
        self.zoom_out_btn.setToolTip("Zoom Out (Ctrl+-)")
        self.zoom_out_btn.setFixedSize(45, 30)
        self.zoom_out_btn.clicked.connect(self.zoom_out)
        self.toolbar.addWidget(self.zoom_out_btn)

        self.zoom_lbl = QLabel("120%")
        self.zoom_lbl.setStyleSheet("color: #a6adc8; min-width: 45px; text-align: center;")
        self.zoom_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.toolbar.addWidget(self.zoom_lbl)

        self.zoom_in_btn = QPushButton("🔍 +")
        self.zoom_in_btn.setToolTip("Zoom In (Ctrl++)")
        self.zoom_in_btn.setFixedSize(45, 30)
        self.zoom_in_btn.clicked.connect(self.zoom_in)
        self.toolbar.addWidget(self.zoom_in_btn)

        self.fit_width_btn = QPushButton("↔ Fit Width")
        self.fit_width_btn.clicked.connect(self.fit_to_width)
        self.toolbar.addWidget(self.fit_width_btn)

        # Spacer to push action buttons to the right
        spacer = QWidget()
        spacer.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred)
        self.toolbar.addWidget(spacer)

        # Sidebar Action Buttons
        self.search_btn = QPushButton("🔍 Find")
        self.search_btn.setCheckable(True)
        self.search_btn.setToolTip("Search in page (Ctrl+F)")
        self.search_btn.toggled.connect(self._toggle_search_bar)
        self.toolbar.addWidget(self.search_btn)

        self.notes_btn = QPushButton("📝 Notes")
        self.notes_btn.setCheckable(True)
        self.notes_btn.setToolTip("Toggle Per-Page Notes (Ctrl+N)")
        self.notes_btn.toggled.connect(lambda checked: self._toggle_sidebar("notes", checked))
        self.toolbar.addWidget(self.notes_btn)

        self.tags_btn = QPushButton("🏷 Tags")
        self.tags_btn.setCheckable(True)
        self.tags_btn.setToolTip("Toggle Tags & Bookmarks (Ctrl+T)")
        self.tags_btn.toggled.connect(lambda checked: self._toggle_sidebar("tags", checked))
        self.toolbar.addWidget(self.tags_btn)

        self.highlights_btn = QPushButton("🖍 Highlights")
        self.highlights_btn.setCheckable(True)
        self.highlights_btn.setToolTip("View all Highlights")
        self.highlights_btn.toggled.connect(lambda checked: self._toggle_sidebar("highlights", checked))
        self.toolbar.addWidget(self.highlights_btn)

        main_layout.addWidget(self.toolbar)

        # Search Bar (Overlay / Top of canvas)
        self.search_bar_widget = QWidget()
        self.search_bar_widget.setStyleSheet("background-color: #181825; border-bottom: 1px solid #313244; padding: 4px;")
        search_layout = QHBoxLayout(self.search_bar_widget)
        search_layout.setContentsMargins(12, 4, 12, 4)

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Search text on this page...")
        self.search_input.returnPressed.connect(self._perform_search)
        search_layout.addWidget(self.search_input, stretch=1)

        search_exec_btn = QPushButton("Find")
        search_exec_btn.clicked.connect(self._perform_search)
        search_layout.addWidget(search_exec_btn)

        self.search_status_lbl = QLabel("")
        self.search_status_lbl.setStyleSheet("color: #f9e2af; font-size: 11px;")
        search_layout.addWidget(self.search_status_lbl)

        close_search_btn = QPushButton("✕")
        close_search_btn.setFixedSize(24, 24)
        close_search_btn.clicked.connect(lambda: self.search_btn.setChecked(False))
        search_layout.addWidget(close_search_btn)

        self.search_bar_widget.setVisible(False)
        main_layout.addWidget(self.search_bar_widget)

        # Splitter: Left (PDF ScrollArea), Right (Sidebar Stack)
        self.splitter = QSplitter(Qt.Orientation.Horizontal)
        self.splitter.setChildrenCollapsible(False)

        # PDF Canvas Area
        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.scroll_area.setStyleSheet("QScrollArea { background-color: #11111b; border: none; }")

        self.canvas = PdfCanvas()
        self.canvas.highlight_created.connect(self._on_highlight_created)
        self.canvas.highlight_deleted.connect(self._on_highlight_deleted)
        self.canvas.zoom_changed.connect(self.set_zoom)
        self.scroll_area.setWidget(self.canvas)

        self.splitter.addWidget(self.scroll_area)

        # Right Sidebar Stacked Widget
        self.sidebar_stack = QStackedWidget()
        self.sidebar_stack.setMinimumWidth(320)
        self.sidebar_stack.setMaximumWidth(600)
        self.sidebar_stack.setStyleSheet("background-color: #181825; border-left: 1px solid #313244;")

        # 1. Notes Panel
        self.notes_panel = NotesPanel(self.annotation_service)
        self.sidebar_stack.addWidget(self.notes_panel)

        # 2. Tags Panel
        self.tags_panel = TagsPanel(self.annotation_service)
        self.tags_panel.jump_to_page.connect(self.go_to_page)
        self.sidebar_stack.addWidget(self.tags_panel)

        # 3. Highlights Panel
        self.highlights_panel = HighlightsPanel(self.annotation_service)
        self.highlights_panel.jump_to_page.connect(self.go_to_page)
        self.highlights_panel.highlight_deleted.connect(self._on_highlight_deleted)
        self.sidebar_stack.addWidget(self.highlights_panel)

        self.sidebar_stack.setVisible(False)
        self.splitter.addWidget(self.sidebar_stack)

        # Set initial splitter proportions (70% PDF, 30% Sidebar)
        self.splitter.setSizes([900, 350])

        main_layout.addWidget(self.splitter, stretch=1)

    def _setup_shortcuts(self) -> None:
        # Prev / Next Page
        QShortcut(QKeySequence(Qt.Key.Key_Left), self, self.prev_page)
        QShortcut(QKeySequence(Qt.Key.Key_Right), self, self.next_page)
        QShortcut(QKeySequence(Qt.Key.Key_PageUp), self, self.prev_page)
        QShortcut(QKeySequence(Qt.Key.Key_PageDown), self, self.next_page)
        QShortcut(QKeySequence(Qt.Key.Key_Home), self, lambda: self.go_to_page(1))
        QShortcut(QKeySequence(Qt.Key.Key_End), self, lambda: self.go_to_page(self.total_pages))

        # Zoom
        QShortcut(QKeySequence("Ctrl+="), self, self.zoom_in)
        QShortcut(QKeySequence("Ctrl++"), self, self.zoom_in)
        QShortcut(QKeySequence("Ctrl+-"), self, self.zoom_out)
        QShortcut(QKeySequence("Ctrl+0"), self, self.fit_to_width)

        # Sidebar toggles
        QShortcut(QKeySequence("Ctrl+N"), self, lambda: self.notes_btn.toggle())
        QShortcut(QKeySequence("Ctrl+T"), self, lambda: self.tags_btn.toggle())
        QShortcut(QKeySequence("Ctrl+F"), self, lambda: self.search_btn.toggle())

        # Escape
        QShortcut(QKeySequence(Qt.Key.Key_Escape), self, self._on_escape)

    def _on_escape(self) -> None:
        if self.search_bar_widget.isVisible():
            self.search_btn.setChecked(False)
        else:
            self._on_back_clicked()

    # --- Loading & Page Management ---

    def open_book(self, book: Book) -> None:
        """Open a book and display starting from its last_page."""
        self.current_book = book
        success = self.reader_service.open_book(book.path)
        if not success:
            QMessageBox.critical(self, "Error", f"Failed to open PDF:\n{book.path}")
            self.back_to_library.emit()
            return

        self.total_pages = self.reader_service.get_page_count()
        self.title_lbl.setText(book.title)
        self.total_pages_lbl.setText(f"/ {self.total_pages}")
        self.page_spin.setMaximum(self.total_pages)

        # Setup panels
        self.tags_panel.set_book(book.id, book.last_page or 1)
        self.highlights_panel.set_book(book.id)

        # Restore last read page
        target_page = max(1, min(book.last_page or 1, self.total_pages))
        self.go_to_page(target_page, force=True)

    def go_to_page(self, page: int, force: bool = False) -> None:
        page = max(1, min(page, self.total_pages))
        if page == self.current_page and not force:
            return

        # Flush notes before leaving page
        if self.current_book is not None and self.notes_panel.is_dirty:
            self.notes_panel.save_current_note()

        self.current_page = page
        self.page_spin.blockSignals(True)
        self.page_spin.setValue(page)
        self.page_spin.blockSignals(False)

        # Update last read position in DB
        if self.current_book is not None and self.current_book.id is not None:
            self.library_service.update_last_page(self.current_book.id, page)
            self.current_book.last_page = page

        # Update Notes & Tags panels
        if self.current_book is not None and self.current_book.id is not None:
            self.notes_panel.set_page(self.current_book.id, page)
            self.tags_panel.set_current_page(page)

        # Reset search matches on page change unless search active
        if not self.search_bar_widget.isVisible():
            self.search_matches = []
        else:
            self._perform_search()

        self._render_current_page()

    def _render_current_page(self) -> None:
        if not self.reader_service.is_open():
            return

        image = self.reader_service.render_page(self.current_page, self.zoom)
        page_rect = self.reader_service.get_page_rect(self.current_page)
        words = self.reader_service.extract_words(self.current_page)

        highlights = []
        if self.current_book is not None and self.current_book.id is not None:
            highlights = self.annotation_service.get_highlights(self.current_book.id, self.current_page)

        self.canvas.set_page_data(
            image=image,
            page_rect=page_rect,
            words=words,
            highlights=highlights,
            zoom=self.zoom,
            search_matches=self.search_matches
        )

        # Scroll to top
        self.scroll_area.verticalScrollBar().setValue(0)

    def prev_page(self) -> None:
        if self.current_page > 1:
            self.go_to_page(self.current_page - 1)

    def next_page(self) -> None:
        if self.current_page < self.total_pages:
            self.go_to_page(self.current_page + 1)

    def _on_page_spin_changed(self, val: int) -> None:
        self.go_to_page(val)

    # --- Zoom Management ---

    def set_zoom(self, zoom: float) -> None:
        self.zoom = max(0.3, min(4.0, zoom))
        self.zoom_lbl.setText(f"{int(self.zoom * 100)}%")
        self._render_current_page()

    def zoom_in(self) -> None:
        self.set_zoom(self.zoom * 1.2)

    def zoom_out(self) -> None:
        self.set_zoom(self.zoom / 1.2)

    def fit_to_width(self) -> None:
        viewport_w = self.scroll_area.viewport().width() - 30
        page_w, _ = self.reader_service.get_page_rect(self.current_page)
        if page_w > 0 and viewport_w > 100:
            target_zoom = viewport_w / page_w
            self.set_zoom(target_zoom)

    # --- Sidebar Management ---

    def _toggle_sidebar(self, panel_name: str, checked: bool) -> None:
        if not checked:
            # Check if any other sidebar button is checked
            active_btn = None
            if panel_name != "notes" and self.notes_btn.isChecked():
                active_btn = "notes"
            elif panel_name != "tags" and self.tags_btn.isChecked():
                active_btn = "tags"
            elif panel_name != "highlights" and self.highlights_btn.isChecked():
                active_btn = "highlights"

            if not active_btn:
                self.sidebar_stack.setVisible(False)
            else:
                self._switch_sidebar_tab(active_btn)
            return

        # Uncheck other buttons
        if panel_name == "notes":
            self.tags_btn.blockSignals(True)
            self.tags_btn.setChecked(False)
            self.tags_btn.blockSignals(False)
            self.highlights_btn.blockSignals(True)
            self.highlights_btn.setChecked(False)
            self.highlights_btn.blockSignals(False)
        elif panel_name == "tags":
            self.notes_btn.blockSignals(True)
            self.notes_btn.setChecked(False)
            self.notes_btn.blockSignals(False)
            self.highlights_btn.blockSignals(True)
            self.highlights_btn.setChecked(False)
            self.highlights_btn.blockSignals(False)
        elif panel_name == "highlights":
            self.notes_btn.blockSignals(True)
            self.notes_btn.setChecked(False)
            self.notes_btn.blockSignals(False)
            self.tags_btn.blockSignals(True)
            self.tags_btn.setChecked(False)
            self.tags_btn.blockSignals(False)

        self._switch_sidebar_tab(panel_name)
        self.sidebar_stack.setVisible(True)

    def _switch_sidebar_tab(self, panel_name: str) -> None:
        if panel_name == "notes":
            self.sidebar_stack.setCurrentWidget(self.notes_panel)
        elif panel_name == "tags":
            self.sidebar_stack.setCurrentWidget(self.tags_panel)
            self.tags_panel.refresh_tags()
        elif panel_name == "highlights":
            self.sidebar_stack.setCurrentWidget(self.highlights_panel)
            self.highlights_panel.refresh_highlights()

    # --- Search Bar ---

    def _toggle_search_bar(self, checked: bool) -> None:
        self.search_bar_widget.setVisible(checked)
        if checked:
            self.search_input.setFocus()
            self.search_input.selectAll()
        else:
            self.search_matches = []
            self._render_current_page()

    def _perform_search(self) -> None:
        query = self.search_input.text().strip()
        if not query:
            self.search_matches = []
            self.search_status_lbl.setText("")
            self._render_current_page()
            return

        self.search_matches = self.reader_service.search_text_on_page(self.current_page, query)
        count = len(self.search_matches)
        if count == 0:
            self.search_status_lbl.setText("No matches on this page")
        else:
            self.search_status_lbl.setText(f"{count} match{'es' if count > 1 else ''} found")
        self._render_current_page()

    # --- Highlight Callbacks ---

    def _on_highlight_created(self, text: str, rects: list, color: str) -> None:
        if self.current_book is None or self.current_book.id is None:
            return
        self.annotation_service.add_highlight(
            self.current_book.id,
            self.current_page,
            text,
            rects,
            color
        )
        self._render_current_page()
        self.highlights_panel.refresh_highlights()

    def _on_highlight_deleted(self, highlight_id: int) -> None:
        self.annotation_service.delete_highlight(highlight_id)
        self._render_current_page()
        self.highlights_panel.refresh_highlights()

    # --- Navigation & Exit ---

    def _on_back_clicked(self) -> None:
        # Flush note
        if self.notes_panel.is_dirty:
            self.notes_panel.save_current_note()
        self.reader_service.close()
        self.back_to_library.emit()
