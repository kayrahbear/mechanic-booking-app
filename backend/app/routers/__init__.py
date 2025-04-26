from fastapi import APIRouter
from .health import router as health_router
from .services import router as services_router
from .availability import router as avail_router
from .bookings import router as booking_router
from .mechanics import router as mechanic_router
from .admin import router as admin_router
from .users import router as users_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(services_router)
api_router.include_router(avail_router)
api_router.include_router(booking_router)
api_router.include_router(mechanic_router)
api_router.include_router(admin_router)
api_router.include_router(users_router)
