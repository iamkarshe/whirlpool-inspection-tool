import logging
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


@asynccontextmanager
async def app_lifespan(app: FastAPI):
    now = datetime.now()
    date_dir = now.strftime("%Y-%m-%d")
    hour_file = now.strftime("%H") + ".log"

    logs_root = Path("logs")
    log_dir = logs_root / date_dir
    log_dir.mkdir(parents=True, exist_ok=True)

    log_path = log_dir / hour_file

    # Dedicated logger for application errors
    error_logger = logging.getLogger("app.errors")
    error_logger.setLevel(logging.ERROR)

    file_handler = logging.FileHandler(log_path)
    file_handler.setLevel(logging.ERROR)
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s")
    file_handler.setFormatter(formatter)

    error_logger.addHandler(file_handler)

    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        error_logger.error(
            "Request validation error",
            exc_info=exc,
            extra={
                "path": str(request.url),
                "method": request.method,
                "errors": exc.errors(),
            },
        )
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": "Validation error",
                "details": exc.errors(),
            },
        )

    async def generic_exception_handler(request: Request, exc: Exception):
        error_logger.exception(
            "Unhandled application exception",
            extra={
                "path": str(request.url),
                "method": request.method,
            },
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Internal server error",
            },
        )

    # Install handlers on the app for this process lifetime
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    try:
        yield
    finally:
        error_logger.removeHandler(file_handler)
        file_handler.close()
