import sys
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont

def create_application() -> QApplication:
    """Create and configure the Qt Application instance."""
    app = QApplication.instance()
    if app is None:
        app = QApplication(sys.argv)

    app.setApplicationName("ReadBook")
    app.setApplicationDisplayName("ReadBook")
    app.setOrganizationName("ReadBook")
    app.setOrganizationDomain("readbook.local")

    # Set default font
    font = QFont("Ubuntu", 10)
    if not font.exactMatch():
        font = QFont("DejaVu Sans", 10)
    app.setFont(font)

    return app
