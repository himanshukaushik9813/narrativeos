from __future__ import annotations

import html
import re
import unicodedata
from typing import Any


NON_ENGLISH_RE = re.compile(r"[^\x00-\x7F]")
ALNUM_RE = re.compile(r"[A-Za-z0-9]")


def strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html.unescape(value))
    return re.sub(r"\s+", " ", text).strip()


def has_non_english(value: str | None) -> bool:
    return bool(value and NON_ENGLISH_RE.search(value))


def english_text(value: Any, fallback: str) -> str:
    raw = strip_html(str(value or ""))
    normalized = unicodedata.normalize("NFKD", raw)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"\s+", " ", ascii_only).strip(" -")
    if not cleaned or not ALNUM_RE.search(cleaned):
        return fallback
    return cleaned


def english_title(value: Any, fallback: str) -> str:
    cleaned = english_text(value, fallback)
    generic = re.sub(r"[^a-z0-9]+", " ", cleaned.lower()).strip()
    if generic in {"narrative path", "market path", "linear path", "narrative path linear path", "market path linear path"}:
        return fallback
    if generic.startswith("narrative path ") or generic.startswith("market path "):
        return fallback
    return cleaned


def english_identifier(value: Any) -> str | None:
    cleaned = english_text(value, "")
    cleaned = re.sub(r"[^A-Za-z0-9._:/-]+", " ", cleaned).strip()
    if not cleaned or not ALNUM_RE.search(cleaned):
        return None
    return cleaned.upper()


def english_json(value: Any, fallback: str = "SoSoValue signal") -> Any:
    if isinstance(value, str):
        if has_non_english(value):
            return english_text(value, fallback)
        return value
    if isinstance(value, list):
        return [english_json(item, fallback=fallback) for item in value]
    if isinstance(value, tuple):
        return tuple(english_json(item, fallback=fallback) for item in value)
    if isinstance(value, dict):
        return {key: english_json(item, fallback=fallback) for key, item in value.items()}
    return value
