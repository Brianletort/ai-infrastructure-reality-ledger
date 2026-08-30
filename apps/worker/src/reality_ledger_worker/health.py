"""Side-effect-free worker health reporting."""

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True, slots=True)
class WorkerHealth:
    """Minimal startup health signal for local and CI smoke tests."""

    status: Literal["ready"]
    network_calls: int


def get_worker_health() -> WorkerHealth:
    """Return package readiness without touching external systems."""

    return WorkerHealth(status="ready", network_calls=0)
