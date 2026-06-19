"""AUTH-HOTFIX-01 — backfill the global ``student`` role for existing users.

Newly registered users now receive the student role in ``create_user``
(``accounts/services/registration.py``). This data migration grants the same
global student role to every user that does not already have it, so users who
registered before the fix (or who hold only reviewer/admin roles) are repaired.
"""
from django.db import migrations


def backfill_student_role(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    UserRole = apps.get_model("accounts", "UserRole")
    User = apps.get_model("accounts", "User")

    student_role = Role.objects.filter(name="student").first()
    if student_role is None:
        # The 'student' Role is created by the `seed_roles` management command,
        # not by a migration. On a fresh/un-seeded database there are also no
        # users to repair, so this is a safe no-op. New users still get the role
        # via the registration service once roles are seeded.
        return

    # Grant the global (institution_id IS NULL) student role to EVERY user that
    # lacks it — not only role-less users. get_or_create keeps this idempotent
    # and respects the uq_user_role_global constraint.
    for user in User.objects.all().iterator():
        UserRole.objects.get_or_create(
            user=user, role=student_role, institution_id=None
        )


def reverse_noop(apps, schema_editor):
    # Documented no-op: backfilled rows cannot be safely distinguished from
    # student roles assigned through normal registration, so the reverse
    # intentionally does nothing.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0006_user_failed_login_attempts_user_locked_until"),
    ]

    operations = [
        migrations.RunPython(backfill_student_role, reverse_noop),
    ]
