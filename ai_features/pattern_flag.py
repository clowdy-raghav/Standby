from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any

CANCELLED_AT_KEY = "cancelled_at"
IS_LATE_CANCEL_KEY = "is_late_cancel"
LATE_CANCELLATION_CUTOFF = timedelta(hours=2)


@dataclass(frozen=True)
class PatternConfig:

    window_days: int = 14
    threshold: int = 3

    def __post_init__(self) -> None:
        if self.window_days <= 0 or self.threshold <= 0:
            raise ValueError("window_days and threshold must be greater than zero.")


DEFAULT_CONFIG = PatternConfig()


@dataclass(frozen=True)
class PatternFlagResult:

    flagged: bool
    late_cancellations: int
    window_days: int
    threshold: int
    unreadable_records: int
    window_start: datetime
    window_end: datetime
    reason: str


def _to_utc(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        moment = value
    elif isinstance(value, date):
        moment = datetime(value.year, value.month, value.day)
    elif isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text[-1] in ("Z", "z"):
            text = text[:-1] + "+00:00"
        try:
            moment = datetime.fromisoformat(text)
        except ValueError:
            return None
    else:
        return None
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc)


def is_late_cancellation(
    cancelled_at: datetime | date | str | None,
    slot_start_time: datetime | date | str | None,
) -> bool | None:
    cancelled = _to_utc(cancelled_at)
    start = _to_utc(slot_start_time)
    if cancelled is None or start is None:
        return None
    return (start - cancelled) < LATE_CANCELLATION_CUTOFF


def _plural(count: int, word: str) -> str:
    return f"{count} {word}" if count == 1 else f"{count} {word}s"


def check_late_cancellations(
    records: Iterable[Mapping[str, Any]] | None,
    now: datetime | None = None,
    config: PatternConfig = DEFAULT_CONFIG,
) -> PatternFlagResult:
    if now is None:
        now = datetime.now(timezone.utc)
    now_utc = _to_utc(now) if isinstance(now, datetime) else None
    if now_utc is None:
        raise TypeError("now must be a datetime.")

    window_start = now_utc - timedelta(days=config.window_days)
    late_count = 0
    unreadable = 0

    for record in records or []:
        if not isinstance(record, Mapping):
            unreadable += 1
            continue
        moment = _to_utc(record.get(CANCELLED_AT_KEY))
        if moment is None:
            unreadable += 1
            continue
        if moment < window_start or moment > now_utc:
            continue
        is_late = record.get(IS_LATE_CANCEL_KEY)
        if not isinstance(is_late, bool):
            unreadable += 1
            continue
        if is_late:
            late_count += 1

    flagged = late_count >= config.threshold
    days_text = _plural(config.window_days, "day")
    if flagged:
        reason = (
            f"Flagged: {_plural(late_count, 'late cancel')} in {days_text}. Review?"
        )
    else:
        reason = (
            f"Not flagged: {_plural(late_count, 'late cancel')} in {days_text} "
            f"(review is suggested at {config.threshold} or more)."
        )
    if unreadable:
        reason += (
            f" {_plural(unreadable, 'record')} could not be read and "
            f"{'was' if unreadable == 1 else 'were'} ignored, so a person may "
            f"want to check."
        )

    return PatternFlagResult(
        flagged=flagged,
        late_cancellations=late_count,
        window_days=config.window_days,
        threshold=config.threshold,
        unreadable_records=unreadable,
        window_start=window_start,
        window_end=now_utc,
        reason=reason,
    )


def _show(title: str, result: PatternFlagResult) -> None:
    print(f"\n=== {title} ===")
    print(result.reason)
    print(f"flagged={result.flagged}, counted={result.late_cancellations}")


if __name__ == "__main__":
    NOW = datetime(2026, 10, 29, 12, 0, tzinfo=timezone.utc)

    def days_ago(days: float) -> datetime:
        return NOW - timedelta(days=days)

    below = [
        {"cancelled_at": days_ago(1), "is_late_cancel": True},
        {"cancelled_at": days_ago(5), "is_late_cancel": True},
        {"cancelled_at": days_ago(2), "is_late_cancel": False},
    ]
    _show("Below the threshold (2 late)", check_late_cancellations(below, now=NOW))

    at_threshold = [
        {"cancelled_at": days_ago(14), "is_late_cancel": True},
        {"cancelled_at": days_ago(7), "is_late_cancel": True},
        {"cancelled_at": days_ago(0.04), "is_late_cancel": True},
    ]
    _show(
        "Exactly at the threshold (one is exactly 14 days old, still counted)",
        check_late_cancellations(at_threshold, now=NOW),
    )

    outside = [
        {"cancelled_at": days_ago(1), "is_late_cancel": True},
        {"cancelled_at": days_ago(15), "is_late_cancel": True},
        {"cancelled_at": days_ago(30), "is_late_cancel": True},
        {"cancelled_at": NOW + timedelta(days=1), "is_late_cancel": True},
    ]
    _show(
        "Old and future records ignored (only 1 counts)",
        check_late_cancellations(outside, now=NOW),
    )

    _show("Empty list", check_late_cancellations([], now=NOW))
    _show("No records at all (None)", check_late_cancellations(None, now=NOW))

    messy = [
        {"cancelled_at": "2026-10-28T09:30:00Z", "is_late_cancel": True},
        {"cancelled_at": "2026-10-25", "is_late_cancel": True},
        {"cancelled_at": "not a date", "is_late_cancel": True},
        {"is_late_cancel": True},
        {"cancelled_at": days_ago(2), "is_late_cancel": "yes"},
        "garbage",
    ]
    _show(
        "Malformed records skipped (2 valid late cancels)",
        check_late_cancellations(messy, now=NOW),
    )

    strict = PatternConfig(window_days=7, threshold=2)
    _show(
        "Custom rule: 2 late cancels in 7 days",
        check_late_cancellations(below, now=NOW, config=strict),
    )

    print("\n=== is_late_cancellation helper ===")
    booking = datetime(2026, 10, 30, 18, 0, tzinfo=timezone.utc)
    print("Cancelled 1 hour before:", is_late_cancellation(booking - timedelta(hours=1), booking))
    print("Cancelled exactly 2 hours before:", is_late_cancellation(booking - timedelta(hours=2), booking))
    print("Cancelled 3 hours before:", is_late_cancellation(booking - timedelta(hours=3), booking))
    print("Unreadable time:", is_late_cancellation("oops", booking))