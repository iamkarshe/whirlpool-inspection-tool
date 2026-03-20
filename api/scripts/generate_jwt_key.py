#!/usr/bin/env python3

"""
Generate a secure JWT secret key for PyJWT.

Usage:
    python generate_jwt_key.py
    python generate_jwt_key.py --length 64
"""

import secrets
import argparse


def generate_jwt_key(length: int = 64) -> str:
    """
    Generate a URL-safe JWT secret key.

    Args:
        length: Number of bytes before encoding (default: 64)

    Returns:
        A secure random string suitable for JWT signing.
    """
    return secrets.token_urlsafe(length)


def main():
    """
    CLI entry point.
    """
    parser = argparse.ArgumentParser(description="Generate a secure JWT key")
    parser.add_argument(
        "--length",
        type=int,
        default=64,
        help="Key length in bytes before encoding (default: 64)",
    )

    args = parser.parse_args()

    key = generate_jwt_key(args.length)

    print("\nYour JWT_KEY:\n")
    print(key)
    print("\nAdd this to your .env:\n")
    print(f"JWT_KEY={key}\n")


if __name__ == "__main__":
    main()