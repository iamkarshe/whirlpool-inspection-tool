from functools import wraps
from typing import Callable, List, Optional

from fastapi import HTTPException, Request, status
from fastapi.exceptions import ResponseValidationError
from fastapi.responses import JSONResponse

from utils.log import debug_rich_console


def exception_handler_decorator(func: Callable):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            result = func(*args, **kwargs)
            if callable(getattr(result, "__await__", None)):
                return await result
            return result
        except ResponseValidationError as ex:
            debug_rich_console()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "success": False,
                    "error": "Response validation failed against response_model",
                    "errors": ex.errors(),
                },
            )
        except HTTPException:
            raise
        except Exception as ex:
            debug_rich_console()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "success": False,
                    "error": str(ex),
                },
            )

    return wrapper


def check_api_role(allowed_roles: List[str]):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                request: Optional[Request] = None

                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break

                if request is None:
                    request = kwargs.get("request")

                if request is None:
                    return JSONResponse(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        content={
                            "success": False,
                            "error": "Request context missing",
                            "pass_request_ctx": True,
                        },
                    )

                user_role_raw = getattr(request.state, "role", "")
                user_roles = [r.strip() for r in user_role_raw.split(",") if r.strip()]

                if not any(role in allowed_roles for role in user_roles):
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "success": False,
                            "error": "Insufficient role permissions.",
                        },
                    )

                result = func(*args, **kwargs)
                if callable(getattr(result, "__await__", None)):
                    return await result
                return result

            except HTTPException:
                raise
            except Exception as ex:
                debug_rich_console()
                return JSONResponse(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    content={
                        "success": False,
                        "error": str(ex),
                    },
                )

        return wrapper

    return decorator


def _request_from_args(args: tuple, kwargs: dict) -> Optional[Request]:
    for arg in args:
        if isinstance(arg, Request):
            return arg
    return kwargs.get("request")


def apply_operator_scope_filters(func: Callable):
    """For routes that list inspections: operators only see rows they inspected.

    Sets ``request.state.inspector_scope_user_id`` to the current user's id when
    the caller is an operator but not a manager or superadmin; otherwise ``None``.
    Handlers should filter ``Inspection.inspector_id`` when this is set.
    """

    @wraps(func)
    async def wrapper(*args, **kwargs):
        request = _request_from_args(args, kwargs)
        if request is None:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": "Request context missing",
                    "pass_request_ctx": True,
                },
            )
        role_raw = getattr(request.state, "role", "") or ""
        roles = [r.strip() for r in role_raw.split(",") if r.strip()]
        if (
            "operator" in roles
            and "superadmin" not in roles
            and "manager" not in roles
        ):
            uid = getattr(request.state, "user_id", None)
            if uid is None:
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "success": False,
                        "error": "Not authenticated",
                    },
                )
            request.state.inspector_scope_user_id = int(uid)
        else:
            request.state.inspector_scope_user_id = None

        result = func(*args, **kwargs)
        if callable(getattr(result, "__await__", None)):
            return await result
        return result

    return wrapper
