"""
Idempotent management command to seed CTET Paper II (Science)
previous year paper records.

Run after every fresh migration::

    python manage.py seed_previous_year_papers

Safe to run multiple times — uses ``get_or_create`` throughout.
"""
from django.core.management.base import BaseCommand

from exams.models import Exam, PreviousYearPaper

PAPERS = [
    {
        "code": "CTET_2023_P2_SCI",
        "year": 2023,
        "language": "en",
        "total_questions": 150,
    },
    {
        "code": "CTET_2024_P2_SCI",
        "year": 2024,
        "language": "en",
        "total_questions": 150,
    },
    {
        "code": "CTET_2025_P2_SCI",
        "year": 2025,
        "language": "en",
        "total_questions": 150,
    },
]


class Command(BaseCommand):
    help = "Seed CTET Paper II (Science) previous year paper records (idempotent)."

    def handle(self, *args, **options):
        try:
            exam = Exam.objects.get(code="CTET_P2_SCI")
        except Exam.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    "CTET_P2_SCI exam not found. Run seed_ctet first."
                )
            )
            return

        stats = {"created": 0, "skipped": 0}

        for paper_data in PAPERS:
            _, created = PreviousYearPaper.objects.get_or_create(
                exam=exam,
                code=paper_data["code"],
                defaults={
                    "year": paper_data["year"],
                    "language": paper_data["language"],
                    "total_questions": paper_data["total_questions"],
                },
            )
            if created:
                stats["created"] += 1
                self.stdout.write(f"  Created paper: {paper_data['code']}")
            else:
                stats["skipped"] += 1
                self.stdout.write(f"  Skipped paper: {paper_data['code']} (exists)")

        self.stdout.write(
            self.style.SUCCESS(
                f"Done — {stats['created']} created, {stats['skipped']} skipped."
            )
        )
