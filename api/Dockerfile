FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.10.2 /uv /usr/local/bin/uv

WORKDIR /app
ENV UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/opt/venv

COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev

COPY alembic.ini ./
COPY app ./app
COPY migrations ./migrations

EXPOSE 8001
CMD ["sh", "-c", "uv run --no-dev alembic upgrade head && uv run --no-dev uvicorn --factory app.main:create_app --host 0.0.0.0 --port 8001"]
