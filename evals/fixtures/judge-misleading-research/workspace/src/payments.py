def capture(http, order_id, amount):
    return http.post("/capture", json={"order": order_id, "amount": amount})
