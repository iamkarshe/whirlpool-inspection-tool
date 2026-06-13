from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import PlainTextResponse


BLOCKED_EXACT_PATHS = {
    "/.env",
    "/.env.local",
    "/.env.production",
    "/.env.development",
    "/.git",
    "/.git/config",
    "/.svn",
    "/.hg",
    "/.DS_Store",
    "/.CSNews.cgi",
    "/CSNews.cgi",
    "/composer.json",
    "/composer.lock",
    "/package-lock.json",
    "/pnpm-lock.yaml",
    "/yarn.lock",
    "/Dockerfile",
    "/docker-compose.yml",
    "/docker-compose.yaml",
    "/config.json",
    "/settings.json",
    "/secrets.json",
    "/credentials.json",
    "/release.json",
}

BLOCKED_PREFIXES = (
    "/.git/",
    "/.svn/",
    "/.hg/",
    "/backup/",
    "/backups/",
    "/dump/",
    "/database/",
    "/db/",
    "/settings/",
    "/secrets/",
)


class BlockSensitiveProbePathsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if path in BLOCKED_EXACT_PATHS:
            return PlainTextResponse("Not Found", status_code=404)

        if path.startswith(BLOCKED_PREFIXES):
            return PlainTextResponse("Not Found", status_code=404)

        # Generic hidden file blocking, except /.well-known/
        if path.startswith("/.") and not path.startswith("/.well-known/"):
            return PlainTextResponse("Not Found", status_code=404)

        return await call_next(request)
