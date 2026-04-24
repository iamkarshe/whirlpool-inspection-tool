from __future__ import annotations

import enum
import uuid
from datetime import date
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Double,
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
    text = "text"


class InspectionType(str, enum.Enum):
    inbound = "inbound"
    outbound = "outbound"


class LogLevel(str, enum.Enum):
    debug = "debug"
    info = "info"
    warning = "warning"
    error = "error"


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
    inspections: Mapped[list["Inspection"]] = relationship(back_populates="inspector")
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
    device_type: Mapped[DeviceType] = mapped_column(String(16), nullable=False)

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

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)

    products: Mapped[list["Product"]] = relationship(back_populates="product_category")
    checklists: Mapped[list["Checklist"]] = relationship(
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
    inspections: Mapped[list["Inspection"]] = relationship(back_populates="product")
    inspection_inputs: Mapped[list["InspectionInput"]] = relationship(
        back_populates="product"
    )
    inspection_images: Mapped[list["InspectionImage"]] = relationship(
        back_populates="product"
    )
    logs: Mapped[list["Log"]] = relationship(back_populates="product")


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
            "product_category_id", "name", name="uq_checklists_category_name"
        ),
        Index("ix_checklists_category_active", "product_category_id", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    product_category_id: Mapped[int] = mapped_column(
        ForeignKey("product_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)

    product_category: Mapped["ProductCategory"] = relationship(
        back_populates="checklists"
    )
    groups: Mapped[list["ChecklistGroup"]] = relationship(
        back_populates="checklist",
        order_by="ChecklistGroup.group_order_idx",
    )
    fields: Mapped[list["ChecklistField"]] = relationship(back_populates="checklist")
    inspections: Mapped[list["Inspection"]] = relationship(back_populates="checklist")


class ChecklistGroup(TimestampSoftDeleteMixin, Base):
    __tablename__ = "checklist_groups"
    __table_args__ = (
        UniqueConstraint(
            "checklist_id", "name", name="uq_checklist_groups_checklist_name"
        ),
        UniqueConstraint(
            "checklist_id", "group_order_idx", name="uq_checklist_groups_order_idx"
        ),
        Index("ix_checklist_groups_checklist_active", "checklist_id", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    checklist_id: Mapped[int] = mapped_column(
        ForeignKey("checklists.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    group_order_idx: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )

    checklist: Mapped["Checklist"] = relationship(back_populates="groups")
    fields: Mapped[list["ChecklistField"]] = relationship(
        back_populates="group",
        order_by="ChecklistField.field_order_idx",
    )


class ChecklistField(TimestampSoftDeleteMixin, Base):
    __tablename__ = "checklist_fields"
    __table_args__ = (
        UniqueConstraint(
            "checklist_group_id", "name", name="uq_checklist_fields_group_name"
        ),
        UniqueConstraint(
            "checklist_group_id",
            "field_order_idx",
            name="uq_checklist_fields_order_idx",
        ),
        Index("ix_checklist_fields_group_active", "checklist_group_id", "is_active"),
        Index("ix_checklist_fields_checklist_id", "checklist_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    checklist_id: Mapped[int] = mapped_column(
        ForeignKey("checklists.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    checklist_group_id: Mapped[int] = mapped_column(
        ForeignKey("checklist_groups.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(180), nullable=False)
    field_type: Mapped[ChecklistFieldType] = mapped_column(String(16), nullable=False)

    dropdown_options: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)

    field_order_idx: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )

    checklist: Mapped["Checklist"] = relationship(back_populates="fields")
    group: Mapped["ChecklistGroup"] = relationship(back_populates="fields")

    inspection_inputs: Mapped[list["InspectionInput"]] = relationship(
        back_populates="checklist_field"
    )


class Inspection(TimestampSoftDeleteMixin, Base):
    __tablename__ = "inspections"
    __table_args__ = (
        Index("ix_inspections_inspector_active", "inspector_id", "is_active"),
        Index("ix_inspections_product_active", "product_id", "is_active"),
        Index("ix_inspections_device_active", "device_id", "is_active"),
        Index("ix_inspections_checklist_active", "checklist_id", "is_active"),
        Index("ix_inspections_warehouse_code_active", "warehouse_code", "is_active"),
        Index("ix_inspections_plant_code_active", "plant_code", "is_active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    inspector_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    inspection_type: Mapped[InspectionType] = mapped_column(String(16), nullable=False)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    checklist_id: Mapped[int] = mapped_column(
        ForeignKey("checklists.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    warehouse_code: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("warehouses.warehouse_code", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    plant_code: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("plants.plant_code", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    lat: Mapped[float | None] = mapped_column(Double, nullable=True)
    lng: Mapped[float | None] = mapped_column(Double, nullable=True)

    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)

    inspector: Mapped["User"] = relationship(back_populates="inspections")
    device: Mapped["Device"] = relationship(back_populates="inspections")
    product: Mapped["Product"] = relationship(back_populates="inspections")
    checklist: Mapped["Checklist"] = relationship(back_populates="inspections")
    warehouse: Mapped["Warehouse"] = relationship(back_populates="inspections")
    plant: Mapped["Plant"] = relationship(back_populates="inspections")

    inputs: Mapped[list["InspectionInput"]] = relationship(back_populates="inspection")
    images: Mapped[list["InspectionImage"]] = relationship(back_populates="inspection")
    logs: Mapped[list["Log"]] = relationship(back_populates="inspection")


class InspectionInput(TimestampSoftDeleteMixin, Base):
    __tablename__ = "inspection_inputs"
    __table_args__ = (
        UniqueConstraint(
            "inspection_id",
            "checklist_field_id",
            name="uq_inspection_inputs_one_per_field",
        ),
        Index("ix_inspection_inputs_inspection_active", "inspection_id", "is_active"),
        Index("ix_inspection_inputs_product_active", "product_id", "is_active"),
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

    checklist_field_id: Mapped[int] = mapped_column(
        ForeignKey("checklist_fields.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    field: Mapped[str] = mapped_column(String(180), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    remarks: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    product: Mapped["Product"] = relationship(back_populates="inspection_inputs")
    inspection: Mapped["Inspection"] = relationship(back_populates="inputs")
    checklist_field: Mapped["ChecklistField"] = relationship(
        back_populates="inspection_inputs"
    )


class InspectionImage(TimestampSoftDeleteMixin, Base):
    __tablename__ = "inspection_images"
    __table_args__ = (
        Index("ix_inspection_images_inspection_active", "inspection_id", "is_active"),
        Index("ix_inspection_images_product_active", "product_id", "is_active"),
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

    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    remarks: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    product: Mapped["Product"] = relationship(back_populates="inspection_images")
    inspection: Mapped["Inspection"] = relationship(back_populates="images")


class Log(TimestampSoftDeleteMixin, Base):
    __tablename__ = "logs"
    __table_args__ = (
        Index("ix_logs_user_active", "user_id", "is_active"),
        Index("ix_logs_product_active", "product_id", "is_active"),
        Index("ix_logs_inspection_active", "inspection_id", "is_active"),
        Index("ix_logs_device_active", "device_id", "is_active"),
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
        String(16), nullable=False, server_default=LogLevel.info.value
    )
    log_value: Mapped[str] = mapped_column(Text, nullable=False, server_default="")

    user: Mapped["User"] = relationship(back_populates="logs")
    product: Mapped["Product"] = relationship(back_populates="logs")
    inspection: Mapped["Inspection"] = relationship(back_populates="logs")
    device: Mapped["Device"] = relationship(back_populates="logs")
