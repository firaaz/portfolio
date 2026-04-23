"""API adapter — FastAPI routers."""

from fastapi import APIRouter

from app.adapters.api.command_route import router as command_router
from app.adapters.api.signal_route import router as signal_router
from app.adapters.api.stream_route import router as stream_router

api_router = APIRouter()
api_router.include_router(stream_router)
api_router.include_router(command_router)
api_router.include_router(signal_router)
