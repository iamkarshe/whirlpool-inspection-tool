from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.reports.helper import (
    analytics_scope_from_request,
    build_kpi_parameters,
    executive_analytics_counts,
    executive_defects_mix,
    executive_defects_pareto_chart,
    executive_defects_plant,
    executive_defects_warehouse,
    operations_analytics_counts,
    operations_trend_data,
    resolve_scope_codes,
    validate_analytics_date_range,
)
from mod.api.reports.request import OperationsAnalyticsRequest
from mod.model import InspectionType
from mod.api.reports.response import (
    DefectsMixResponse,
    DefectsParetoChartResponse,
    DefectsPlantResponse,
    DefectsWarehouseResponse,
    ExecutiveAnalyticsResponse,
    KpiParametersResponse,
    OperationsAnalyticsResponse,
    OperationsTrendResponse,
)
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator

router = APIRouter(
    tags=["Reports"],
    dependencies=[Depends(auth_dependency)],
    prefix="/api",
)


@router.get(
    "/reports/kpi-parameters",
    name="get_kpi_parameters",
    response_model=KpiParametersResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_kpi_parameters(
    request: Request,
    db: Session = Depends(get_db),
):
    return build_kpi_parameters(db)


@router.post(
    "/reports/executive-analytics",
    name="post_executive_analytics",
    response_model=ExecutiveAnalyticsResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def post_executive_analytics(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body)
    counts = executive_analytics_counts(
        db,
        is_active=is_active,
        date_from=body.date_from,
        date_to=body.date_to,
        **scope,
    )
    return ExecutiveAnalyticsResponse(
        date_from=body.date_from,
        date_to=body.date_to,
        **counts,
    )


@router.post(
    "/reports/executive-analytics/defects-pareto-chart",
    name="post_executive_analytics_defects_pareto_chart",
    response_model=DefectsParetoChartResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def post_executive_analytics_defects_pareto_chart(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body)
    return executive_defects_pareto_chart(
        db,
        is_active=is_active,
        date_from=body.date_from,
        date_to=body.date_to,
        **scope,
    )


@router.post(
    "/reports/executive-analytics/defects-mix",
    name="post_executive_analytics_defects_mix",
    response_model=DefectsMixResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def post_executive_analytics_defects_mix(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body)
    scope["damage_grading"] = None
    return executive_defects_mix(
        db,
        is_active=is_active,
        date_from=body.date_from,
        date_to=body.date_to,
        **scope,
    )


@router.post(
    "/reports/executive-analytics/defects-warehouse",
    name="post_executive_analytics_defects_warehouse",
    response_model=DefectsWarehouseResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def post_executive_analytics_defects_warehouse(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body)
    scope["damage_grading"] = None
    return executive_defects_warehouse(
        db,
        is_active=is_active,
        date_from=body.date_from,
        date_to=body.date_to,
        **scope,
    )


@router.post(
    "/reports/executive-analytics/defects-plant",
    name="post_executive_analytics_defects_plant",
    response_model=DefectsPlantResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def post_executive_analytics_defects_plant(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body)
    scope["damage_grading"] = None
    if scope.get("inspection_type") is None:
        scope["inspection_type"] = InspectionType.inbound
    return executive_defects_plant(
        db,
        is_active=is_active,
        date_from=body.date_from,
        date_to=body.date_to,
        **scope,
    )


@router.post(
    "/reports/operations-analytics",
    name="post_operations_analytics",
    response_model=OperationsAnalyticsResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def post_operations_analytics(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body)
    counts = operations_analytics_counts(
        db,
        is_active=is_active,
        date_from=body.date_from,
        date_to=body.date_to,
        **scope,
    )
    return OperationsAnalyticsResponse(
        date_from=body.date_from,
        date_to=body.date_to,
        **counts,
    )


@router.get(
    "/reports/operations-trend",
    name="get_operations_trend",
    response_model=OperationsTrendResponse,
)
@exception_handler_decorator
@check_api_role(["superadmin", "manager"])
def get_operations_trend(
    request: Request,
    date_from: date = Query(..., description="Range start date (UTC)"),
    date_to: date = Query(..., description="Range end date (UTC, inclusive)"),
    warehouse_id: int | None = Query(None),
    plant_id: int | None = Query(None),
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    if date_to < date_from:
        raise HTTPException(
            status_code=400, detail="date_to must be on or after date_from"
        )
    warehouse_code, plant_code = resolve_scope_codes(db, warehouse_id, plant_id)
    payload = operations_trend_data(
        db,
        date_from=date_from,
        date_to=date_to,
        is_active=is_active,
        warehouse_code=warehouse_code,
        plant_code=plant_code,
    )
    return OperationsTrendResponse(**payload)
