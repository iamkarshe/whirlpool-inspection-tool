from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mod.api.user.router import router as user_router
from mod.auth.router import router as auth_router
from mod.tagmetadata import tags_metadata
from utils.log import setup_logging

setup_logging()

app_name = "Whirlpool Inspection Tool API"

app = FastAPI(
    title=app_name,
    description=f"Backend APIs for {app_name} developed by Scopt Analytics for MK Agrotech {app_name} platform.",
    version="1.0.0",
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
    openapi_url="/docs",
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

app.include_router(auth_router, prefix="/auth")
app.include_router(user_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": app_name, "version": "0.1.0"}
