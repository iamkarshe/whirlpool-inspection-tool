"""Bulk user upsert from CSV (superadmin)."""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass

from fastapi import HTTPException, Request, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from mod.api.log.audit import log_user_added, log_user_updated
from mod.api.user.helper import (
    apply_user_facility_scope,
    forbid_superadmin_role_assignment,
)
from mod.api.user.request import USER_CSV_HEADERS
from mod.model import Role, User, Warehouse
from utils.common import ensure_allowed_registration_email, normalize_login_email
from utils.password import hash_password
from utils.password_policy import generate_temporary_password
from utils.roles import ROLE_BIZ_ADMIN, ROLE_MANAGER, ROLE_OPERATOR, ROLE_SUPERADMIN

USER_CSV_REJECT_HEADER = "Error"
USER_CSV_REJECTED_HEADERS = (*USER_CSV_HEADERS, USER_CSV_REJECT_HEADER)

USER_CSV_HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "name": ("name",),
    "email": ("email",),
    "mobile": ("mobile", "mobile number"),
    "role": ("role",),
    "designation": ("designation",),
    "allowed warehouse": ("allowed warehouse", "allowed warehouses"),
}

USER_CSV_ROLE_SLUGS: dict[str, str] = {
    "admin": ROLE_BIZ_ADMIN,
    "biz-admin": ROLE_BIZ_ADMIN,
    "biz admin": ROLE_BIZ_ADMIN,
    "business admin": ROLE_BIZ_ADMIN,
    "manager": ROLE_MANAGER,
    "operator": ROLE_OPERATOR,
}

USER_CSV_ROLE_EXPORT_LABELS: dict[str, str] = {
    ROLE_BIZ_ADMIN: "Admin",
    ROLE_MANAGER: "Manager",
    ROLE_OPERATOR: "Operator",
}

USER_CSV_FORBIDDEN_ROLE_LABELS = frozenset({"superadmin", "super admin"})


@dataclass(frozen=True)
class ParsedUserCsvRow:
    row_number: int
    raw_row: dict[str, str]
    name: str
    email: str
    mobile: str
    role_slug: str
    designation: str
    warehouse_codes: list[str]


@dataclass(frozen=True)
class UserCsvRejectedRow:
    row_number: int
    name: str
    email: str
    mobile: str
    role: str
    designation: str
    allowed_warehouse: str
    reason: str


@dataclass(frozen=True)
class UserCsvAcceptedRow:
    row_number: int
    email: str
    name: str
    action: str


@dataclass(frozen=True)
class UserCsvUpsertOutcome:
    success: bool
    created: int
    updated: int
    rejected: int
    created_users: list[UserCsvAcceptedRow]
    updated_users: list[UserCsvAcceptedRow]
    rejected_rows: list[UserCsvRejectedRow]
    rejected_csv: str


def normalizeUserCsvHeader(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def resolveUserCsvHeaderMap(fieldnames: list[str] | None) -> dict[str, str]:
    if not fieldnames:
        raise HTTPException(status_code=400, detail="CSV is empty")

    normalized = {
        normalizeUserCsvHeader(header): header for header in fieldnames if header
    }
    header_map: dict[str, str] = {}
    missing: list[str] = []

    for canonical, aliases in USER_CSV_HEADER_ALIASES.items():
        matched = next(
            (normalized[alias] for alias in aliases if alias in normalized),
            None,
        )
        if matched is None:
            missing.append(canonical)
            continue
        header_map[canonical] = matched

    if missing:
        raise HTTPException(
            status_code=400,
            detail=(
                "Missing required headers: "
                f"{', '.join(USER_CSV_HEADERS)}. "
                f"Unmatched columns: {', '.join(missing)}"
            ),
        )

    return header_map


def readUserCsvUpload(file: UploadFile) -> list[dict[str, str]]:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    content = file.file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    header_map = resolveUserCsvHeaderMap(reader.fieldnames)

    rows: list[dict[str, str]] = []
    for raw_row in reader:
        rows.append(
            {
                canonical: (raw_row.get(source) or "").strip()
                for canonical, source in header_map.items()
            }
        )
    return rows


def parseAllowedWarehouse(raw: str) -> list[str]:
    return [
        code
        for code in dict.fromkeys(
            part.strip() for part in (raw or "").split("|") if part.strip()
        )
    ]


def formatAllowedWarehouse(codes: list[str]) -> str:
    return "|".join(codes)


def normalizeUserCsvRoleLabel(raw: str) -> str:
    return re.sub(r"\s+", " ", (raw or "").strip().lower())


def resolveUserCsvRole(raw: str) -> str | None:
    normalized = normalizeUserCsvRoleLabel(raw)
    if not normalized:
        return None
    if normalized in USER_CSV_FORBIDDEN_ROLE_LABELS:
        return None
    return USER_CSV_ROLE_SLUGS.get(normalized)


def exportUserCsvRoleLabel(role_slug: str) -> str:
    return USER_CSV_ROLE_EXPORT_LABELS.get(role_slug, role_slug)


def rejectUserCsvRow(
    row_number: int,
    row: dict[str, str],
    reason: str,
) -> UserCsvRejectedRow:
    return UserCsvRejectedRow(
        row_number=row_number,
        name=(row.get("name") or "").strip(),
        email=(row.get("email") or "").strip(),
        mobile=(row.get("mobile") or "").strip(),
        role=(row.get("role") or "").strip(),
        designation=(row.get("designation") or "").strip(),
        allowed_warehouse=(row.get("allowed warehouse") or "").strip(),
        reason=reason,
    )


def parseUserCsvRow(
    row_number: int,
    row: dict[str, str],
) -> ParsedUserCsvRow | UserCsvRejectedRow:
    role_raw = (row.get("role") or "").strip()
    role_normalized = normalizeUserCsvRoleLabel(role_raw)
    if role_normalized in USER_CSV_FORBIDDEN_ROLE_LABELS:
        return rejectUserCsvRow(
            row_number,
            row,
            "Superadmin cannot be added or updated via CSV",
        )

    name = (row.get("name") or "").strip()
    email = normalize_login_email(row.get("email") or "")
    mobile = re.sub(r"\D", "", row.get("mobile") or "")
    role_slug = resolveUserCsvRole(role_raw)
    designation = (row.get("designation") or "").strip()
    warehouse_codes = parseAllowedWarehouse(row.get("allowed warehouse") or "")

    if not name or len(name) < 2:
        return rejectUserCsvRow(row_number, row, "Name is required (min 2 characters)")
    if not email or "@" not in email:
        return rejectUserCsvRow(row_number, row, "Valid email is required")
    if not re.fullmatch(r"\d{10}", mobile):
        return rejectUserCsvRow(row_number, row, "Mobile must be exactly 10 digits")
    if role_slug is None:
        return rejectUserCsvRow(
            row_number,
            row,
            "Role must be Admin (Biz Admin), Manager, or Operator",
        )
    if not designation or len(designation) < 2:
        return rejectUserCsvRow(
            row_number,
            row,
            "Designation is required (min 2 characters)",
        )

    try:
        ensure_allowed_registration_email(email)
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return rejectUserCsvRow(row_number, row, detail)

    return ParsedUserCsvRow(
        row_number=row_number,
        raw_row=row,
        name=name,
        email=email,
        mobile=mobile,
        role_slug=role_slug,
        designation=designation,
        warehouse_codes=warehouse_codes,
    )


def buildUsersCsvTemplateRows(db: Session) -> list[list[str]]:
    users = (
        db.query(User)
        .options(
            joinedload(User.role),
            selectinload(User.warehouses_scope),
        )
        .order_by(User.name.asc(), User.email.asc())
        .all()
    )

    rows: list[list[str]] = [list(USER_CSV_HEADERS)]
    for user in users:
        role_slug = (user.role.role or "").lower()
        if role_slug == ROLE_SUPERADMIN:
            continue
        rows.append(
            [
                user.name,
                user.email,
                user.mobile_number,
                exportUserCsvRoleLabel(role_slug),
                user.designation,
                formatAllowedWarehouse(list(user.allowed_warehouse)),
            ]
        )
    return rows


def buildRejectedUsersCsv(rejected_rows: list[UserCsvRejectedRow]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(USER_CSV_REJECTED_HEADERS)
    for row in rejected_rows:
        writer.writerow(
            [
                row.name,
                row.email,
                row.mobile,
                row.role,
                row.designation,
                row.allowed_warehouse,
                row.reason,
            ]
        )
    return output.getvalue()


def validateUserCsvRows(
    rows: list[dict[str, str]],
) -> tuple[list[ParsedUserCsvRow], list[UserCsvRejectedRow]]:
    valid_rows: list[ParsedUserCsvRow] = []
    rejected_rows: list[UserCsvRejectedRow] = []
    seen_emails: set[str] = set()
    seen_mobiles: set[str] = set()

    for row_number, row in enumerate(rows, start=2):
        if not any((value or "").strip() for value in row.values()):
            continue

        parsed = parseUserCsvRow(row_number, row)
        if isinstance(parsed, UserCsvRejectedRow):
            rejected_rows.append(parsed)
            continue

        if parsed.email in seen_emails:
            rejected_rows.append(
                rejectUserCsvRow(
                    row_number,
                    row,
                    f"Duplicate email in same upload ({parsed.email})",
                )
            )
            continue
        seen_emails.add(parsed.email)

        if parsed.mobile in seen_mobiles:
            rejected_rows.append(
                rejectUserCsvRow(
                    row_number,
                    row,
                    f"Duplicate mobile in same upload ({parsed.mobile})",
                )
            )
            continue
        seen_mobiles.add(parsed.mobile)

        valid_rows.append(parsed)

    return valid_rows, rejected_rows


def upsertUsersFromCsv(
    db: Session,
    request: Request,
    rows: list[dict[str, str]],
) -> UserCsvUpsertOutcome:
    valid_rows, rejected_rows = validateUserCsvRows(rows)
    created_users: list[UserCsvAcceptedRow] = []
    updated_users: list[UserCsvAcceptedRow] = []

    if not valid_rows:
        return UserCsvUpsertOutcome(
            success=True,
            created=0,
            updated=0,
            rejected=len(rejected_rows),
            created_users=[],
            updated_users=[],
            rejected_rows=rejected_rows,
            rejected_csv=buildRejectedUsersCsv(rejected_rows),
        )

    role_rows = {
        role.role: role
        for role in db.query(Role)
        .filter(Role.role.in_(list(USER_CSV_ROLE_SLUGS.values())))
        .all()
    }
    for role_slug in USER_CSV_ROLE_SLUGS.values():
        if role_slug not in role_rows:
            raise HTTPException(status_code=500, detail=f"Missing role: {role_slug}")

    all_warehouse_codes = {
        code for row in valid_rows for code in row.warehouse_codes
    }
    if all_warehouse_codes:
        known = {
            warehouse.warehouse_code
            for warehouse in db.query(Warehouse)
            .filter(Warehouse.warehouse_code.in_(sorted(all_warehouse_codes)))
            .all()
        }
        missing_codes = sorted(
            code for code in all_warehouse_codes if code not in known
        )
        if missing_codes:
            raise HTTPException(
                status_code=422,
                detail=f"Unknown warehouse code(s): {missing_codes}",
            )

    emails = [row.email for row in valid_rows]
    existing_users = {
        user.email: user
        for user in db.query(User)
        .options(joinedload(User.role))
        .filter(User.email.in_(emails))
        .all()
    }
    mobiles_by_user_id = {
        user.id: user.mobile_number
        for user in db.query(User.id, User.mobile_number).all()
    }
    mobile_owner_by_number = {
        mobile: user_id for user_id, mobile in mobiles_by_user_id.items()
    }

    created = 0
    updated = 0
    actor_user_id = int(request.state.user_id)

    for row in valid_rows:
        role = role_rows[row.role_slug]
        try:
            forbid_superadmin_role_assignment(role)
        except HTTPException:
            rejected_rows.append(
                rejectUserCsvRow(
                    row.row_number,
                    row.raw_row,
                    "Invalid role assignment",
                )
            )
            continue

        existing = existing_users.get(row.email)
        if existing is not None and (existing.role.role or "").lower() == ROLE_SUPERADMIN:
            rejected_rows.append(
                rejectUserCsvRow(
                    row.row_number,
                    row.raw_row,
                    "Cannot modify superadmin account",
                )
            )
            continue

        mobile_owner = mobile_owner_by_number.get(row.mobile)
        if existing is None:
            if mobile_owner is not None:
                rejected_rows.append(
                    rejectUserCsvRow(
                        row.row_number,
                        row.raw_row,
                        f"Mobile number already in use ({row.mobile})",
                    )
                )
                continue

            user = User(
                name=row.name,
                email=row.email,
                mobile_number=row.mobile,
                designation=row.designation,
                password=hash_password(generate_temporary_password()),
                role_id=role.id,
                is_active=True,
                must_change_password=True,
                password_changed_at=None,
            )
            db.add(user)
            db.flush()
            apply_user_facility_scope(
                db,
                user,
                warehouse_codes=row.warehouse_codes,
                plant_codes=None,
            )
            existing_users[row.email] = user
            mobile_owner_by_number[row.mobile] = user.id
            log_user_added(
                db,
                actor_user_id=actor_user_id,
                target_user_uuid=str(user.uuid),
                target_email=user.email,
                target_name=user.name,
                target_role=role.role,
            )
            created_users.append(
                UserCsvAcceptedRow(
                    row_number=row.row_number,
                    email=user.email,
                    name=user.name,
                    action="created",
                )
            )
            created += 1
            continue

        if mobile_owner is not None and mobile_owner != existing.id:
            rejected_rows.append(
                rejectUserCsvRow(
                    row.row_number,
                    row.raw_row,
                    f"Mobile number already in use ({row.mobile})",
                )
            )
            continue

        previous_mobile = existing.mobile_number
        existing.name = row.name
        existing.mobile_number = row.mobile
        existing.designation = row.designation
        existing.role_id = role.id
        if not existing.is_active:
            existing.is_active = True
        if previous_mobile != row.mobile:
            mobile_owner_by_number.pop(previous_mobile, None)
        mobile_owner_by_number[row.mobile] = existing.id
        apply_user_facility_scope(
            db,
            existing,
            warehouse_codes=row.warehouse_codes,
            plant_codes=None,
        )
        log_user_updated(
            db,
            actor_user_id=actor_user_id,
            target_user_uuid=str(existing.uuid),
            target_email=existing.email,
            summary=(
                f"User {existing.name} ({existing.email}) updated from CSV "
                f"(row {row.row_number})"
            ),
        )
        updated_users.append(
            UserCsvAcceptedRow(
                row_number=row.row_number,
                email=existing.email,
                name=existing.name,
                action="updated",
            )
        )
        updated += 1

    if created or updated:
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=f"CSV upsert failed due to unique constraint conflict: {exc.orig}",
            ) from exc
    else:
        db.rollback()

    return UserCsvUpsertOutcome(
        success=True,
        created=created,
        updated=updated,
        rejected=len(rejected_rows),
        created_users=created_users,
        updated_users=updated_users,
        rejected_rows=rejected_rows,
        rejected_csv=buildRejectedUsersCsv(rejected_rows),
    )
