from decimal import Decimal
from typing import Optional

from django.utils import timezone
from rest_framework import serializers

from apps.salon.models import Aidata, AiTrainingRun, Appointment, AuditLog, MasterSchedule, Service, Status, Transaction
from apps.users.models import User
from apps.users.permissions import get_role_name
from apps.users.serializers import UserSerializer

MAX_APPOINTMENT_COMMENT_LEN = 4000


class AidataSummarySerializer(serializers.ModelSerializer):
    prediction_probability = serializers.SerializerMethodField()

    class Meta:
        model = Aidata
        fields = (
            "prediction_probability",
            "master_risk_color",
            "model_version",
            "created_at",
        )

    def get_prediction_probability(self, obj: Aidata) -> str:
        return f"{obj.prediction_probability}%"


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ("id", "service_name", "duration_minutes", "price", "category")

    def validate_service_name(self, value: str) -> str:
        name = (value or "").strip()
        if len(name) < 2:
            raise serializers.ValidationError("Название услуги — не менее 2 символов.")
        if len(name) > 150:
            raise serializers.ValidationError("Название услуги — не длиннее 150 символов.")
        return name

    def validate_duration_minutes(self, value: int) -> int:
        if value < 1:
            raise serializers.ValidationError("Длительность должна быть не менее 1 минуты.")
        if value > 24 * 60:
            raise serializers.ValidationError("Длительность не может превышать 24 часа.")
        return value

    def validate_price(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("Цена должна быть больше нуля.")
        return value


class StatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Status
        fields = ("id", "status_code", "status_name", "status_group", "color_indicator")


class MasterScheduleSerializer(serializers.ModelSerializer):
    master = UserSerializer(read_only=True)
    master_id = serializers.PrimaryKeyRelatedField(source="master", queryset=User.objects.all(), write_only=True)

    class Meta:
        model = MasterSchedule
        fields = ("id", "master", "master_id", "day_of_week", "start_time", "end_time", "is_workday", "breaks")

    def validate(self, attrs):
        inst = self.instance
        start = attrs.get("start_time", getattr(inst, "start_time", None) if inst else None)
        end = attrs.get("end_time", getattr(inst, "end_time", None) if inst else None)
        if start is not None and end is not None and start >= end:
            raise serializers.ValidationError({"end_time": "Время окончания должно быть позже времени начала."})
        return attrs


class AppointmentSerializer(serializers.ModelSerializer):
    client = UserSerializer(read_only=True)
    master = UserSerializer(read_only=True)
    service = ServiceSerializer(read_only=True)
    status = StatusSerializer(read_only=True)
    ai_data = AidataSummarySerializer(read_only=True)
    client_id = serializers.PrimaryKeyRelatedField(
        source="client",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    master_id = serializers.PrimaryKeyRelatedField(
        source="master",
        queryset=User.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
    )
    service_id = serializers.PrimaryKeyRelatedField(source="service", queryset=Service.objects.all(), write_only=True)
    status_id = serializers.PrimaryKeyRelatedField(source="status", queryset=Status.objects.all(), write_only=True)

    class Meta:
        model = Appointment
        fields = (
            "id",
            "client",
            "master",
            "service",
            "status",
            "ai_data",
            "client_id",
            "master_id",
            "service_id",
            "status_id",
            "start_datetime",
            "end_datetime",
            "comment",
            "created_at",
            "payment_status",
        )
        read_only_fields = ("end_datetime", "created_at")

    def validate_comment(self, value: str) -> str:
        if value and len(value) > MAX_APPOINTMENT_COMMENT_LEN:
            raise serializers.ValidationError(f"Комментарий не длиннее {MAX_APPOINTMENT_COMMENT_LEN} символов.")
        return value

    def validate_payment_status(self, value: str) -> str:
        allowed = {c[0] for c in Appointment.PaymentStatus.choices}
        if value not in allowed:
            raise serializers.ValidationError("Недопустимый статус оплаты.")
        return value

    def _resolved_client(self, attrs: dict) -> Optional[User]:
        if "client" in attrs:
            return attrs["client"]
        if self.instance:
            return self.instance.client
        request = self.context.get("request")
        if request and request.user.is_authenticated and get_role_name(request.user) == "client":
            return request.user
        return None

    def _resolved_master(self, attrs: dict) -> Optional[User]:
        if "master" in attrs:
            return attrs["master"]
        if self.instance:
            return self.instance.master
        request = self.context.get("request")
        if request and request.user.is_authenticated and get_role_name(request.user) == "master":
            return request.user
        return None

    def _resolved_start(self, attrs: dict):
        if "start_datetime" in attrs:
            return attrs["start_datetime"]
        if self.instance:
            return self.instance.start_datetime
        return None

    def validate(self, attrs: dict) -> dict:
        client = self._resolved_client(attrs)
        master = self._resolved_master(attrs)
        if client and master and client.pk == master.pk:
            raise serializers.ValidationError({"master_id": "Клиент и мастер не могут совпадать."})

        start = self._resolved_start(attrs)
        creating = self.instance is None
        if creating and not start:
            raise serializers.ValidationError({"start_datetime": "Укажите дату и время начала записи."})

        if creating and start and timezone.is_naive(start):
            start = timezone.make_aware(start, timezone.get_current_timezone())
        if creating and start and start < timezone.now():
            raise serializers.ValidationError({"start_datetime": "Время начала записи должно быть в будущем."})

        return attrs


class TransactionSerializer(serializers.ModelSerializer):
    appointment = AppointmentSerializer(read_only=True)
    appointment_id = serializers.PrimaryKeyRelatedField(source="appointment", queryset=Appointment.objects.all(), write_only=True)

    class Meta:
        model = Transaction
        fields = ("id", "appointment", "appointment_id", "amount", "payment_method", "status", "payment_datetime", "external_id")

    def validate_amount(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError("Сумма должна быть больше нуля.")
        return value


class AidataSerializer(serializers.ModelSerializer):
    appointment = AppointmentSerializer(read_only=True)
    appointment_id = serializers.PrimaryKeyRelatedField(source="appointment", queryset=Appointment.objects.all(), write_only=True)
    prediction_probability = serializers.SerializerMethodField()

    class Meta:
        model = Aidata
        fields = (
            "id",
            "appointment",
            "appointment_id",
            "input_features",
            "target_value",
            "prediction_probability",
            "admin_recommendation",
            "master_risk_color",
            "inference_time_ms",
            "model_version",
            "created_at",
        )

    def get_prediction_probability(self, obj: Aidata) -> str:
        return f"{obj.prediction_probability}%"


class AuditLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        source="user",
        queryset=User.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = AuditLog
        fields = ("id", "user", "user_id", "action_datetime", "action_type", "action_object", "result", "additional_data")


class NoShowPredictionRequestSerializer(serializers.Serializer):
    input_features = serializers.JSONField(required=False)
    target_value = serializers.IntegerField(required=False, allow_null=True)
    model_version = serializers.CharField(required=False, allow_blank=True)


class NoShowPredictionResponseSerializer(serializers.Serializer):
    appointment_id = serializers.IntegerField()
    prediction_probability = serializers.CharField()
    admin_recommendation = serializers.CharField()
    master_risk_color = serializers.CharField()
    inference_time_ms = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True)
    model_version = serializers.CharField()
    input_features = serializers.JSONField()
    target_value = serializers.IntegerField(required=False, allow_null=True)


class MasterNoShowStatSerializer(serializers.Serializer):
    """Один элемент ответа GET /api/masters/no-show-stats/."""

    master_id = serializers.IntegerField()
    full_name = serializers.CharField()
    completed_count = serializers.IntegerField()
    no_show_count = serializers.IntegerField()
    no_show_rate_percent = serializers.FloatField(allow_null=True, required=False)


class NoShowModelInfoSerializer(serializers.Serializer):
    is_trained = serializers.BooleanField()
    model_type = serializers.CharField()
    model_version = serializers.CharField(required=False, allow_blank=True)
    trained_at = serializers.CharField(required=False, allow_blank=True)
    feature_names = serializers.ListField(child=serializers.CharField())
    cat_features = serializers.ListField(child=serializers.CharField(), required=False)
    validation_accuracy = serializers.FloatField(required=False)
    n_samples = serializers.IntegerField(required=False)
    positive_class_is_no_show = serializers.BooleanField(required=False)


class AiTrainingRunSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)

    class Meta:
        model = AiTrainingRun
        fields = (
            "id",
            "created_at",
            "created_by",
            "model_version",
            "threshold",
            "n_samples",
            "n_positive",
            "accuracy",
            "precision",
            "recall",
            "f1",
            "tp",
            "fp",
            "tn",
            "fn",
            "notes",
        )
