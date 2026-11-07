"""Request dependencies: the authenticated user."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.sessions import SESSION_COOKIE, user_for_token
from app.db import get_db

# "function" scope commits before the response is sent, so a failed commit is not a 2xx.
DbSession = Annotated[Session, Depends(get_db, scope="function")]


def current_user(request: Request, db: DbSession) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    user = user_for_token(db, token) if token else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


CurrentUser = Annotated[User, Depends(current_user)]
