from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.alerts import router as alerts_router
from app.api.graph import router as graph_router
from app.api.timeline import router as timeline_router
from app.api.calls import router as calls_router
from app.api.cases import router as cases_router
from app.api.metrics import router as metrics_router
from app.api.employees import router as employees_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(alerts_router)
api_router.include_router(graph_router)
api_router.include_router(timeline_router)
api_router.include_router(calls_router)
api_router.include_router(cases_router)
api_router.include_router(metrics_router)
api_router.include_router(employees_router)
