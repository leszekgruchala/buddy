def retry_count(deliveries):
    """Count every retry attempt emitted by the worker."""
    return sum(delivery.retry_attempts for delivery in deliveries)
