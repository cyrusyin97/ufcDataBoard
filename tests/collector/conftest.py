"""Collector tests must never perform source requests."""
import pytest
import requests

@pytest.fixture(autouse=True)
def no_source_network(monkeypatch):
    def denied(*args, **kwargs):
        raise AssertionError("Network access is forbidden in collector tests")
    monkeypatch.setattr(requests.sessions.Session, "request", denied)
