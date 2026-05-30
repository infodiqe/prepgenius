from django.utils import timezone
from rest_framework import serializers

from accounts.models import User


class RegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    full_name = serializers.CharField(max_length=150, required=True)
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )
    phone_e164 = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
    )
    preferred_language = serializers.ChoiceField(
        choices=["as", "en", "hi"],
        default="as",
    )

    def validate_phone_e164(self, value: str) -> str:
        if not value:
            return value
        if not value.startswith("+"):
            raise serializers.ValidationError("Phone number must start with '+'")
        digits = value[1:]
        if not digits.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits after '+'")
        return value

    def validate(self, attrs: dict) -> dict:
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError("Passwords do not match")
        attrs.pop("password_confirm")
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs: dict) -> dict:
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError("Passwords do not match")
        attrs.pop("new_password_confirm")
        return attrs


class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )


class UpdateProfileSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=False)
    phone_e164 = serializers.CharField(
        max_length=20, required=False, allow_blank=True, allow_null=True
    )
    preferred_language = serializers.ChoiceField(
        choices=["as", "en", "hi"], required=False
    )
    target_exam_id = serializers.UUIDField(required=False, allow_null=True)
    exam_date = serializers.DateField(required=False, allow_null=True)

    def validate_exam_date(self, value):
        if value is None:
            return value
        cutoff = timezone.now().date() - timezone.timedelta(days=30)
        if value < cutoff:
            raise serializers.ValidationError("Exam date is too far in the past")
        return value


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "phone_e164",
            "preferred_language",
            "target_exam_id",
            "exam_date",
            "is_minor",
            "status",
            "is_email_verified",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "status",
            "is_email_verified",
            "created_at",
        ]
