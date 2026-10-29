from __future__ import annotations

from datetime import date, datetime, timezone, tzinfo

EVENT_WORDING: dict[str, tuple[str, str]] = {
    "checked_in_on_time": (
        "You checked in on time for {item}, within 10 minutes of the start",
        "You checked in on time, within 10 minutes of the start",
    ),
    "checked_in_late": (
        "You checked in late for {item}, 10 to 30 minutes after the start",
        "You checked in late, 10 to 30 minutes after the start",
    ),
    "no_show": (
        "You did not check in for {item} within 30 minutes, so it counted as a no-show",
        "You did not check in within 30 minutes, so it counted as a no-show",
    ),
    "cancelled_24h_or_more": (
        "You cancelled {item} 24 hours or more before the slot",
        "You cancelled 24 hours or more before the slot",
    ),
    "cancelled_2_to_24h": (
        "You cancelled {item} between 2 and 24 hours before the slot",
        "You cancelled between 2 and 24 hours before the slot",
    ),
    "cancelled_under_2h_standby_filled": (
        "You cancelled {item} less than 2 hours before the slot, and a standby user filled it",
        "You cancelled less than 2 hours before the slot, and a standby user filled it",
    ),
    "cancelled_under_2h_not_filled": (
        "You cancelled {item} less than 2 hours before the slot, and it was not filled",
        "You cancelled less than 2 hours before the slot, and it was not filled",
    ),
    "standby_claimed_showed_up": (
        "You claimed a standby offer for {item} and showed up",
        "You claimed a standby offer and showed up",
    ),
    "standby_expired": (
        "You let a standby offer for {item} expire without answering",
        "You let a standby offer expire without answering",
    ),
    "returned_on_time_ok": (
        "You returned {item} on time and the condition checklist was OK",
        "You returned the item on time and the condition checklist was OK",
    ),
    "returned_late": (
        "You returned {item} late",
        "You returned the item late",
    ),
    "owner_flagged_damage": (
        "The owner flagged damage or a rule breach on {item}",
        "The owner flagged damage or a rule breach",
    ),
}

UNKNOWN_EVENT_WORDING = (
    "A score event ('{event_type}') was recorded for {item}",
    "A score event ('{event_type}') was recorded",
)
UNKNOWN_BLANK_EVENT_WORDING = (
    "A score event was recorded for {item}",
    "A score event was recorded",
)
NO_CHANGE_TEXT = "score change not available"
ZERO_CHANGE_TEXT = "no change to your score"


def _normalize_event_type(event_type: str | None) -> str:
    if not isinstance(event_type, str):
        return ""
    return event_type.strip().lower().replace(" ", "_").replace("-", "_")


def _clean_text(value: object) -> str:
    return "" if value is None else str(value).strip()


def _format_score_change(score_change: int | float | None) -> str:
    if isinstance(score_change, bool) or not isinstance(score_change, (int, float)):
        return NO_CHANGE_TEXT
    if isinstance(score_change, float) and score_change.is_integer():
        score_change = int(score_change)
    if score_change == 0:
        return ZERO_CHANGE_TEXT
    unit = "point" if abs(score_change) == 1 else "points"
    return f"{score_change:+} {unit}"


def _format_date(
    event_date: str | date | datetime | None, display_tz: tzinfo | None = None
) -> str:
    moment = None
    if isinstance(event_date, datetime):
        moment = event_date
        text = ""
    elif isinstance(event_date, date):
        text = event_date.isoformat()
    else:
        text = _clean_text(event_date)
        if "T" in text:
            iso = text[:-1] + "+00:00" if text[-1] in ("Z", "z") else text
            try:
                moment = datetime.fromisoformat(iso)
            except ValueError:
                moment = None
    if moment is not None:
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)
        text = moment.astimezone(display_tz or timezone.utc).date().isoformat()
    return f"On {text}: " if text else ""


def explain_score_event(
    event_type: str | None,
    score_change: int | float | None,
    item_name: str | None = None,
    event_date: str | date | datetime | None = None,
    display_tz: tzinfo | None = None,
) -> str:
    item = _clean_text(item_name)
    key = _normalize_event_type(event_type)

    if key in EVENT_WORDING:
        with_item, without_item = EVENT_WORDING[key]
    elif key:
        with_item, without_item = UNKNOWN_EVENT_WORDING
    else:
        with_item, without_item = UNKNOWN_BLANK_EVENT_WORDING

    template = with_item if item else without_item
    phrase = template.format(item=item, event_type=_clean_text(event_type))

    return f"{_format_date(event_date, display_tz)}{phrase} ({_format_score_change(score_change)})."


if __name__ == "__main__":
    examples = [
        dict(event_type="checked_in_on_time", score_change=5, item_name="Court A", event_date="2026-10-14T09:00:00Z"),
        dict(event_type="no_show", score_change=-20, item_name="Studio 2", event_date=date(2026, 10, 15)),
        dict(event_type="cancelled_24h_or_more", score_change=0, item_name="Court A", event_date="2026-10-16"),
        dict(event_type="Standby Claimed Showed Up", score_change=6, item_name="Projector", event_date="2026-10-17"),
        dict(event_type="owner_flagged_damage", score_change=-10, item_name="Camera", event_date="2026-10-18"),
        dict(event_type="returned_late", score_change=-3, item_name="   ", event_date=None),
        dict(event_type="mystery_event", score_change=7, item_name="Drone", event_date="2026-10-19T23:30:00Z"),
        dict(event_type=None, score_change=None, item_name=None, event_date=""),
    ]
    for example in examples:
        print(explain_score_event(**example))