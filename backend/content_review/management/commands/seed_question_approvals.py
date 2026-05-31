from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from accounts.models import Role
from content_review.models import ContentApproval
from questions.models import Question

User = get_user_model()


class Command(BaseCommand):
    help = "Seed ContentApproval records for published questions."

    def handle(self, *args, **options):
        # Find a content_manager/platform_admin user to act as the approver.
        # Fall back to any active user if none found.
        admin_role = Role.objects.filter(
            name__in=["content_manager", "platform_admin"]
        ).first()
        if admin_role:
            approver = (
                User.objects.filter(user_roles__role=admin_role)
                .order_by("date_joined")
                .first()
            )
        else:
            approver = None

        if not approver:
            approver = (
                User.objects.filter(is_active=True).order_by("date_joined").first()
            )
            if not approver:
                raise CommandError(
                    "No active user found to assign as approver. "
                    "Create a user first (e.g., via seed_roles and createsuperuser)."
                )

        published = Question.objects.filter(
            review_status="published"
        ).select_related("exam")
        total = published.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("No published questions found."))
            return

        approvals_created = 0
        approvals_skipped = 0

        for question in published:
            # Reviewer-level approval for every published question
            _, created = ContentApproval.objects.get_or_create(
                question=question,
                approval_level="reviewer",
                defaults={
                    "approver": approver,
                    "note": "Approved via seed; question meets content standards.",
                },
            )
            if created:
                approvals_created += 1
            else:
                approvals_skipped += 1

            # SME-level approval for hard questions (difficulty >= 4)
            if question.difficulty >= 4:
                _, sme_created = ContentApproval.objects.get_or_create(
                    question=question,
                    approval_level="sme",
                    defaults={
                        "approver": approver,
                        "note": (
                            "SME-verified via seed; hard question accuracy "
                            "and syllabus alignment confirmed."
                        ),
                    },
                )
                if sme_created:
                    approvals_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"ContentApprovals: {approvals_created} created, "
                f"{approvals_skipped} reviewer-level skipped (already exist)"
            )
        )
