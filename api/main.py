from pathlib import Path
from urllib.parse import quote

from fastapi import Depends, FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from mod.api.device.router import router as device_router
from mod.api.inspection.router import router as inspection_router
from mod.api.integration.router import router as integration_router
from mod.api.log.router import router as log_router
from mod.api.login.router import router as login_router
from mod.api.password_reset.router import router as password_reset_router
from mod.api.plant.router import router as plant_router
from mod.api.product.router import router as product_router
from mod.api.product_category.router import router as product_category_router
from mod.api.reports.router import router as reports_router
from mod.api.server_health.router import router as server_health_router
from mod.api.sku.router import router as sku_router
from mod.api.tasks.router import router as tasks_router
from mod.api.user.router import router as user_router
from mod.api.vpn.router import router as vpn_router
from mod.api.warehouse.router import router as warehouse_router
from mod.app.helper import require_superadmin_for_api_docs
from mod.app.response import VersionResponse
from mod.app.router import router as app_router
from mod.auth.device_router import router as auth_device_router
from mod.auth.password_router import router as auth_password_router
from mod.auth.router import router as auth_router
from mod.jobs.router import router as jobs_router
from mod.okta.router import router as okta_sso_router
from mod.push_notification.router import router as push_notification_router
from mod.tagmetadata import tags_metadata
from utils.auth_rate_limit import (
    AUTH_ATTEMPT_REMAINING_HEADER,
    AuthAttemptRemainingMiddleware,
)
from utils.block_sensitive_probe_paths import BlockSensitiveProbePathsMiddleware
from utils.cors import get_cors_config
from utils.db import get_db
from utils.env import get_allow_multi_login, get_env_optional
from utils.ip_address import get_client_ip_address
from utils.log import setup_logging
from utils.security_headers import SecurityHeadersMiddleware
from utils.vpn_access import VpnAccessMiddleware, client_can_access_app

setup_logging()

app_name = "Whirlpool PDI Tool API"
app_version = "1.7.1"

app = FastAPI(
    title=app_name,
    description=f"{app_name} APIs developed by Scopt Analytics.",
    version=app_version,
    contact={
        "name": "Scopt Analytics",
        "url": "https://scoptanalytics.com",
        "email": "support@scoptanalytics.com",
    },
    license_info={
        "name": "Proprietary - Internal Use Only",
        "url": "https://scoptanalytics.com/terms",
    },
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    openapi_tags=tags_metadata,
)


# Disable TRACE method
@app.middleware("http")
async def block_trace_method(request: Request, call_next):
    if request.method.upper() == "TRACE":
        return JSONResponse(
            status_code=405,
            content={"detail": "Method not allowed"},
            headers={"Allow": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"},
        )

    return await call_next(request)


# CORS middleware config
cors_config = get_cors_config(
    app_env=get_env_optional("APP_ENV", "dev"),
    app_origin=get_env_optional("APP_ORIGIN"),
    app_cors_origins=get_env_optional("APP_CORS_ORIGINS"),
    expose_headers=[AUTH_ATTEMPT_REMAINING_HEADER],
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_config.allowed_origins,
    allow_credentials=cors_config.allow_credentials,
    allow_methods=cors_config.allow_methods,
    allow_headers=cors_config.allow_headers,
    expose_headers=cors_config.expose_headers,
)

# Block sensitive probe paths middleware
app.add_middleware(BlockSensitiveProbePathsMiddleware)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# VPN access middleware
app.add_middleware(VpnAccessMiddleware)

# Auth rate limit middleware
app.add_middleware(AuthAttemptRemainingMiddleware)

# API routes
app.include_router(auth_router)
app.include_router(app_router)
app.include_router(auth_password_router)
app.include_router(auth_device_router)
app.include_router(user_router)
app.include_router(device_router)
app.include_router(login_router)
app.include_router(log_router)
app.include_router(password_reset_router)
app.include_router(integration_router)
app.include_router(warehouse_router)
app.include_router(inspection_router)
app.include_router(plant_router)
app.include_router(product_router)
app.include_router(product_category_router)
app.include_router(reports_router)
app.include_router(server_health_router)
app.include_router(sku_router)
app.include_router(push_notification_router)
app.include_router(vpn_router)
app.include_router(jobs_router)
app.include_router(tasks_router)
app.include_router(okta_sso_router)

# Uploads directory
uploads_dir = Path(__file__).resolve().parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    "/uploads",
    StaticFiles(directory=str(uploads_dir)),
    name="uploads",
)

# Get Started guide static assets (screenshots, etc.)
guide_static_dir = Path(__file__).resolve().parent / "template" / "static"
guide_static_dir.mkdir(parents=True, exist_ok=True)
app.mount(
    "/get-started/static",
    StaticFiles(directory=str(guide_static_dir)),
    name="get_started_static",
)

# Jinja2 templates config.
templates = Jinja2Templates(directory="template")

# Latest VAPT report path
VAPT_REPORT_PATH = (
    Path(__file__).resolve().parent / "template" / "vapt-reports" / "uat-v1-report.html"
)


# Public text cache headers
PUBLIC_TEXT_CACHE_HEADERS = {
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
}


# Health check
@app.get("/health")
def health():
    return {"status": "ok"}


# API Version
@app.get("/version", response_model=VersionResponse)
def version(request: Request) -> VersionResponse:
    client_ip_address = get_client_ip_address(request)

    return VersionResponse(
        message=app_name,
        version=app_version,
        can_access_app=client_can_access_app(request),
        can_login_multiple_devices=get_allow_multi_login(),
        public_ip_address=client_ip_address,
        vpn_server=None,
    )


# API Docs
@app.get("/api-docs", include_in_schema=False)
async def api_docs(
    request: Request,
    token: str | None = Query(
        None,
        description="Authorization bearer.",
    ),
    db: Session = Depends(get_db),
):
    require_superadmin_for_api_docs(request, db, token)
    api_spec_url = "/api-spec"
    if token and token.strip():
        api_spec_url = f"/api-spec?token={quote(token.strip(), safe='')}"
    return templates.TemplateResponse(
        request,
        "api-docs/index.html",
        {
            "api_spec_url": api_spec_url,
            "api_title": app_name,
        },
    )


# API Specs [OpenAPI]
@app.get("/api-spec", include_in_schema=False)
async def api_spec(
    request: Request,
    token: str | None = Query(
        None,
        description="Authorization bearer.",
    ),
    db: Session = Depends(get_db),
):
    require_superadmin_for_api_docs(request, db, token)
    return JSONResponse(content=app.openapi())


# VAPT Report
@app.get("/vapt-report", include_in_schema=False)
async def vapt_report(
    request: Request,
    token: str | None = Query(
        None,
        description="Authorization bearer.",
    ),
    db: Session = Depends(get_db),
) -> Response:
    require_superadmin_for_api_docs(request, db, token)
    if VAPT_REPORT_PATH.is_file():
        return FileResponse(VAPT_REPORT_PATH)
    return Response(
        content="Report not found",
        media_type="text/html",
        status_code=404,
    )


# Get Started
@app.get("/get-started", include_in_schema=False)
async def get_started(
    request: Request,
    token: str | None = Query(
        None,
        description="Authorization bearer.",
    ),
    db: Session = Depends(get_db),
) -> Response:
    return templates.TemplateResponse(request, "get-started.html")


# Sitemap XML
@app.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml() -> Response:
    content = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://whirlpool.scoptanalytics.in/</loc>
  </url>
</urlset>
"""
    return Response(
        content=content,
        media_type="application/xml",
        headers=PUBLIC_TEXT_CACHE_HEADERS,
    )


# Robots
@app.get("/robots.txt", include_in_schema=False)
def robots_txt() -> PlainTextResponse:
    return PlainTextResponse(
        content="User-agent: *\nDisallow: /\n",
        media_type="text/plain",
        headers=PUBLIC_TEXT_CACHE_HEADERS,
    )


# ReactJS build
app.mount("/", StaticFiles(directory="build/", html=True), name="build")


# Custom 404 page for ReactJS build
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    # Check if the request is for an API route
    api_routes = ("/api", "/auth", "/integration", "/jobs")

    # API routes → JSON response
    if request.url.path.startswith(api_routes):
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "error": "Resource not found",
                "custom_404": True,
                "exception": str(exc),
            },
        )

    # Static files which not found
    if request.url.path.startswith("/public"):
        return templates.TemplateResponse(request, "error.html")

    # Check if build/index.html exists
    if Path("build/index.html").exists():
        # ReactJS build
        return FileResponse("build/index.html")
    else:
        return templates.TemplateResponse(request, "error-no-build.html")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_html = f"""Internal Server Error: {str(exc)}"""
    return PlainTextResponse(content=error_html, status_code=500)


# < krafted by karshe />
