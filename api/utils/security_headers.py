from starlette.types import ASGIApp, Message, Receive, Scope, Send


def get_content_security_policy() -> str:
    return (
        "default-src 'self'; "
        "base-uri 'self'; "
        "object-src 'none'; "
        "frame-ancestors 'self'; "
        "form-action 'self'; "
        # Network calls:
        # - self: your own API
        # - amazonaws: dynamic user-configured S3 pre-signed PUT/GET
        # - cdn.jsdelivr.net: Scalar JS/CSS/assets
        # - fastly.jsdelivr.net: jsDelivr WASM/source-map asset host
        "connect-src 'self' https://*.amazonaws.com https://cdn.jsdelivr.net https://fastly.jsdelivr.net; "
        # Images:
        # - self/data/blob: app assets, previews
        # - amazonaws: uploaded image previews from S3
        # - jsdelivr: Scalar/theme assets if any
        "img-src 'self' data: blob: https://*.amazonaws.com https://cdn.jsdelivr.net https://fastly.jsdelivr.net; "
        # Audio/video:
        # - data: needed for base64 audio such as data:audio/mp3;base64,...
        # - blob: needed for browser-created media previews
        # - amazonaws: S3 media previews
        "media-src 'self' data: blob: https://*.amazonaws.com; "
        # PDF/document preview inside iframe
        "frame-src 'self' https://*.amazonaws.com; "
        "child-src 'self' https://*.amazonaws.com; "
        # Scalar docs JS from JSDelivr.
        # unsafe-inline is needed only if your Scalar config is inline.
        # wasm-unsafe-eval is needed for zxing-wasm / WebAssembly.
        "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://fastly.jsdelivr.net; "
        # Scalar CSS + Google Fonts CSS + inline styles used by UI libs
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://fastly.jsdelivr.net; "
        # Google font files, local fontsource fonts, Scalar fonts if any
        "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://fastly.jsdelivr.net; "
        "manifest-src 'self'; "
        "worker-src 'self' blob:; "
        "upgrade-insecure-requests"
    )


def get_security_headers() -> dict[str, str]:
    return {
        "Content-Security-Policy": get_content_security_policy(),
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
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
