from dataclasses import dataclass


@dataclass(frozen=True)
class CorsConfig:
    allowed_origins: list[str]
    allow_credentials: bool
    allow_methods: list[str]
    allow_headers: list[str]
    expose_headers: list[str]


def split_csv(value: str | None) -> list[str]:
    if not value:
        return []

    return [
        item.strip().rstrip("/")
        for item in value.split(",")
        if item.strip()
    ]


def get_cors_config(
    *,
    app_env: str,
    app_origin: str | None,
    app_cors_origins: str | None,
    expose_headers: list[str] | None = None,
) -> CorsConfig:
    env = (app_env or "dev").strip().lower()

    configured_origins = split_csv(app_cors_origins)

    if configured_origins:
        allowed_origins = configured_origins
    elif env in {"dev", "local"}:
        allowed_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    else:
        if not app_origin:
            raise RuntimeError(
                "APP_ORIGIN or APP_CORS_ORIGINS must be configured outside dev."
            )

        allowed_origins = [app_origin.strip().rstrip("/")]

    return CorsConfig(
        allowed_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=[
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "X-CSRF-Token",
            "X-Client-Version",
            "X-Device-Id",
            "x-job-execute-token",
            "x-critical-admin-delete-token",
        ],
        expose_headers=expose_headers or [],
    )
