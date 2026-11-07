"""Alembic environment. The database URL comes from `sqlalchemy.url` or DATABASE_URL."""

import os
from logging.config import fileConfig

from alembic import context

from app.auth import models as auth_models  # noqa: F401
from app.boards import models as boards_models  # noqa: F401
from app.card_types import models as card_types_models  # noqa: F401
from app.cards import models as cards_models  # noqa: F401
from app.columns import models as columns_models  # noqa: F401
from app.db import Base, make_engine

config = context.config
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def database_url() -> str:
    url = config.get_main_option("sqlalchemy.url") or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("Set DATABASE_URL to run migrations")
    return url


def run_migrations_offline() -> None:
    context.configure(url=database_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = make_engine(database_url())
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
