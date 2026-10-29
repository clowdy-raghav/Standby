from __future__ import annotations

from dataclasses import dataclass
from typing import Any

SUMMARY_LABEL = "Suggested summary — please verify."
NO_NOTE_TEXT = "No note provided"
SHORTENED_MARKER = " [shortened - see original note]"
DEFAULT_MAX_NOTE_CHARS = 500

LINE_TEMPLATES: tuple[tuple[str, str], ...] = (
    ("before_condition_notes", "Before: {note}"),
    ("after_condition_notes", "After: {note}"),
    ("user_comment", "User comment: {note}"),
)


@dataclass(frozen=True)
class IncidentSummary:

    label: str
    lines: tuple[str, str, str]
    missing_notes: tuple[str, ...]
    original_notes: dict[str, str | None]

    @property
    def text(self) -> str:
        return "\n".join((self.label, *self.lines))


def _original_text(value: Any) -> str | None:
    if value is None:
        return None
    return value if isinstance(value, str) else str(value)


def _clean(value: Any) -> str:
    text = _original_text(value)
    return "" if text is None else " ".join(text.split())


def _shorten(text: str, max_chars: int) -> tuple[str, bool]:
    if len(text) <= max_chars:
        return text, False
    return text[: max_chars - 3].rstrip() + "...", True


def build_incident_summary(
    before_condition_notes: str | None,
    after_condition_notes: str | None,
    user_comment: str | None,
    max_note_chars: int = DEFAULT_MAX_NOTE_CHARS,
) -> IncidentSummary:
    if max_note_chars < 10:
        raise ValueError("max_note_chars must be at least 10.")

    supplied = {
        "before_condition_notes": before_condition_notes,
        "after_condition_notes": after_condition_notes,
        "user_comment": user_comment,
    }
    lines: list[str] = []
    missing: list[str] = []
    originals: dict[str, str | None] = {}

    for key, template in LINE_TEMPLATES:
        raw = supplied[key]
        originals[key] = _original_text(raw)
        cleaned = _clean(raw)
        if not cleaned:
            missing.append(key)
            note = NO_NOTE_TEXT
        else:
            note, was_shortened = _shorten(cleaned, max_note_chars)
            if was_shortened:
                note += SHORTENED_MARKER
        lines.append(template.format(note=note))

    return IncidentSummary(
        label=SUMMARY_LABEL,
        lines=(lines[0], lines[1], lines[2]),
        missing_notes=tuple(missing),
        original_notes=originals,
    )


def _show(title: str, result: IncidentSummary) -> None:
    print(f"\n=== {title} ===")
    print(result.text)
    print("-- original notes (for comparison) --")
    for key, value in result.original_notes.items():
        print(f"{key}: {value!r}")
    if result.missing_notes:
        print("missing:", ", ".join(result.missing_notes))


if __name__ == "__main__":
    _show(
        "All notes present",
        build_incident_summary(
            before_condition_notes="Screen clean, no visible marks. Case intact.",
            after_condition_notes="Small scratch on the left edge of the screen.",
            user_comment="I did not notice the scratch when I returned it.",
        ),
    )

    _show(
        "After note missing, comment blank",
        build_incident_summary(
            before_condition_notes="Lens clear, strap in good shape.",
            after_condition_notes=None,
            user_comment="   ",
        ),
    )

    _show(
        "Only a comment",
        build_incident_summary(
            before_condition_notes="",
            after_condition_notes="\n\t ",
            user_comment="The latch felt loose when I picked it up.",
        ),
    )

    _show("Everything missing", build_incident_summary(None, None, None))

    _show(
        "Messy spacing and line breaks",
        build_incident_summary(
            before_condition_notes="  Paint   fresh,\n\n no chips.  ",
            after_condition_notes="Chip near the\tbottom corner.",
            user_comment="Not sure when it happened.",
        ),
    )

    long_note = (
        "Checked the front, back and both sides in good light before handing "
        "over. Front glass clear, back panel clean, both side rails smooth, "
        "buttons responsive, ports free of dust, and the serial sticker is "
        "readable and intact."
    )
    _show(
        "Long note is shortened in the summary, kept in full in the original",
        build_incident_summary(
            long_note, "Same as before except a dent.", None, max_note_chars=140
        ),
    )