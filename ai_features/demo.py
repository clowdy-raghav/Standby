from datetime import datetime, timedelta, timezone

import explain
import incident_summary
import pattern_flag
import ranking


def demo_explain() -> None:
    print("1. Score explanations (explain.py)")
    events = [
        ("checked_in_on_time", 5, "Court A", "2026-10-14T09:00:00Z"),
        ("no_show", -20, "Studio 2", "2026-10-15"),
        ("cancelled_24h_or_more", 0, "Court A", "2026-10-16"),
        ("returned_late", -3, "", None),
        ("mystery_event", 7, "Drone", "2026-10-19"),
    ]
    for event_type, change, item, when in events:
        print("  ", explain.explain_score_event(event_type, change, item, when))


def demo_ranking() -> None:
    print("2. Standby queue ranking (ranking.py)")
    people = [
        {"user_id": "u_ana", "reliability_score": 85, "waiting_minutes": 40, "recent_usage_count": 2},
        {"user_id": "u_ben", "reliability_score": 60, "waiting_minutes": 55, "recent_usage_count": 8},
        {"user_id": "u_cara", "reliability_score": 90, "waiting_minutes": 10, "recent_usage_count": 0},
        {"user_id": "u_new"},
    ]
    for person in ranking.rank_standby_queue(people):
        print("  ", person.user_id, "->", person.reason)


def demo_pattern_flag() -> None:
    print("3. Repeated late cancellations (pattern_flag.py)")
    now = datetime(2026, 10, 29, 12, 0, tzinfo=timezone.utc)

    def record(booking_id, user_id, days_before_now, late, hours_before_slot):
        cancelled = now - timedelta(days=days_before_now)
        slot_start = cancelled + timedelta(hours=hours_before_slot)
        return {
            "booking_id": booking_id,
            "user_id": user_id,
            "cancelled_at": cancelled.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "slot_start_time": slot_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "is_late_cancel": late,
            "review_status": None,
        }

    sam_records = [
        record("b_101", "u_sam", 1, True, 1),
        record("b_102", "u_sam", 4, True, 1),
        record("b_103", "u_sam", 9, True, 1),
    ]
    priya_records = [
        record("b_201", "u_priya", 2, True, 1),
        record("b_202", "u_priya", 6, True, 1),
        record("b_203", "u_priya", 20, True, 1),
    ]

    for name, records in [("Sam", sam_records), ("Priya", priya_records)]:
        result = pattern_flag.check_late_cancellations(records, now=now)
        print("  ", name, "->", result.reason)

    booking_start = datetime(2026, 10, 30, 18, 0, tzinfo=timezone.utc)
    cancelled_at = booking_start - timedelta(hours=1)
    print("   Was a cancellation 1 hour before the booking late?",
          pattern_flag.is_late_cancellation(cancelled_at, booking_start))


def demo_incident_summary() -> None:
    print("4. Incident summary (incident_summary.py)")

    full = incident_summary.build_incident_summary(
        before_condition_notes="Screen clean, no visible marks.",
        after_condition_notes="Small scratch on the left edge of the screen.",
        user_comment="I did not notice the scratch when I returned it.",
    )
    print(full.text)
    print("   Original notes kept:", full.original_notes)

    print()
    partial = incident_summary.build_incident_summary(
        before_condition_notes="Lens clear, strap in good shape.",
        after_condition_notes=None,
        user_comment="   ",
    )
    print(partial.text)
    print("   Missing notes:", partial.missing_notes)


if __name__ == "__main__":
    demo_explain()
    print()
    demo_ranking()
    print()
    demo_pattern_flag()
    print()
    demo_incident_summary()