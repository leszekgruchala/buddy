def session_valid(now, expires_at):
    return now <= expires_at
