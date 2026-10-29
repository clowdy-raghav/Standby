from __future__ import annotations

import math
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RankingConfig:

    reliability_weight: float = 0.5
    waiting_weight: float = 0.3
    usage_weight: float = 0.2

    waiting_cap_minutes: float = 60.0
    usage_cap_count: float = 10.0

    default_reliability: float = 50.0
    default_waiting_minutes: float = 0.0
    default_recent_usage: float = 0.0

    def __post_init__(self) -> None:
        weights = (self.reliability_weight, self.waiting_weight, self.usage_weight)
        if any(w < 0 for w in weights) or sum(weights) <= 0:
            raise ValueError("Weights must be non-negative and not all zero.")
        if self.waiting_cap_minutes <= 0 or self.usage_cap_count <= 0:
            raise ValueError("Caps must be greater than zero.")


DEFAULT_CONFIG = RankingConfig()

RECENT_USAGE_WINDOW_DAYS = 30


@dataclass(frozen=True)
class RankedPerson:

    rank: int
    user_id: str
    score: float
    reason: str
    breakdown: dict[str, float]


def _parse_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        try:
            value = float(value.strip())
        except ValueError:
            return None
    if isinstance(value, (int, float)) and math.isfinite(value):
        return float(value)
    return None


def _read(
    person: Mapping[str, Any],
    key: str,
    default: float,
    low: float,
    high: float | None = None,
) -> tuple[float, bool]:
    number = _parse_number(person.get(key))
    if number is None:
        return default, True
    number = max(number, low)
    if high is not None:
        number = min(number, high)
    return number, False


def _fmt(value: float) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:.1f}"


def _ordinal(n: int) -> str:
    if 10 <= n % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def rank_standby_queue(
    people: Iterable[Mapping[str, Any]] | None,
    config: RankingConfig = DEFAULT_CONFIG,
) -> list[RankedPerson]:
    total_weight = (
        config.reliability_weight + config.waiting_weight + config.usage_weight
    )
    entries: list[dict[str, Any]] = []

    for position, person in enumerate(people or []):
        if not isinstance(person, Mapping):
            person = {}
        notes: list[str] = []

        raw_id = person.get("user_id")
        user_id = "" if raw_id is None else str(raw_id).strip()
        if not user_id:
            user_id = f"unknown_{position + 1}"
            notes.append("user_id missing")

        reliability, rel_default = _read(
            person, "reliability_score", config.default_reliability, 0.0, 100.0
        )
        waiting, wait_default = _read(
            person, "waiting_minutes", config.default_waiting_minutes, 0.0
        )
        usage, usage_default = _read(
            person, "recent_usage_count", config.default_recent_usage, 0.0
        )
        if rel_default:
            notes.append(f"reliability missing, assumed {_fmt(reliability)}")
        if wait_default:
            notes.append(f"waiting time missing, assumed {_fmt(waiting)} min")
        if usage_default:
            notes.append(f"recent usage missing, assumed {_fmt(usage)}")

        parts = {
            "reliability": reliability / 100.0,
            "waiting": min(waiting, config.waiting_cap_minutes) / config.waiting_cap_minutes,
            "usage": 1.0 - min(usage, config.usage_cap_count) / config.usage_cap_count,
        }
        weights = {
            "reliability": config.reliability_weight,
            "waiting": config.waiting_weight,
            "usage": config.usage_weight,
        }
        breakdown = {
            name: 100.0 * weights[name] * parts[name] / total_weight for name in parts
        }
        score = sum(breakdown.values())

        entries.append(
            {
                "position": position,
                "user_id": user_id,
                "reliability": reliability,
                "waiting": waiting,
                "usage": usage,
                "score": score,
                "breakdown": breakdown,
                "notes": notes,
            }
        )

    entries.sort(
        key=lambda e: (
            -round(e["score"], 6),
            -e["reliability"],
            -e["waiting"],
            e["usage"],
            e["user_id"],
            e["position"],
        )
    )

    ranked: list[RankedPerson] = []
    for rank, e in enumerate(entries, start=1):
        unit = "booking" if e["usage"] == 1 else "bookings"
        reason = (
            f"Ranked {_ordinal(rank)}: reliability {_fmt(e['reliability'])}, "
            f"waiting {_fmt(e['waiting'])} min, "
            f"{_fmt(e['usage'])} {unit} in the last {RECENT_USAGE_WINDOW_DAYS} days. "
            f"Score {e['score']:.1f}/100."
        )
        if e["notes"]:
            reason += " Note: " + "; ".join(e["notes"]) + "."
        ranked.append(
            RankedPerson(
                rank=rank,
                user_id=e["user_id"],
                score=round(e["score"], 2),
                reason=reason,
                breakdown={k: round(v, 2) for k, v in e["breakdown"].items()},
            )
        )
    return ranked


def _show(title: str, ranked: list[RankedPerson]) -> None:
    print(f"\n=== {title} ===")
    if not ranked:
        print("(nobody is waiting)")
    for person in ranked:
        print(f"{person.user_id}: {person.reason}")


if __name__ == "__main__":
    people = [
        {"user_id": "u_ana", "reliability_score": 85, "waiting_minutes": 40, "recent_usage_count": 2},
        {"user_id": "u_ben", "reliability_score": 60, "waiting_minutes": 55, "recent_usage_count": 8},
        {"user_id": "u_dev"},
    ]
    print("=== Quick example ===")
    for person in rank_standby_queue(people):
        print(person.reason)

    waiting_list = [
        {"user_id": "u_ana", "reliability_score": 85, "waiting_minutes": 40, "recent_usage_count": 2},
        {"user_id": "u_ben", "reliability_score": 60, "waiting_minutes": 55, "recent_usage_count": 8},
        {"user_id": "u_cara", "reliability_score": 90, "waiting_minutes": 10, "recent_usage_count": 0},
        {"user_id": "u_dev"},
        {"user_id": "u_eli", "reliability_score": "n/a", "waiting_minutes": -5, "recent_usage_count": None},
    ]
    _show("Main example", rank_standby_queue(waiting_list))

    same_score = [
        {"user_id": "u_yan", "reliability_score": 40, "waiting_minutes": 60, "recent_usage_count": 5},
        {"user_id": "u_zoe", "reliability_score": 80, "waiting_minutes": 0, "recent_usage_count": 0},
    ]
    _show("Same score, tie-break by reliability", rank_standby_queue(same_score))

    identical = [
        {"user_id": "u_bob", "reliability_score": 70, "waiting_minutes": 20, "recent_usage_count": 3},
        {"user_id": "u_amy", "reliability_score": 70, "waiting_minutes": 20, "recent_usage_count": 3},
    ]
    _show("Identical values, tie-break by user_id", rank_standby_queue(identical))

    _show("Empty list", rank_standby_queue([]))

    waiting_heavy = RankingConfig(reliability_weight=0.3, waiting_weight=0.6, usage_weight=0.1)
    _show("Same main list, waiting time weighted more", rank_standby_queue(waiting_list, waiting_heavy))