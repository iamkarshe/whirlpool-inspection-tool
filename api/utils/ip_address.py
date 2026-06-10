from fastapi import Request


def get_client_ip_address(request: Request) -> str | None:
    # If app is behind Nginx / load balancer / reverse proxy
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # First IP is usually the original client IP
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    # Direct connection to FastAPI / Uvicorn
    if request.client:
        return request.client.host

    return None
