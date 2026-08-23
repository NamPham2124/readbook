import os
from pathlib import Path
from typing import Optional

def expand_path(path: str | Path) -> Path:
    """Expand user tilde and environment variables to absolute Path."""
    return Path(os.path.expandvars(os.path.expanduser(str(path)))).resolve()

def get_relative_category(file_path: Path, base_dir: Path) -> str:
    """Get category name from relative folder structure."""
    try:
        rel = file_path.parent.relative_to(base_dir)
        parts = rel.parts
        if not parts or parts == ('.',):
            return "General"
        return "/".join(parts)
    except ValueError:
        return "General"

def format_relative_time(iso_str: Optional[str]) -> str:
    """Format an ISO timestamp to human-friendly relative time."""
    if not iso_str:
        return "Never opened"
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(iso_str)
        now = datetime.now()
        diff = now - dt

        seconds = int(diff.total_seconds())
        if seconds < 0:
            return "Just now"
        if seconds < 60:
            return "Just now"
        minutes = seconds // 60
        if minutes < 60:
            return f"{minutes}m ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours}h ago"
        days = hours // 24
        if days == 1:
            return "Yesterday"
        if days < 7:
            return f"{days}d ago"
        return dt.strftime("%b %d, %Y")
    except Exception:
        return iso_str
