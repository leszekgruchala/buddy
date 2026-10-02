def request_options(region=None):
    return {} if region is None else {"region": region}
