from pathlib import Path

LOG = Path("data/audit.log")


def record(user, action, now):
    with LOG.open("a", encoding="utf-8") as handle:
        handle.write(f"{now} user={user} action={action}\n")
