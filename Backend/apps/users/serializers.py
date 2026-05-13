from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.users.models import AccessRight, Role, User
from apps.users.permissions import get_role_name


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ("id", "role_name", "role_description")


class AccessRightSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    role_id = serializers.PrimaryKeyRelatedField(source="role", queryset=Role.objects.all(), write_only=True)

    class Meta:
        model = AccessRight
        fields = ("id", "role", "role_id", "operation_name", "access_object", "permission")


class UserSerializer(serializers.ModelSerializer):
    role = RoleSerializer(read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    role_id = serializers.PrimaryKeyRelatedField(
        source="role",
        queryset=Role.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "full_name",
            "email",
            "password",
            "role",
            "role_id",
            "account_status",
            "registration_date",
        )
        read_only_fields = ("registration_date",)

    def validate(self, attrs):
        request = self.context.get("request")
        if request is None or "role" not in attrs:
            return attrs
        if get_role_name(request.user) != "admin":
            raise serializers.ValidationError(
                {"role_id": "Менять роль может только администратор."}
            )
        inst = getattr(self, "instance", None)
        if inst is not None:
            old = inst.role
            old_name = (old.role_name or "").strip().lower() if old else ""
            new_role = attrs["role"]
            new_name = (new_role.role_name or "").strip().lower() if new_role else ""
            if old_name != "client" or new_name != "master":
                raise serializers.ValidationError(
                    {
                        "role_id": "Разрешено только назначить мастером пользователя с ролью «Клиент»."
                    }
                )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        role = user.role
        if role and (role.role_name or "").strip().lower() == "admin":
            user.is_staff = True
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        role_changed = "role" in validated_data
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        if role_changed:
            r = instance.role
            rn = (r.role_name or "").strip().lower() if r else ""
            if rn == "admin":
                instance.is_staff = True
            else:
                instance.is_staff = False
                instance.is_superuser = False
        instance.save()
        return instance


class RegisterSerializer(UserSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8, max_length=128)

    class Meta(UserSerializer.Meta):
        fields = (
            "id",
            "username",
            "full_name",
            "email",
            "password",
        )
        extra_kwargs = {"username": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        email = (attrs.get("email") or "").strip()
        username = (attrs.get("username") or "").strip()
        attrs["email"] = email
        attrs["username"] = username if username else email
        full_name = (attrs.get("full_name") or "").strip()
        if len(full_name) < 3:
            raise serializers.ValidationError({"full_name": "Укажите ФИО (не короче 3 символов)."})
        if len(full_name) > 255:
            raise serializers.ValidationError({"full_name": "ФИО не длиннее 255 символов."})
        attrs["full_name"] = full_name
        return attrs


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["role"] = user.role.role_name if user.role else ""
        return token

    def validate(self, attrs):
        User = get_user_model()
        username = (attrs.get("username") or "").strip()
        if username and "@" in username:
            match = User.objects.filter(email__iexact=username).first()
            if match:
                attrs = {**attrs, "username": match.username}
        data = super().validate(attrs)
        data["user"] = {
            "id": self.user.id,
            "username": self.user.username,
            "email": self.user.email,
            "full_name": self.user.full_name,
            "role": self.user.role.role_name if self.user.role else "",
        }
        return data


class EmptySerializer(serializers.Serializer):
    pass
