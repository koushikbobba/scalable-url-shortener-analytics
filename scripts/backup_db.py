"""
Database Backup and Disaster Recovery Script for LinkStream.
Supports PostgreSQL dumps via pg_dump and SQLite snapshot backups with timestamped retention.
"""
import os
import sys
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
BACKUP_DIR = BASE_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def backup_sqlite():
    db_file = BASE_DIR / "backend" / "db.sqlite3"
    if not db_file.exists():
        db_file = BASE_DIR / "db.sqlite3"
    if not db_file.exists():
        print("[ERROR] No SQLite database file found to backup.")
        return False

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = BACKUP_DIR / f"sqlite_backup_{timestamp}.sqlite3"
    shutil.copy2(db_file, dest)
    print(f"[SUCCESS] SQLite database snapshot created: {dest} ({dest.stat().st_size} bytes)")
    return True

def backup_postgres():
    db_name = os.getenv("POSTGRES_DB", "url_shortener_db")
    db_user = os.getenv("POSTGRES_USER", "postgres")
    db_host = os.getenv("POSTGRES_HOST", "localhost")
    db_port = os.getenv("POSTGRES_PORT", "5432")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest = BACKUP_DIR / f"pg_backup_{db_name}_{timestamp}.sql"

    cmd = [
        "pg_dump",
        "-h", db_host,
        "-p", db_port,
        "-U", db_user,
        "-F", "c",
        "-b",
        "-v",
        "-f", str(dest),
        db_name
    ]

    try:
        subprocess.run(cmd, check=True)
        print(f"[SUCCESS] PostgreSQL database dump created: {dest}")
        return True
    except (subprocess.SubprocessError, FileNotFoundError) as e:
        print(f"[WARN] pg_dump failed ({e}). Falling back to SQLite snapshot check.")
        return backup_sqlite()

def cleanup_old_backups(keep_days: int = 14):
    """Prunes backups older than keep_days."""
    now = datetime.now().timestamp()
    cutoff = now - (keep_days * 86400)
    for f in BACKUP_DIR.iterdir():
        if f.is_file() and f.stat().st_mtime < cutoff:
            f.unlink()
            print(f"[CLEANUP] Pruned expired backup: {f.name}")

if __name__ == "__main__":
    use_sqlite = os.getenv("USE_SQLITE", "false").lower() in ("true", "1")
    success = backup_sqlite() if use_sqlite else backup_postgres()
    cleanup_old_backups()
    sys.exit(0 if success else 1)
