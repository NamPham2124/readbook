"""UI Theme, styling and color constants for ReadBook."""

FONT_FAMILY = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

APP_STYLESHEET = f"""
QMainWindow, QWidget {{
    background-color: #1e1e2e;
    color: #cdd6f4;
    font-family: {FONT_FAMILY};
    font-size: 13px;
}}

/* Toolbars & Headers */
QToolBar {{
    background-color: #181825;
    border-bottom: 1px solid #313244;
    padding: 6px 12px;
    spacing: 8px;
}}

/* Push Buttons */
QPushButton {{
    background-color: #313244;
    color: #cdd6f4;
    border: 1px solid #45475a;
    border-radius: 6px;
    padding: 6px 12px;
    font-weight: 500;
}}
QPushButton:hover {{
    background-color: #45475a;
    border-color: #585b70;
    color: #ffffff;
}}
QPushButton:pressed {{
    background-color: #585b70;
}}
QPushButton:checked {{
    background-color: #89b4fa;
    color: #11111b;
    border-color: #b4befe;
    font-weight: 600;
}}
QPushButton:disabled {{
    background-color: #181825;
    color: #6c7086;
    border-color: #313244;
}}

/* Primary Accent Button */
QPushButton#primaryButton {{
    background-color: #89b4fa;
    color: #11111b;
    border: 1px solid #b4befe;
    font-weight: 600;
}}
QPushButton#primaryButton:hover {{
    background-color: #b4befe;
}}

/* Line Edits & Search */
QLineEdit, QSpinBox, QComboBox {{
    background-color: #181825;
    color: #cdd6f4;
    border: 1px solid #45475a;
    border-radius: 6px;
    padding: 5px 10px;
    selection-background-color: #89b4fa;
    selection-color: #11111b;
}}
QLineEdit:focus, QSpinBox:focus, QComboBox:focus {{
    border-color: #89b4fa;
}}

/* Text Edit (Notes) */
QTextEdit, QPlainTextEdit {{
    background-color: #181825;
    color: #cdd6f4;
    border: 1px solid #313244;
    border-radius: 8px;
    padding: 10px;
    line-height: 1.5;
    selection-background-color: #89b4fa;
    selection-color: #11111b;
    font-family: {FONT_FAMILY};
    font-size: 13px;
}}
QTextEdit:focus, QPlainTextEdit:focus {{
    border-color: #89b4fa;
}}

/* Scrollbars */
QScrollBar:vertical {{
    background: #181825;
    width: 10px;
    margin: 0px;
}}
QScrollBar::handle:vertical {{
    background: #45475a;
    min-height: 25px;
    border-radius: 5px;
}}
QScrollBar::handle:vertical:hover {{
    background: #585b70;
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
    height: 0px;
}}
QScrollBar:horizontal {{
    background: #181825;
    height: 10px;
    margin: 0px;
}}
QScrollBar::handle:horizontal {{
    background: #45475a;
    min-width: 25px;
    border-radius: 5px;
}}
QScrollBar::handle:horizontal:hover {{
    background: #585b70;
}}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{
    width: 0px;
}}

/* Splitter */
QSplitter::handle {{
    background-color: #313244;
}}
QSplitter::handle:horizontal {{
    width: 3px;
}}
QSplitter::handle:vertical {{
    height: 3px;
}}

/* Tab Widget */
QTabWidget::pane {{
    border: 1px solid #313244;
    background-color: #181825;
    border-radius: 6px;
}}
QTabBar::tab {{
    background-color: #11111b;
    color: #a6adc8;
    padding: 8px 16px;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    margin-right: 2px;
}}
QTabBar::tab:selected {{
    background-color: #181825;
    color: #89b4fa;
    font-weight: 600;
}}
QTabBar::tab:hover:!selected {{
    background-color: #313244;
    color: #cdd6f4;
}}

/* List Views */
QListWidget {{
    background-color: #181825;
    border: 1px solid #313244;
    border-radius: 6px;
    padding: 4px;
}}
QListWidget::item {{
    padding: 8px 10px;
    border-radius: 4px;
    margin-bottom: 2px;
}}
QListWidget::item:hover {{
    background-color: #313244;
}}
QListWidget::item:selected {{
    background-color: #45475a;
    color: #ffffff;
}}

/* Progress Bar */
QProgressBar {{
    background-color: #313244;
    border: none;
    border-radius: 3px;
    height: 6px;
    text-align: center;
}}
QProgressBar::chunk {{
    background-color: #a6e3a1;
    border-radius: 3px;
}}
"""

HIGHLIGHT_COLORS = {
    "yellow": {"hex": "#FFE082", "name": "Yellow", "icon": "🟡"},
    "green": {"hex": "#A5D6A7", "name": "Green", "icon": "🟢"},
    "pink": {"hex": "#F48FB1", "name": "Pink", "icon": "🌸"},
    "blue": {"hex": "#90CAF9", "name": "Blue", "icon": "🔷"},
}
