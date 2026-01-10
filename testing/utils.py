import json
from typing import Any


class Colors:
    RESET = "\033[0m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    CYAN = "\033[36m"
    BOLD = "\033[1m"


def _colored(text: str, color: str) -> str:
    return f"{color}{text}{Colors.RESET}"


def _strip_ansi(text: str) -> str:
    return (
        text.replace(Colors.RESET, "")
        .replace(Colors.RED, "")
        .replace(Colors.GREEN, "")
        .replace(Colors.YELLOW, "")
        .replace(Colors.BLUE, "")
        .replace(Colors.CYAN, "")
        .replace(Colors.BOLD, "")
    )


def render_box(title: str, lines: list[str], color: str) -> str:
    clean_lines = [_strip_ansi(line) for line in lines]
    width = max(len(_strip_ansi(title)), *(len(line) for line in clean_lines)) + 4
    top = f"┌{'─' * (width - 2)}┐"
    title_line = f"│ {title.ljust(width - 4)} │"
    body = [f"│ {line.ljust(width - 4)} │" for line in lines]
    bottom = f"└{'─' * (width - 2)}┘"
    return "\n".join([_colored(top, color), _colored(title_line, color), *(_colored(line, color) for line in body), _colored(bottom, color)])


def log_info(message: str, verbose: bool = True):
    if verbose:
        print(_colored(f"[INFO] {message}", Colors.BLUE))


def log_ok(message: str, verbose: bool = True):
    if verbose:
        print(_colored(f"[OK]   {message}", Colors.GREEN))


def log_warn(message: str, verbose: bool = True):
    if verbose:
        print(_colored(f"[WARN] {message}", Colors.YELLOW))


def log_step(message: str, verbose: bool = True):
    if verbose:
        print(_colored(f"[STEP] {message}", Colors.CYAN))


def log_fail(message: str):
    print(_colored(f"[FAIL] {message}", Colors.RED))


class TestFailure(Exception):
    pass


def expect(condition: bool, message: str):
    if not condition:
        raise TestFailure(message)


def parse_json(response) -> dict[str, Any]:
    try:
        return response.json()
    except json.JSONDecodeError as exc:
        raise TestFailure(f"Invalid JSON response: {response.text}") from exc
