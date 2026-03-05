import bcrypt


def hash_password(password: str) -> str:
    """
    Hash a plain password using bcrypt and return a string-safe version for DB storage.
    """
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str | bytes) -> bool:
    """
    Verify a plain password against a stored bcrypt hash.
    Accepts hashed_password as str or bytes.
    """
    password_byte_enc = plain_password.encode("utf-8")

    # Convert hash to bytes if stored as str
    if isinstance(hashed_password, str):
        hashed_password = hashed_password.encode("utf-8")

    return bcrypt.checkpw(password=password_byte_enc, hashed_password=hashed_password)
