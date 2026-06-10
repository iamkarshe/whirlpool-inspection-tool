from starlette.types import ASGIApp, Message, Receive, Scope, Send


def get_content_security_policy() -> str:
    return (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'self'; "
        "form-action 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' data: https://fonts.gstatic.com; "
        "img-src 'self' data: blob:; "
        "media-src 'self' blob:; "
        "connect-src 'self'; "
        "manifest-src 'self'; "
        "worker-src 'self' blob:; "
        "upgrade-insecure-requests"
    )


def get_security_headers() -> dict[str, str]:
    return {
        "Content-Security-Policy": get_content_security_policy(),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = message.setdefault("headers", [])
                existing = {key.decode("latin-1").lower() for key, _ in headers}

                for name, value in get_security_headers().items():
                    if name.lower() not in existing:
                        headers.append(
                            (
                                name.encode("latin-1"),
                                value.encode("latin-1"),
                            )
                        )

            await send(message)

        await self.app(scope, receive, send_with_headers)
