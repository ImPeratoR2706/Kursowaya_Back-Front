import os

import psycopg
from psycopg import sql


def main() -> None:
    host = os.getenv("PGHOST", "127.0.0.1")
    port = os.getenv("PGPORT", "5432")
    user = os.getenv("PGUSER", "postgres")
    password = os.getenv("PGPASSWORD", "")
    db = os.getenv("PGTARGET_DB", "hair_salon_db")

    conn = psycopg.connect(
        dbname="postgres",
        host=host,
        port=port,
        user=user,
        password=password,
    )
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (db,))
    exists = cur.fetchone() is not None
    if not exists:
        cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(db)))
        print(f"created database: {db}")
    else:
        print(f"database exists: {db}")
    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
