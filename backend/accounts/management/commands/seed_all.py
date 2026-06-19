"""Run every seed command in the correct order — SPR1-CLOSEOUT-01.

Single, documented, repeatable entry point so provisioning a fresh environment
needs no tribal knowledge of the inter-seed ordering (audit D4) and never skips
the diagnostic seed that the activation loop depends on (audit R1).

Each underlying command is idempotent, so `seed_all` is safe to re-run.
No schema, contract, or behaviour changes — this only orchestrates existing
management commands via call_command.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand

# Order matters: roles → exam/taxonomy → papers → questions → approvals →
# diagnostic mock test (needs published questions to map).
SEED_SEQUENCE = [
    "seed_roles",
    "seed_ctet",
    "seed_previous_year_papers",
    "seed_questions",
    "seed_question_approvals",
    "seed_ctet_diagnostic",
]


class Command(BaseCommand):
    help = (
        "Run all seed commands in dependency order (idempotent): "
        + " -> ".join(SEED_SEQUENCE)
    )

    def handle(self, *args, **options):
        for name in SEED_SEQUENCE:
            self.stdout.write(self.style.MIGRATE_HEADING(f"-> {name}"))
            call_command(name)

        self.stdout.write(
            self.style.SUCCESS(
                "\nAll seeds applied. Verify activation readiness with:\n"
                "  python manage.py verify_diagnostic_readiness"
            )
        )
