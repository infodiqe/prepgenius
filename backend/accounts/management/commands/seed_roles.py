"""
Idempotent management command to seed the canonical roles and permissions.

Run after every fresh migration::

    python manage.py seed_roles

Safe to run multiple times — uses ``get_or_create`` throughout.
Add this to the Docker Compose release step as a post-migration hook.
"""
from django.core.management.base import BaseCommand

from accounts.models import Permission, Role, RolePermission

ROLES = [
    ("student", "Standard student / exam candidate"),
    ("teacher", "Batch teacher (institution-scoped)"),
    ("institution_admin", "Institution administrator"),
    ("content_manager", "Manages exam config, publishes content"),
    ("content_reviewer", "Reviews and approves/rejects questions"),
    ("sme", "Subject Matter Expert — validates accuracy and syllabus"),
    ("platform_admin", "Global platform administrator"),
]

PERMISSIONS = [
    ("question.view", "View published questions"),
    ("question.create", "Create draft questions"),
    ("question.edit", "Edit questions"),
    ("question.approve", "Approve questions (reviewer)"),
    ("question.publish", "Publish approved questions"),
    ("question.generate", "Generate AI draft questions"),
    ("exam.view", "View exam configurations"),
    ("exam.configure", "Configure exams (subjects, topics, rules)"),
    ("mock.create", "Create mock tests"),
    ("institution.manage", "Manage institution and batches"),
    ("credit.view", "View credit balance and transactions"),
    ("credit.grant", "Grant credits (admin)"),
    ("analytics.view", "View analytics"),
    ("user.manage", "Manage users (admin)"),
]

ROLE_PERMISSION_MAP: dict[str, list[str]] = {
    "student": ["question.view", "analytics.view", "credit.view"],
    "teacher": ["question.view", "mock.create", "analytics.view", "credit.view"],
    "institution_admin": [
        "question.view",
        "mock.create",
        "analytics.view",
        "credit.view",
        "institution.manage",
        "credit.grant",
    ],
    "content_manager": [
        "question.view",
        "question.create",
        "question.edit",
        "question.publish",
        "exam.view",
        "exam.configure",
    ],
    "content_reviewer": ["question.view", "question.edit", "question.approve"],
    "sme": ["question.view", "question.edit", "question.approve"],
    "platform_admin": [code for code, _desc in PERMISSIONS],
}


class Command(BaseCommand):
    help = "Seed canonical roles and permissions (idempotent)."

    def handle(self, *args, **options):
        created_roles = 0
        created_perms = 0
        created_assignments = 0

        for name, desc in ROLES:
            _role, was_created = Role.objects.get_or_create(
                name=name,
                defaults={"description": desc, "is_system": True},
            )
            if was_created:
                created_roles += 1
                self.stdout.write(f"  Created role: {name}")

        for code, desc in PERMISSIONS:
            _perm, was_created = Permission.objects.get_or_create(
                code=code,
                defaults={"description": desc},
            )
            if was_created:
                created_perms += 1
                self.stdout.write(f"  Created permission: {code}")

        role_cache = {r.name: r for r in Role.objects.all()}
        perm_cache = {p.code: p for p in Permission.objects.all()}

        for role_name, perm_codes in ROLE_PERMISSION_MAP.items():
            role = role_cache[role_name]
            for code in perm_codes:
                _rp, was_created = RolePermission.objects.get_or_create(
                    role=role,
                    permission=perm_cache[code],
                )
                if was_created:
                    created_assignments += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done — {created_roles} roles, {created_perms} permissions, "
                f"{created_assignments} role-permission assignments created."
            )
        )
