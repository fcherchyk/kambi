"""HTTP errors shared by every domain."""

from fastapi import HTTPException, status


def not_found(what: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} not found")


def invalid(message: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, message)


def stale_version() -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, "Stale version: reload and try again")


def check_version(current: int, sent: int) -> None:
    if current != sent:
        raise stale_version()
