from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from utils.env import get_env, get_env_optional


def build_database_url() -> str:
    host = get_env("DB_HOST")
    user = get_env("DB_USER")
    password = get_env("DB_PASS")
    db = get_env("DB_NAME")
    port = get_env("DB_PORT")

    return f"postgresql+psycopg://{user}:{password}@{host}:{port}/{db}"


DATABASE_URL = build_database_url()
APP_ENV = get_env_optional("APP_ENV", "dev") or "dev"

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    echo=APP_ENV == "dev",
    echo_pool=APP_ENV == "dev",
)


# Set timezone to Asia/Kolkata for every connection
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET TIME ZONE 'Asia/Kolkata'")
    cursor.close()


SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
