from typing import Optional
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QTextEdit, QPushButton, QFrame
)
from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtGui import QFont
from readbook.services.annotation_service import AnnotationService

class NotesPanel(QWidget):
    """
    Notes panel attached to the reader.
    Provides per-page note taking with automatic debounced saving.
    """

    note_saved = Signal(int, int)  # book_id, page

    def __init__(self, annotation_service: AnnotationService, parent=None):
        super().__init__(parent)
        self.annotation_service = annotation_service

        self.current_book_id: Optional[int] = None
        self.current_page: int = 1
        self.is_dirty: bool = False
        self._suppress_signals: bool = False

        # Autosave debounce timer (500ms)
        self.save_timer = QTimer(self)
        self.save_timer.setSingleShot(True)
        self.save_timer.setInterval(500)
        self.save_timer.timeout.connect(self.save_current_note)

        self._setup_ui()

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)

        # Header Section
        header_layout = QHBoxLayout()
        self.header_label = QLabel("📝 Page Notes")
        font = self.header_label.font()
        font.setPointSize(12)
        font.setBold(True)
        self.header_label.setFont(font)
        header_layout.addWidget(self.header_label)

        header_layout.addStretch()

        self.status_label = QLabel("✓ Saved")
        self.status_label.setStyleSheet("color: #a6e3a1; font-size: 11px;")
        header_layout.addWidget(self.status_label)

        layout.addLayout(header_layout)

        # Separator
        line = QFrame()
        line.setFrameShape(QFrame.Shape.HLine)
        line.setStyleSheet("color: #313244;")
        layout.addWidget(line)

        # Page Subtitle
        self.page_info_label = QLabel("Page 1")
        self.page_info_label.setStyleSheet("color: #89b4fa; font-weight: 500;")
        layout.addWidget(self.page_info_label)

        # Note Text Area
        self.text_edit = QTextEdit()
        self.text_edit.setPlaceholderText("Write your notes for this page here...\nNotes are automatically saved.")
        self.text_edit.textChanged.connect(self._on_text_changed)
        layout.addWidget(self.text_edit, stretch=1)

        # Bottom Actions Bar
        bottom_layout = QHBoxLayout()
        self.clear_btn = QPushButton("🗑 Clear Note")
        self.clear_btn.setStyleSheet("""
            QPushButton {
                background-color: #313244;
                color: #f38ba8;
                border: 1px solid #45475a;
                padding: 5px 10px;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: #45475a;
                border-color: #f38ba8;
            }
        """)
        self.clear_btn.clicked.connect(self._on_clear_clicked)
        bottom_layout.addWidget(self.clear_btn)

        bottom_layout.addStretch()

        self.save_btn = QPushButton("💾 Save Now")
        self.save_btn.setStyleSheet("""
            QPushButton {
                background-color: #45475a;
                color: #cdd6f4;
                padding: 5px 12px;
                font-size: 11px;
            }
        """)
        self.save_btn.clicked.connect(self.save_current_note)
        bottom_layout.addWidget(self.save_btn)

        layout.addLayout(bottom_layout)

    def set_page(self, book_id: int, page: int) -> None:
        """Switch to a new page, flushing previous note and loading new note."""
        # 1. Flush/save current note if modified
        if self.is_dirty and self.current_book_id is not None:
            self.save_current_note()

        self.current_book_id = book_id
        self.current_page = page
        self.page_info_label.setText(f"Notes for Page {page}")

        # 2. Load note from db
        self._suppress_signals = True
        note_content = self.annotation_service.get_note(book_id, page) or ""
        self.text_edit.setPlainText(note_content)
        self._suppress_signals = False
        self.is_dirty = False

        self.status_label.setText("✓ Saved" if note_content else "")
        self.status_label.setStyleSheet("color: #a6e3a1; font-size: 11px;")

    def _on_text_changed(self) -> None:
        if self._suppress_signals:
            return
        self.is_dirty = True
        self.status_label.setText("⏳ Saving...")
        self.status_label.setStyleSheet("color: #f9e2af; font-size: 11px;")
        self.save_timer.start()

    def save_current_note(self) -> None:
        if self.current_book_id is None:
            return
        self.save_timer.stop()
        content = self.text_edit.toPlainText()
        self.annotation_service.save_note(self.current_book_id, self.current_page, content)
        self.is_dirty = False
        self.status_label.setText("✓ Saved")
        self.status_label.setStyleSheet("color: #a6e3a1; font-size: 11px;")
        self.note_saved.emit(self.current_book_id, self.current_page)

    def _on_clear_clicked(self) -> None:
        self.text_edit.clear()
        self.save_current_note()
