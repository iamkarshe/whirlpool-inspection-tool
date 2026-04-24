from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from mod.api.device.router import router as device_router
from mod.api.login.router import router as login_router
from mod.api.user.router import router as user_router
from mod.auth.router import router as auth_router
from mod.tagmetadata import tags_metadata
from utils.log import setup_logging

setup_logging()

app_name = "Whirlpool Inspection Tool API"
app_version = "1.0.3"

app = FastAPI(
    title=app_name,
    description=f"Backend APIs for {app_name} developed by Scopt Analytics for MK Agrotech {app_name} platform.",
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
    openapi_url="/openapi.json",
    openapi_tags=tags_metadata,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(device_router)
app.include_router(login_router)

# Jinja2 templates config.
templates = Jinja2Templates(directory="template")


# Health check
@app.get("/health")
def health():
    return {"status": "ok"}


# API Version
@app.get("/version")
def version():
    return {"message": app_name, "version": app_version}

# ReactJS build
app.mount("/", StaticFiles(directory="build/", html=True), name="build")


# Custom 404 page for ReactJS build
@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    # Check if the request is for an API route
    api_routes = ("/api", "/auth", "/integration")

    # API routes → JSON response
    if request.url.path.startswith(api_routes):
        return JSONResponse(
            status_code=404,
            content={
                "success": False,
                "error": "Resource not found",
                "custom_404": True,
            },
        )

    # Static files which not found
    if request.url.path.startswith("/public"):
        return templates.TemplateResponse("error.html", {"request": request})

    # ReactJS
    return FileResponse("build/index.html")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_html = f"""Internal Server Error: {str(exc)}"""
    return PlainTextResponse(content=error_html, status_code=500)


# < krafted by karshe />