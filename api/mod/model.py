from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Double,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class DeviceType(str, enum.Enum):
    desktop = "desktop"
    mobile = "mobile"


class ChecklistFieldType(str, enum.Enum):
    dropdown = "dropdown"
    yes_no = "yes_no"
    date = "date"
    free_text = "free_text"


class ChecklistPhotoUploadRule(str, enum.Enum):
    none = "none"
    when_no = "when_no"
    optional = "optional"
    always = "always"


class ChecklistGroup(str, enum.Enum):
    outer_packaging = "Outer Packaging"
    inner_packaging = "Inner Packaging"
    product = "Product"


class InspectionType(str, enum.Enum):
    inbound = "inbound"
    outbound = "outbound"


class LogLevel(str, enum.Enum):
    debug = "debug"
    info = "info"
    warning = "warning"
    error = "error"


class DamageType(str, enum.Enum):
    packaging = "packaging"
    cosmetic = "cosmetic"
    accessories = "accessories"


class DamageSeverity(str, enum.Enum):
    minor = "minor"
    major = "major"


class DamageLikelyCause(str, enum.Enum):
    transit = "transit"
    handling = "handling"
    packaging = "packaging"
    manufacturing = "manufacturing"


class DamageGrading(str, enum.Enum):
    DGR = "DGR"
    LDGR = "LDGR"
    SCRAP = "SCRAP"


class InspectionReviewStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_REVIEW = "IN_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class InspectionInputReviewStatus(str, enum.Enum):
    OK = "OK"
    FLAGGED = "FLAGGED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


def pg_str_enum(enum_cls: type, *, name: str, length: int) -> SQLEnum:
    return SQLEnum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        values_callable=lambda cls: [m.value for m in cls],
        length=length,
    )


DEVICE_TYPE_DB = pg_str_enum(DeviceType, name="device_type", length=16)
CHECKLIST_FIELD_TYPE_DB = pg_str_enum(
    ChecklistFieldType, name="checklist_field_type", length=16
)
CHECKLIST_PHOTO_RULE_DB = pg_str_enum(
    ChecklistPhotoUploadRule, name="checklist_photo_upload_rule", length=16
)
CHECKLIST_GROUP_DB = pg_str_enum(ChecklistGroup, name="checklist_group", length=32)
INSPECTION_TYPE_DB = pg_str_enum(InspectionType, name="inspection_type", length=16)
LOG_LEVEL_DB = pg_str_enum(LogLevel, name="log_level", length=16)
DAMAGE_TYPE_DB = pg_str_enum(DamageType, name="damage_type", length=32)
DAMAGE_SEVERITY_DB = pg_str_enum(DamageSeverity, name="damage_severity", length=16)
DAMAGE_LIKELY_CAUSE_DB = pg_str_enum(
    DamageLikelyCause, name="damage_likely_cause", length=32
)
DAMAGE_GRADING_DB = pg_str_enum(DamageGrading, name="damage_grading", length=16)
REVIEW_STATUS_DB = pg_str_enum(
    InspectionReviewStatus, name="inspection_review_status", length=20
)
REVIEW_STATUS_EVENT_FROM_DB = pg_str_enum(
    InspectionReviewStatus, name="inspection_review_evt_from", length=20
)
REVIEW_STATUS_EVENT_TO_DB = pg_str_enum(
    InspectionReviewStatus, name="inspection_review_evt_to", length=20
)
INPUT_REVIEW_STATUS_DB = pg_str_enum(
    InspectionInputReviewStatus, name="inspection_input_review_status", length=20
)
INPUT_REVIEW_EVENT_FROM_DB = pg_str_enum(
    InspectionInputReviewStatus, name="inspection_input_review_evt_from", length=20
)
INPUT_REVIEW_EVENT_TO_DB = pg_str_enum(
    InspectionInputReviewStatus, name="inspection_input_review_evt_to", length=20
)


class TimestampSoftDeleteMixin:
    uuid: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        default=uuid.uuid4,
        unique=True,
        nullable=False,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )

    created_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[Any] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class Role(TimestampSoftDeleteMixin, Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(
        String(255), nullable=False, server_default=""
    )

    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(TimestampSoftDeleteMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    name: Mapped[str] = mapped_column(String(120), nullable=False)

    email: Mapped[str] = mapped_column(
        String(180), nullable=False, unique=True, index=True
    )
    mobile_number: Mapped[str] = mapped_column(
        String(20), nullable=False, unique=True, index=True
    )

    password: Mapped[str] = mapped_column(String(255), nullable=False)

    role_id: Mapped[int] = mapped_column(
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        server_default="1",
        index=True,
    )

    designation: Mapped[str] = mapped_column(
        String(120), nullable=False, server_default=""
    )

    role: Mapped["Role"] = relationship(back_populates="users")
    devices: Mapped[list["Device"]] = relationship(back_populates="user")
    inspections: Mapped[list["Inspection"]] = relationship(
        back_populates="inspector",
        foreign_keys="[Inspection.inspector_id]",
    )
    reviewed_inspections: Mapped[list["Inspection"]] = relationship(
        back_populates="reviewer",
        foreign_keys="[Inspection.reviewer_id]",
    )
    inspection_review_events: Mapped[list["InspectionReviewEvent"]] = relationship(
        back_populates="actor",
        foreign_keys="[InspectionReviewEvent.actor_user_id]",
    )
    inspection_input_review_events: Mapped[list["InspectionInputReviewEvent"]] = (
        relationship(
            back_populates="actor",
            foreign_keys="[InspectionInputReviewEvent.actor_user_id]",
        )
    )
    logs: Mapped[list["Log"]] = relationship(back_populates="user")


class Device(TimestampSoftDeleteMixin, Base):
    __tablename__ = "devices"
    __table_args__ = (
        UniqueConstraint("device_fingerprint", name="uq_devices_device_fingerprint"),
        UniqueConstraint("imei", name="uq_devices_imei"),
        Index("ix_devices_user_id_active", "user_id", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    imei: Mapped[str] = mapped_column(String(48), nullable=False)
    device_type: Mapped[DeviceType] = mapped_column(DEVICE_TYPE_DB, nullable=False)

    device_fingerprint: Mapped[str] = mapped_column(String(255), nullable=False)
    device_info: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    proxy_ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)

    current_lat: Mapped[float | None] = mapped_column(Double, nullable=True)
    current_lng: Mapped[float | None] = mapped_column(Double, nullable=True)

    is_locked: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    user: Mapped["User"] = relationship(back_populates="devices")
    inspections: Mapped[list["Inspection"]] = relationship(back_populates="device")
    logs: Mapped[list["Log"]] = relationship(back_populates="device")


class ProductCategory(TimestampSoftDeleteMixin, Base):
    __tablename__ = "product_categories"
    __table_args__ = (
        UniqueConstraint(
            "category_type",
            "sub_category_type",
            "category_code",
            "category_description",
            name="uq_product_categories_composite",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)

    category_type: Mapped[str] = mapped_column(String(32), nullable=False)
    sub_category_type: Mapped[str] = mapped_column(String(32), nullable=False)
    category_code: Mapped[str] = mapped_column(String(128), nullable=False)
    category_description: Mapped[str] = mapped_column(
        String(512), nullable=False, server_default=""
    )

    products: Mapped[list["Product"]] = relationship(back_populates="product_category")
    inspections: Mapped[list["Inspection"]] = relationship(
        back_populates="product_category"
    )


class Product(TimestampSoftDeleteMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("material_code", name="uq_products_material_code"),
        Index("ix_products_category_active", "product_category_id", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    product_category_id: Mapped[int] = mapped_column(
        ForeignKey("product_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    material_code: Mapped[str] = mapped_column(String(120), nullable=False)
    material_description: Mapped[str] = mapped_column(
        String(512), nullable=False, server_default=""
    )

    product_category: Mapped["ProductCategory"] = relationship(
        back_populates="products"
    )
    units: Mapped[list["ProductUnit"]] = relationship(back_populates="product")
    inspections: Mapped[list["Inspection"]] = relationship(back_populates="product")
    inspection_inputs: Mapped[list["InspectionInput"]] = relationship(
        back_populates="product"
    )
    inspection_images: Mapped[list["InspectionImage"]] = relationship(
        back_populates="product"
    )
    logs: Mapped[list["Log"]] = relationship(back_populates="product")


class ProductUnit(TimestampSoftDeleteMixin, Base):
    __tablename__ = "product_units"
    __table_args__ = (
        UniqueConstraint("barcode", name="uq_product_units_barcode"),
        Index("ix_product_units_product_active", "product_id", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    barcode: Mapped[str] = mapped_column(String(64), nullable=False)

    product: Mapped["Product"] = relationship(back_populates="units")
    inspections: Mapped[list["Inspection"]] = relationship(
        back_populates="product_unit"
    )


class Sku(TimestampSoftDeleteMixin, Base):
    __tablename__ = "skus"
    __table_args__ = (
        UniqueConstraint("material_code", name="uq_skus_material_code"),
        Index("ix_skus_category_active", "category", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    category: Mapped[str] = mapped_column(String(120), nullable=False)
    sub_category: Mapped[str] = mapped_column(String(120), nullable=False)
    category_code: Mapped[str] = mapped_column(String(120), nullable=False)
    category_description: Mapped[str] = mapped_column(
        String(512), nullable=False, server_default=""
    )
    material_code: Mapped[str] = mapped_column(String(120), nullable=False)
    material_description: Mapped[str] = mapped_column(
        String(512), nullable=False, server_default=""
    )
    source_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


class Warehouse(TimestampSoftDeleteMixin, Base):
    __tablename__ = "warehouses"
    __table_args__ = (
        UniqueConstraint("warehouse_code", name="uq_warehouses_code"),
        UniqueConstraint("name", name="uq_warehouses_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    warehouse_code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    lat: Mapped[float | None] = mapped_column(Double, nullable=True)
    lng: Mapped[float | None] = mapped_column(Double, nullable=True)

    address: Mapped[str] = mapped_column(String(512), nullable=False, server_default="")
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(10), nullable=False)

    inspections: Mapped[list["Inspection"]] = relationship(back_populates="warehouse")


class Plant(TimestampSoftDeleteMixin, Base):
    __tablename__ = "plants"
    __table_args__ = (
        UniqueConstraint("plant_code", name="uq_plants_code"),
        UniqueConstraint("name", name="uq_plants_name"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    plant_code: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)

    lat: Mapped[float | None] = mapped_column(Double, nullable=True)
    lng: Mapped[float | None] = mapped_column(Double, nullable=True)

    address: Mapped[str] = mapped_column(String(512), nullable=False, server_default="")
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(10), nullable=False)

    inspections: Mapped[list["Inspection"]] = relationship(back_populates="plant")


class Checklist(TimestampSoftDeleteMixin, Base):
    __tablename__ = "checklists"
    __table_args__ = (
        UniqueConstraint(
            "group_name", "item_text", name="uq_checklists_group_name_item_text"
        ),
        Index("ix_checklists_active", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)
    group_name: Mapped[ChecklistGroup] = mapped_column(
        CHECKLIST_GROUP_DB, nullable=False
    )
    section: Mapped[str] = mapped_column(String(120), nullable=False)
    item_text: Mapped[str] = mapped_column(String(512), nullable=False)

    field_type: Mapped[ChecklistFieldType] = mapped_column(
        CHECKLIST_FIELD_TYPE_DB, nullable=False
    )
    dropdown_options: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)

    allows_remarks: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    photo_upload_rule: Mapped[ChecklistPhotoUploadRule] = mapped_column(
        CHECKLIST_PHOTO_RULE_DB,
        nullable=False,
        server_default=ChecklistPhotoUploadRule.none.value,
    )
    min_upload_files: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )

    inspection_inputs: Mapped[list["InspectionInput"]] = relationship(
        back_populates="checklist"
    )
    inspection_images: Mapped[list["InspectionImage"]] = relationship(
        back_populates="checklist"
    )


class Inspection(TimestampSoftDeleteMixin, Base):
    __tablename__ = "inspections"
    __table_args__ = (
        Index("ix_inspections_active_created_at", "is_active", "created_at"),
        Index(
            "ix_inspections_inspector_active_created",
            "inspector_id",
            "is_active",
            "created_at",
        ),
        Index(
            "ix_inspections_product_unit_active_created",
            "product_unit_id",
            "is_active",
            "created_at",
        ),
        Index(
            "ix_inspections_product_active_created",
            "product_id",
            "is_active",
            "created_at",
        ),
        Index(
            "ix_inspections_product_category_active_created",
            "product_category_id",
            "is_active",
            "created_at",
        ),
        Index(
            "ix_inspections_device_active_created",
            "device_id",
            "is_active",
            "created_at",
        ),
        Index(
            "ix_inspections_warehouse_code_active_created",
            "warehouse_code",
            "is_active",
            "created_at",
        ),
        Index(
            "ix_inspections_plant_code_active_created",
            "plant_code",
            "is_active",
            "created_at",
        ),
        Index(
            "ix_inspections_type_active_created",
            "inspection_type",
            "is_active",
            "created_at",
        ),
        Index("ix_inspections_damage_type_active", "damage_type", "is_active"),
        Index("ix_inspections_damage_severity_active", "damage_severity", "is_active"),
        Index(
            "ix_inspections_damage_likely_cause_active",
            "damage_likely_cause",
            "is_active",
        ),
        Index("ix_inspections_damage_grading_active", "damage_grading", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    inspector_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id", ondelete="RESTRICT"),
        nullable=False,
    )

    inspection_type: Mapped[InspectionType] = mapped_column(
        INSPECTION_TYPE_DB, nullable=False
    )

    product_unit_id: Mapped[int] = mapped_column(
        ForeignKey("product_units.id", ondelete="RESTRICT"),
        nullable=False,
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    product_category_id: Mapped[int] = mapped_column(
        ForeignKey("product_categories.id", ondelete="RESTRICT"),
        nullable=False,
    )

    warehouse_code: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("warehouses.warehouse_code", ondelete="RESTRICT"),
        nullable=True,
    )
    supplier_plant_code: Mapped[str | None] = mapped_column(
        "plant_code",
        String(64),
        ForeignKey("plants.plant_code", ondelete="RESTRICT"),
        nullable=True,
    )

    lat: Mapped[float | None] = mapped_column(Double, nullable=True)
    lng: Mapped[float | None] = mapped_column(Double, nullable=True)

    serial_number: Mapped[str] = mapped_column(String(64), nullable=True)
    manufactured_year: Mapped[int] = mapped_column(Integer, nullable=True)
    truck_number: Mapped[str] = mapped_column(String(64), nullable=True)
    truck_docking_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dock_number: Mapped[str] = mapped_column(String(64), nullable=True)

    damage_type: Mapped[DamageType | None] = mapped_column(
        DAMAGE_TYPE_DB, nullable=True
    )
    damage_severity: Mapped[DamageSeverity | None] = mapped_column(
        DAMAGE_SEVERITY_DB, nullable=True
    )
    damage_likely_cause: Mapped[DamageLikelyCause | None] = mapped_column(
        DAMAGE_LIKELY_CAUSE_DB, nullable=True
    )
    damage_grading: Mapped[DamageGrading | None] = mapped_column(
        DAMAGE_GRADING_DB, nullable=True
    )

    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)

    is_under_review: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    review_status: Mapped[InspectionReviewStatus] = mapped_column(
        REVIEW_STATUS_DB,
        nullable=False,
        server_default=InspectionReviewStatus.IN_REVIEW.value,
    )
    reviewer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reviewed_comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    inspector: Mapped["User"] = relationship(
        back_populates="inspections",
        foreign_keys=[inspector_id],
    )
    reviewer: Mapped["User | None"] = relationship(
        back_populates="reviewed_inspections",
        foreign_keys=[reviewer_id],
    )
    device: Mapped["Device"] = relationship(back_populates="inspections")
    product_unit: Mapped["ProductUnit"] = relationship(back_populates="inspections")
    product: Mapped["Product"] = relationship(back_populates="inspections")
    product_category: Mapped["ProductCategory"] = relationship(
        back_populates="inspections"
    )
    warehouse: Mapped["Warehouse"] = relationship(back_populates="inspections")
    plant: Mapped["Plant"] = relationship(back_populates="inspections")

    inputs: Mapped[list["InspectionInput"]] = relationship(back_populates="inspection")
    images: Mapped[list["InspectionImage"]] = relationship(back_populates="inspection")
    logs: Mapped[list["Log"]] = relationship(back_populates="inspection")
    review_events: Mapped[list["InspectionReviewEvent"]] = relationship(
        back_populates="inspection",
    )


class InspectionReviewEvent(Base):
    __tablename__ = "inspection_review_events"
    __table_args__ = (
        Index("ix_inspection_review_events_inspection_id", "inspection_id"),
        Index("ix_inspection_review_events_actor_user_id", "actor_user_id"),
        Index(
            "ix_inspection_review_events_inspection_created",
            "inspection_id",
            "created_at",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("inspections.id", ondelete="CASCADE"),
        nullable=False,
    )
    from_status: Mapped[InspectionReviewStatus | None] = mapped_column(
        REVIEW_STATUS_EVENT_FROM_DB,
        nullable=True,
    )
    to_status: Mapped[InspectionReviewStatus] = mapped_column(
        REVIEW_STATUS_EVENT_TO_DB,
        nullable=False,
    )
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    inspection: Mapped["Inspection"] = relationship(back_populates="review_events")
    actor: Mapped["User"] = relationship(
        back_populates="inspection_review_events",
        foreign_keys=[actor_user_id],
    )


class InspectionInput(TimestampSoftDeleteMixin, Base):
    __tablename__ = "inspection_inputs"
    __table_args__ = (
        UniqueConstraint(
            "inspection_id",
            "checklist_id",
            name="uq_inspection_inputs_one_per_item",
        ),
        Index("ix_inspection_inputs_inspection_active", "inspection_id", "is_active"),
        Index("ix_inspection_inputs_product_active", "product_id", "is_active"),
        Index("ix_inspection_inputs_checklist_id", "checklist_id"),
        Index(
            "ix_inspection_inputs_input_review_status_active",
            "input_review_status",
            "is_active",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("inspections.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    checklist_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("checklists.id", ondelete="RESTRICT"),
        nullable=False,
    )

    field: Mapped[str] = mapped_column(String(512), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    remarks: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    input_review_status: Mapped[InspectionInputReviewStatus] = mapped_column(
        INPUT_REVIEW_STATUS_DB,
        nullable=False,
        server_default=InspectionInputReviewStatus.OK.value,
    )

    product: Mapped["Product"] = relationship(back_populates="inspection_inputs")
    inspection: Mapped["Inspection"] = relationship(back_populates="inputs")
    checklist: Mapped["Checklist"] = relationship(back_populates="inspection_inputs")
    review_events: Mapped[list["InspectionInputReviewEvent"]] = relationship(
        back_populates="inspection_input",
    )


class InspectionInputReviewEvent(Base):
    __tablename__ = "inspection_input_review_events"
    __table_args__ = (
        Index("ix_insp_input_review_events_input_id", "inspection_input_id"),
        Index("ix_insp_input_review_events_actor_user_id", "actor_user_id"),
        Index(
            "ix_insp_input_review_events_input_created",
            "inspection_input_id",
            "created_at",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    inspection_input_id: Mapped[int] = mapped_column(
        ForeignKey("inspection_inputs.id", ondelete="CASCADE"),
        nullable=False,
    )
    from_status: Mapped[InspectionInputReviewStatus | None] = mapped_column(
        INPUT_REVIEW_EVENT_FROM_DB,
        nullable=True,
    )
    to_status: Mapped[InspectionInputReviewStatus] = mapped_column(
        INPUT_REVIEW_EVENT_TO_DB,
        nullable=False,
    )
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    inspection_input: Mapped["InspectionInput"] = relationship(
        back_populates="review_events"
    )
    actor: Mapped["User"] = relationship(
        back_populates="inspection_input_review_events",
        foreign_keys=[actor_user_id],
    )


class InspectionImage(TimestampSoftDeleteMixin, Base):
    __tablename__ = "inspection_images"
    __table_args__ = (
        Index("ix_inspection_images_inspection_active", "inspection_id", "is_active"),
        Index("ix_inspection_images_product_active", "product_id", "is_active"),
        Index(
            "ix_inspection_images_checklist_active",
            "checklist_id",
            "is_active",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    inspection_id: Mapped[int] = mapped_column(
        ForeignKey("inspections.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    checklist_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("checklists.id", ondelete="SET NULL"),
        nullable=True,
    )

    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    remarks: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    product: Mapped["Product"] = relationship(back_populates="inspection_images")
    inspection: Mapped["Inspection"] = relationship(back_populates="images")
    checklist: Mapped["Checklist | None"] = relationship(
        back_populates="inspection_images"
    )


class Log(TimestampSoftDeleteMixin, Base):
    __tablename__ = "logs"
    __table_args__ = (
        Index("ix_logs_user_active", "user_id", "is_active"),
        Index("ix_logs_product_active", "product_id", "is_active"),
        Index("ix_logs_inspection_active", "inspection_id", "is_active"),
        Index("ix_logs_device_active", "device_id", "is_active"),
        Index(
            "ix_logs_device_active_created_at",
            "device_id",
            "is_active",
            "created_at",
        ),
        Index("ix_logs_user_active_created_at", "user_id", "is_active", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    inspection_id: Mapped[int | None] = mapped_column(
        ForeignKey("inspections.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    device_id: Mapped[int | None] = mapped_column(
        ForeignKey("devices.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    log_level: Mapped[LogLevel] = mapped_column(
        LOG_LEVEL_DB, nullable=False, server_default=LogLevel.info.value
    )
    log_value: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    user: Mapped["User"] = relationship(back_populates="logs")
    product: Mapped["Product"] = relationship(back_populates="logs")
    inspection: Mapped["Inspection"] = relationship(back_populates="logs")
    device: Mapped["Device"] = relationship(back_populates="logs")
