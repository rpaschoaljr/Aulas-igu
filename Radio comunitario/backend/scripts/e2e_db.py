import asyncio
import os
import sys

import asyncpg

ADMIN_DSN = os.environ.get(
    "ADMIN_DATABASE_DSN", "postgresql://radio:radio@localhost:5432/radio"
)
E2E_DATABASE = "radio_e2e"


async def create() -> None:
    conn = await asyncpg.connect(ADMIN_DSN)
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", E2E_DATABASE
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{E2E_DATABASE}"')
    finally:
        await conn.close()


async def drop() -> None:
    conn = await asyncpg.connect(ADMIN_DSN)
    try:
        await conn.execute(f'DROP DATABASE IF EXISTS "{E2E_DATABASE}" WITH (FORCE)')
    finally:
        await conn.close()


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "create":
        asyncio.run(create())
    elif command == "drop":
        asyncio.run(drop())
    else:
        raise SystemExit("uso: python scripts/e2e_db.py create|drop")


if __name__ == "__main__":
    main()
