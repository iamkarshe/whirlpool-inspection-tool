from pathlib import Path
from urllib.parse import quote

from fastapi import Depends, FastAPI, Query, Request
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from mod.api.device.router import router as device_router
from mod.api.inspection.router import router as inspection_router
from mod.api.integration.router import router as integration_router
from mod.api.log.router import router as log_router
from mod.api.login.router import router as login_router
from mod.api.plant.router import router as plant_router
from mod.api.product.router import router as product_router
from mod.api.product_category.router import router as product_category_router
from mod.api.reports.router import router as reports_router
from mod.api.sku.router import router as sku_router
from mod.api.tasks.router import router as tasks_router
from mod.api.user.router import router as user_router
from mod.api.vpn.router import router as vpn_router
from mod.api.warehouse.router import router as warehouse_router
from mod.auth.device_router import router as auth_device_router
from mod.auth.router import router as auth_router
from mod.jobs.router import router as jobs_router
from mod.okta.router import router as okta_sso_router
from mod.push_notification.router import router as push_notification_router
from mod.app.helper import require_superadmin_for_api_docs
from mod.app.response import VersionResponse
from utils.db import get_db
from mod.tagmetadata import tags_metadata
from utils.env import get_allow_multi_login, get_env, get_env_optional
from utils.log import setup_logging
from utils.auth_rate_limit import (
    AUTH_ATTEMPT_REMAINING_HEADER,
    AuthAttemptRemainingMiddleware,
)
from utils.vpn_access import VpnAccessMiddleware, client_can_access_app

setup_logging()

app_name = "Whirlpool PDI Tool API"
app_version = "1.6.0"

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

# Allowed origins for CORS middleware
app_env = (get_env_optional("APP_ENV", "dev") or "dev").strip().lower()
cors_allowed_origins = ["*"] if app_env == "dev" else [get_env("APP_ORIGIN").strip()]

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[AUTH_ATTEMPT_REMAINING_HEADER],
)

# VPN access middleware
app.add_middleware(VpnAccessMiddleware)

# Auth rate limit middleware
app.add_middleware(AuthAttemptRemainingMiddleware)

# API routes
app.include_router(auth_router)
app.include_router(auth_device_router)
app.include_router(user_router)
app.include_router(device_router)
app.include_router(login_router)
app.include_router(log_router)
app.include_router(integration_router)
app.include_router(warehouse_router)
app.include_router(inspection_router)
app.include_router(plant_router)
app.include_router(product_router)
app.include_router(product_category_router)
app.include_router(reports_router)
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

# Jinja2 templates config.
templates = Jinja2Templates(directory="template")


# Health check
@app.get("/health")
def health():
    return {"status": "ok"}


# API Version
@app.get("/version", response_model=VersionResponse)
def version(request: Request) -> VersionResponse:
    return VersionResponse(
        message=app_name,
        version=app_version,
        can_access_app=client_can_access_app(request),
        can_login_multiple_devices=get_allow_multi_login(),
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
        "api-docs/index.html",
        {
            "request": request,
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
        return templates.TemplateResponse("error.html", {"request": request})

    # Check if build/index.html exists
    if Path("build/index.html").exists():
        # ReactJS build
        return FileResponse("build/index.html")
    else:
        return templates.TemplateResponse("error-no-build.html", {"request": request})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_html = f"""Internal Server Error: {str(exc)}"""
    return PlainTextResponse(content=error_html, status_code=500)


# < krafted by karshe />
