from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from mod.api.middleware import auth_dependency
from mod.api.reports.helper import (
    analytics_scope_from_request,
    build_kpi_parameters,
    clear_product_category_pairs_cache,
    executive_analytics_counts,
    executive_defects_mix,
    executive_defects_pareto_chart,
    executive_defects_plant,
    executive_defects_truck,
    executive_defects_warehouse,
    validate_analytics_date_range,
)
from mod.api.reports.request import OperationsAnalyticsRequest
from mod.model import InspectionType
from mod.api.reports.response import (
    DefectsMixResponse,
    DefectsParetoChartResponse,
    DefectsPlantResponse,
    DefectsTruckResponse,
    DefectsWarehouseResponse,
    ExecutiveAnalyticsResponse,
    KpiParametersResponse,
)
from utils.db import get_db
from utils.decorator import check_api_role, exception_handler_decorator
from utils.roles import ROLES_DASHBOARD, ROLES_MASTER_WRITE

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
@check_api_role(ROLES_DASHBOARD)
def get_kpi_parameters(
    request: Request,
    db: Session = Depends(get_db),
):
    return build_kpi_parameters(db, request)


@router.post(
    "/reports/product-category-pairs/cache/clear",
    name="clear_product_category_pairs_cache",
)
@exception_handler_decorator
@check_api_role(ROLES_MASTER_WRITE)
def post_clear_product_category_pairs_cache(request: Request):
    clear_product_category_pairs_cache()
    return {"cleared": True}


@router.post(
    "/reports/executive-analytics",
    name="post_executive_analytics",
    response_model=ExecutiveAnalyticsResponse,
)
@exception_handler_decorator
@check_api_role(ROLES_DASHBOARD)
def post_executive_analytics(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body, request)
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
@check_api_role(ROLES_DASHBOARD)
def post_executive_analytics_defects_pareto_chart(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body, request)
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
@check_api_role(ROLES_DASHBOARD)
def post_executive_analytics_defects_mix(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body, request)
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
@check_api_role(ROLES_DASHBOARD)
def post_executive_analytics_defects_warehouse(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body, request)
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
@check_api_role(ROLES_DASHBOARD)
def post_executive_analytics_defects_plant(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body, request)
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
    "/reports/executive-analytics/defects-truck",
    name="post_executive_analytics_defects_truck",
    response_model=DefectsTruckResponse,
)
@exception_handler_decorator
@check_api_role(ROLES_DASHBOARD)
def post_executive_analytics_defects_truck(
    request: Request,
    body: OperationsAnalyticsRequest,
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
):
    validate_analytics_date_range(body.date_from, body.date_to)
    scope = analytics_scope_from_request(db, body, request)
    scope["damage_grading"] = None
    return executive_defects_truck(
        db,
        is_active=is_active,
        date_from=body.date_from,
        date_to=body.date_to,
        **scope,
    )
