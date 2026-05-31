from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from data.seeds.ctet import ALL_QUESTIONS, ALL_AI_RECORDS
from exams.models import Exam, Subject, Topic, Subtopic, PreviousYearPaper
from questions.models import Question, QuestionOption, QuestionAppearance, QuestionStat, AiGeneratedQuestion


def _resolve_subtopic(exam, subject_name, topic_name, subtopic_name):
    try:
        subject = Subject.objects.get(exam=exam, name=subject_name)
        topic = Topic.objects.get(subject=subject, name=topic_name)
        subtopic = Subtopic.objects.get(topic=topic, name=subtopic_name)
        return subtopic
    except (Subject.DoesNotExist, Topic.DoesNotExist, Subtopic.DoesNotExist) as e:
        raise CommandError(
            f"Taxonomy not found: exam={exam.code}, subject={subject_name}, "
            f"topic={topic_name}, subtopic={subtopic_name}: {e}"
        )


def _get_paper(exam, year):
    try:
        return PreviousYearPaper.objects.get(exam=exam, year=year)
    except PreviousYearPaper.DoesNotExist:
        return None


class Command(BaseCommand):
    help = "Seed 125 CTET questions with options, appearances, stats, and AI-gen records."

    def handle(self, *args, **options):
        try:
            exam = Exam.objects.get(code="CTET_P2_SCI")
        except Exam.DoesNotExist:
            raise CommandError(
                "Exam CTET_P2_SCI not found. Run seed_ctet first."
            )

        # ── Questions ──
        q_created = 0
        q_skipped = 0
        opts_created = 0
        apps_created = 0
        stats_created = 0

        for idx, qdata in enumerate(ALL_QUESTIONS):
            subtopic = _resolve_subtopic(
                exam, qdata["subject"], qdata["topic"], qdata["subtopic"]
            )

            question, was_created = Question.objects.get_or_create(
                stem=qdata["stem"],
                defaults={
                    "exam": exam,
                    "subtopic": subtopic,
                    "explanation": qdata.get("explanation", ""),
                    "difficulty": qdata.get("difficulty", 2),
                    "language": qdata.get("language", "en"),
                    "origin": qdata.get("origin", "manual"),
                    "review_status": qdata.get("review_status", "draft"),
                    "tags": qdata.get("tags", {}),
                },
            )

            if was_created:
                q_created += 1
            else:
                q_skipped += 1

            # Options (always create if missing, idempotent via unique constraint)
            for opt_data in qdata.get("options", []):
                opt_defaults = {
                    "body": opt_data["body"],
                    "is_correct": opt_data["is_correct"],
                    "position": ord(opt_data["label"]) - ord("A"),
                }
                _, opt_created = QuestionOption.objects.get_or_create(
                    question=question,
                    label=opt_data["label"],
                    defaults=opt_defaults,
                )
                if opt_created:
                    opts_created += 1

            # Appearances
            for year in qdata.get("appearances", []):
                paper = _get_paper(exam, year)
                if paper is None:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  Paper for year {year} not found; skipping appearance."
                        )
                    )
                    continue
                _, app_created = QuestionAppearance.objects.get_or_create(
                    question=question, paper=paper, defaults={"year": year}
                )
                if app_created:
                    apps_created += 1

            # QuestionStats (zero-initialized, one-to-one)
            _, stat_created = QuestionStat.objects.get_or_create(
                question=question,
                defaults={
                    "attempts": 0,
                    "correct": 0,
                    "success_rate": 0,
                    "avg_time_seconds": 0,
                },
            )
            if stat_created:
                stats_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Questions: {q_created} created, {q_skipped} skipped\n"
                f"Options: {opts_created} created\n"
                f"Appearances: {apps_created} created\n"
                f"Stats: {stats_created} created"
            )
        )

        # ── AI Generated Question Records ──
        ai_created = 0
        ai_skipped = 0

        for rec in ALL_AI_RECORDS:
            batch_id = rec.get("generation_batch")

            subtopic_path = rec.get("subtopic_path", {})
            ai_subtopic = _resolve_subtopic(
                exam,
                subtopic_path["subject"],
                subtopic_path["topic"],
                subtopic_path["subtopic"],
            )

            # Try to link promoted records to a matching published question
            resulting_question = None
            if rec.get("status") == "promoted":
                linked_subtopic_name = rec.get("link_to_question_subtopic")
                if linked_subtopic_name:
                    try:
                        qs = Question.objects.filter(
                            exam=exam,
                            subtopic=ai_subtopic,
                            review_status="published",
                        )
                        if qs.exists():
                            resulting_question = qs.first()
                    except Question.DoesNotExist:
                        pass

            _, was_created = AiGeneratedQuestion.objects.get_or_create(
                exam=exam,
                subtopic=ai_subtopic,
                model_used=rec["model_used"],
                status=rec["status"],
                defaults={
                    "generation_batch": batch_id,
                    "prompt": rec.get("prompt", ""),
                    "constraints_snapshot": rec.get("constraints_snapshot", {}),
                    "raw_output": rec.get("raw_output", ""),
                    "validation": rec.get("validation", {}),
                    "credits_charged": rec.get("credits_charged", 0),
                    "resulting_question": resulting_question,
                },
            )
            if was_created:
                ai_created += 1
            else:
                ai_skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"AI Generated Records: {ai_created} created, {ai_skipped} skipped"
            )
        )
