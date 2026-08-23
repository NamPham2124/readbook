import os
from pathlib import Path

# XDG Standard Directories for Linux
XDG_DATA_HOME = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
XDG_CONFIG_HOME = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
XDG_CACHE_HOME = Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache"))

APP_DATA_DIR = XDG_DATA_HOME / "readbook"
APP_CONFIG_DIR = XDG_CONFIG_HOME / "readbook"
APP_CACHE_DIR = XDG_CACHE_HOME / "readbook"

DEFAULT_BOOKS_DIR = Path.home() / "Book"
DEFAULT_DB_PATH = APP_DATA_DIR / "readbook.db"

SUPPORTED_EXTENSIONS = {".pdf", ".epub", ".mobi", ".fb2", ".cbz", ".cbr", ".xps"}
SUPPORTED_EXTENSIONS_FILTER = "Supported Books (*.pdf *.epub *.mobi *.fb2 *.cbz *.cbr *.xps);;PDF Files (*.pdf);;EPUB Files (*.epub);;All Files (*)"

def ensure_app_dirs() -> None:
    """Ensure all application directories exist."""
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    APP_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    APP_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    DEFAULT_BOOKS_DIR.mkdir(parents=True, exist_ok=True)
