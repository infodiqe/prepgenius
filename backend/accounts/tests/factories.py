import secrets
from datetime import timedelta

import factory
from django.utils import timezone

from accounts.models import EmailVerificationToken, PasswordResetToken, Permission, Role, User, UserConsent, UserRole
from exams.models import Exam


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    username = factory.LazyAttribute(lambda o: o.email)
    full_name = factory.Faker("name")
    password = factory.PostGenerationMethodCall("set_password", "TestPass123!")
    preferred_language = "as"
    is_email_verified = False
    status = "pending"

    class Params:
        verified = factory.Trait(
            is_email_verified=True,
            status="active",
        )
        deleted = factory.Trait(
            status="deleted",
            is_email_verified=False,
        )
        suspended = factory.Trait(
            status="suspended",
            is_email_verified=False,
        )


class ActiveUserFactory(UserFactory):
    is_email_verified = True
    status = "active"


class PendingUserFactory(UserFactory):
    is_email_verified = False
    status = "pending"


class UserConsentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserConsent
        skip_postgeneration_save = True

    user = factory.SubFactory(UserFactory)
    purpose = "data_processing"
    consent_version = "v1.0"
    granted = True
    ip_address = "127.0.0.1"


class EmailVerificationTokenFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = EmailVerificationToken
        skip_postgeneration_save = True

    user = factory.SubFactory(UserFactory)
    token = factory.LazyFunction(lambda: secrets.token_urlsafe(48))
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(hours=24))

    class Params:
        expired = factory.Trait(
            expires_at=factory.LazyFunction(lambda: timezone.now() - timedelta(hours=1)),
        )
        used = factory.Trait(
            is_used=True,
        )


class PasswordResetTokenFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PasswordResetToken
        skip_postgeneration_save = True

    user = factory.SubFactory(UserFactory)
    token = factory.LazyFunction(lambda: secrets.token_urlsafe(48))
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(hours=1))

    class Params:
        expired = factory.Trait(
            expires_at=factory.LazyFunction(lambda: timezone.now() - timedelta(hours=1)),
        )
        used = factory.Trait(
            is_used=True,
        )


class ExamFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Exam
        django_get_or_create = ("code",)
        skip_postgeneration_save = True

    code = factory.Sequence(lambda n: f"EXAM_{n:04d}")
    name = factory.Faker("sentence", nb_words=3)
    exam_type = "qualifying"
    is_active = True


class InactiveExamFactory(ExamFactory):
    is_active = False


class RoleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Role
        django_get_or_create = ("name",)
        skip_postgeneration_save = True

    name = factory.Sequence(lambda n: f"role_{n:04d}")
    description = factory.Faker("sentence")
    is_system = False


class PermissionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Permission
        django_get_or_create = ("code",)
        skip_postgeneration_save = True

    code = factory.Sequence(lambda n: f"permission_{n:04d}")
    description = factory.Faker("sentence")


class UserRoleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserRole
        skip_postgeneration_save = True

    user = factory.SubFactory(UserFactory)
    role = factory.SubFactory(RoleFactory)
