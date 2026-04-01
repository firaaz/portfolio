"""API adapter — FastAPI routers."""

from fastapi import APIRouter

from app.adapters.api.stream_route import router as stream_router

api_router = APIRouter()
api_router.include_router(stream_router)
