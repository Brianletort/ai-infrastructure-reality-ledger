from reality_ledger_worker.health import WorkerHealth, get_worker_health


def test_worker_health_reports_ready_without_network_access() -> None:
    assert get_worker_health() == WorkerHealth(status="ready", network_calls=0)
