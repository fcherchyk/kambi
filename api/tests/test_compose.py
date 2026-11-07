"""S1_AC1: compose publishes only on localhost, and `.env.example` covers the config."""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

from app.config import ENV_VARS

ROOT = Path(__file__).resolve().parents[2]
COMPOSE_FILE = ROOT / "docker-compose.yml"
ENV_EXAMPLE = ROOT / ".env.example"
PLACEHOLDER = re.compile(r"change-me|your-|replace-with|example|localhost|^(true|false)$")


def env_example() -> dict[str, str]:
    pairs = {}
    for line in ENV_EXAMPLE.read_text().splitlines():
        if line.strip() and not line.lstrip().startswith("#"):
            name, _, value = line.partition("=")
            pairs[name.strip()] = value.strip()
    return pairs


def compose_config() -> dict | None:
    """The resolved compose config, or None when Docker Compose is not installed."""
    if shutil.which("docker") is None:
        return None
    result = subprocess.run(
        [
            "docker",
            "compose",
            "-f",
            str(COMPOSE_FILE),
            "--env-file",
            str(ENV_EXAMPLE),
            "config",
            "--format",
            "json",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        pytest.fail(f"docker compose config failed: {result.stderr}")
    return json.loads(result.stdout)


def published_ports(config: dict, service: str) -> list[tuple[str, str, str]]:
    return [
        (port.get("host_ip", ""), str(port.get("published", "")), str(port["target"]))
        for port in config["services"][service].get("ports", [])
    ]


def test_S1_AC1_compose_publishes_only_on_localhost() -> None:
    config = compose_config()
    if config is None:
        text = COMPOSE_FILE.read_text()
        assert re.findall(r'"([\d.]+:\d+:\d+)"', text) == [
            "127.0.0.1:8001:8001",
            "127.0.0.1:5174:5174",
        ]
        return

    assert published_ports(config, "api") == [("127.0.0.1", "8001", "8001")]
    assert published_ports(config, "web") == [("127.0.0.1", "5174", "5174")]
    assert published_ports(config, "db") == []
    assert "db-data" in config["volumes"]


def test_S1_AC1_env_example_lists_every_variable_without_real_values() -> None:
    pairs = env_example()

    assert set(ENV_VARS) | {"POSTGRES_PASSWORD"} <= set(pairs)
    for name, value in pairs.items():
        assert value, name
        assert PLACEHOLDER.search(value), f"{name} does not look like a placeholder"
        assert not value.startswith("GOCSPX-"), name


def test_S1_AC1_compose_reads_only_variables_listed_in_env_example() -> None:
    used = set(re.findall(r"\$\{(\w+)", COMPOSE_FILE.read_text()))

    assert used <= set(env_example())


def in_git_repo() -> bool:
    if shutil.which("git") is None:
        return False
    result = subprocess.run(
        ["git", "rev-parse", "--is-inside-work-tree"], cwd=ROOT, capture_output=True, text=True
    )
    return result.returncode == 0 and result.stdout.strip() == "true"


# Asks git which files it ignores; outside a repository (e.g. a `git archive` copy) it is skipped.
@pytest.mark.skipif(not in_git_repo(), reason="not inside a git repository")
def test_S1_AC1_dot_env_is_ignored_by_git() -> None:
    result = subprocess.run(
        ["git", "check-ignore", "-q", ".env"], cwd=ROOT, capture_output=True, check=False
    )
    assert result.returncode == 0
    example = subprocess.run(
        ["git", "check-ignore", "-q", ".env.example"], cwd=ROOT, capture_output=True, check=False
    )
    assert example.returncode == 1
