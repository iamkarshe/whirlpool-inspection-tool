from fastapi import FastAPI

from mod.api.user.router import router as user_router
from utils.log import setup_logging

setup_logging()

app = FastAPI(title="PDI API")

app.include_router(user_router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
