def retry_count(deliveries):
    """Count deliveries that required at least one retry in the dashboard."""
    return sum(delivery.retry_attempts > 0 for delivery in deliveries)
