from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.salon.views import (
    AidataViewSet,
    AiTrainingRunViewSet,
    AppointmentViewSet,
    AuditLogViewSet,
    MasterNoShowStatsView,
    MasterScheduleViewSet,
    NoShowModelInfoView,
    ServiceViewSet,
    StatusViewSet,
    TransactionViewSet,
)

router = DefaultRouter()
router.register("services", ServiceViewSet, basename="service")
router.register("statuses", StatusViewSet, basename="status")
router.register("master-schedules", MasterScheduleViewSet, basename="master-schedule")
router.register("appointments", AppointmentViewSet, basename="appointment")
router.register("transactions", TransactionViewSet, basename="transaction")
router.register("ai-data", AidataViewSet, basename="ai-data")
router.register("ai-training-runs", AiTrainingRunViewSet, basename="ai-training-run")
router.register("audit-logs", AuditLogViewSet, basename="audit-log")

urlpatterns = [
    path("ai/model-info/", NoShowModelInfoView.as_view(), name="ai-model-info"),
    path("masters/no-show-stats/", MasterNoShowStatsView.as_view(), name="master-no-show-stats"),
] + router.urls
