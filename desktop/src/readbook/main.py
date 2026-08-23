import sys
import argparse
from pathlib import Path
from readbook import __version__
from readbook.config import ensure_app_dirs, DEFAULT_DB_PATH
from readbook.database.db import DatabaseManager
from readbook.app import create_application
from readbook.ui.main_window import MainWindow

def main() -> int:
    """Entry point for the readbook CLI and GUI."""
    parser = argparse.ArgumentParser(
        prog="readbook",
        description="Personal local PDF book reader with notes, highlights, and tags for Ubuntu."
    )
    parser.add_argument(
        "file",
        nargs="?",
        default=None,
        help="Optional path to a PDF file to open immediately."
    )
    parser.add_argument(
        "--books-dir",
        "-d",
        type=str,
        default=None,
        help="Custom directory path containing books (defaults to ~/books)."
    )
    parser.add_argument(
        "--version",
        "-v",
        action="version",
        version=f"readbook {__version__}"
    )

    args = parser.parse_args()

    # Ensure local data/config directories exist
    ensure_app_dirs()

    # Initialize Database
    db = DatabaseManager(DEFAULT_DB_PATH)

    # Initialize Qt App
    app = create_application()

    # Create Main Window
    window = MainWindow(
        db=db,
        books_dir=args.books_dir,
        initial_book_path=args.file
    )
    window.show()

    return app.exec()

if __name__ == "__main__":
    sys.exit(main())
