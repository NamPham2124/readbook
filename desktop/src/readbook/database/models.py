from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
import json

@dataclass
class Book:
    id: Optional[int]
    path: str
    title: str
    category: str = "General"
    total_pages: int = 1
    last_page: int = 1
    last_opened: Optional[str] = None
    created_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class Note:
    id: Optional[int]
    book_id: int
    page: int
    content: str
    updated_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class Bookmark:
    id: Optional[int]
    book_id: int
    page: int
    name: str
    created_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class Highlight:
    id: Optional[int]
    book_id: int
    page: int
    selected_text: str
    coordinates: str  # JSON list of rects: [{"x0": ..., "y0": ..., "x1": ..., "y1": ...}]
    color: str = "#FFEB3B"  # Default yellow
    created_at: Optional[str] = None

    def parsed_coordinates(self) -> List[Dict[str, float]]:
        try:
            return json.loads(self.coordinates)
        except Exception:
            return []

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
