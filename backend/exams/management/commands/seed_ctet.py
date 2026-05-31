"""
Idempotent management command to seed CTET Paper II (Science) exam configuration.

Run after every fresh migration::

    python manage.py seed_ctet

Safe to run multiple times — uses ``get_or_create`` throughout.

CTET Paper II is for classes VI–VIII. The Science stream includes:
- Child Development and Pedagogy (compulsory)
- Language I / Language II
- Mathematics
- Science
"""
from django.core.management.base import BaseCommand

from exams.models import Exam, Subject, Subtopic, Topic

EXAM_DATA = {
    "code": "CTET_P2_SCI",
    "name": "CTET Paper II (Science)",
    "exam_type": "qualifying",
    "difficulty_levels": ["easy", "medium", "hard"],
    "exam_rules": {
        "duration_minutes": 150,
        "total_questions": 150,
        "total_marks": 150,
        "negative_marking": False,
        "sections": [
            {"code": "CDP", "name": "Child Development and Pedagogy", "questions": 30, "marks": 30},
            {"code": "LANG1", "name": "Language I", "questions": 30, "marks": 30},
            {"code": "LANG2", "name": "Language II", "questions": 30, "marks": 30},
            {"code": "MATH", "name": "Mathematics", "questions": 30, "marks": 30},
            {"code": "SCI", "name": "Science", "questions": 60, "marks": 60},
        ],
    },
    "blueprint": {
        "topic_distribution": {
            "CDP": {"weightage": 20, "difficulty": {"easy": 30, "medium": 50, "hard": 20}},
            "Mathematics": {"weightage": 20, "difficulty": {"easy": 25, "medium": 50, "hard": 25}},
            "Science": {"weightage": 40, "difficulty": {"easy": 20, "medium": 55, "hard": 25}},
            "Language I": {"weightage": 10, "difficulty": {"easy": 30, "medium": 50, "hard": 20}},
            "Language II": {"weightage": 10, "difficulty": {"easy": 30, "medium": 50, "hard": 20}},
        },
    },
    "passing_criteria": {
        "general": {"required_percentage": 60},
        "reserved": {"required_percentage": 55},
        "per_section_minimum": 0,
    },
    "analytics_rules": {
        "weak_topic_threshold": 60,
        "readiness_score_weights": {
            "mock_performance": 40,
            "subject_accuracy": 25,
            "topic_accuracy": 15,
            "consistency": 10,
            "practice_completion": 10,
        },
    },
    "audience_is_minor": False,
    "is_active": True,
}

SUBJECTS = {
    "Child Development and Pedagogy": {
        "position": 1,
        "topics": {
            "Child Development": {
                "position": 1,
                "subtopics": [
                    "Growth and Development",
                    "Principles of Development",
                    "Heredity and Environment",
                    "Piaget's Cognitive Development",
                    "Vygotsky's Socio-Cultural Theory",
                    "Kohlberg's Moral Development",
                    "Individual Differences",
                ],
            },
            "Learning": {
                "position": 2,
                "subtopics": [
                    "Theories of Learning",
                    "Concept of Learning",
                    "Motivation and Learning",
                    "Learning Disabilities",
                    "Teaching-Learning Process",
                    "Constructivism",
                    "Assessment and Evaluation",
                ],
            },
            "Pedagogy": {
                "position": 3,
                "subtopics": [
                    "Teaching Methods",
                    "Instructional Strategies",
                    "Classroom Management",
                    "Inclusive Education",
                    "Remedial Teaching",
                    "Questioning Techniques",
                ],
            },
        },
    },
    "Language I": {
        "position": 2,
        "topics": {
            "Grammar": {
                "position": 1,
                "subtopics": [
                    "Parts of Speech",
                    "Tenses",
                    "Sentence Structure",
                    "Punctuation",
                    "Voice and Narration",
                ],
            },
            "Comprehension": {
                "position": 2,
                "subtopics": [
                    "Reading Comprehension",
                    "Inference",
                    "Vocabulary in Context",
                    "Main Idea and Theme",
                ],
            },
            "Pedagogy of Language": {
                "position": 3,
                "subtopics": [
                    "Language Acquisition",
                    "Teaching Prose and Poetry",
                    "Developing Listening and Speaking",
                    "Developing Reading and Writing",
                ],
            },
        },
    },
    "Language II": {
        "position": 3,
        "topics": {
            "Grammar": {
                "position": 1,
                "subtopics": [
                    "Parts of Speech",
                    "Tenses",
                    "Sentence Structure",
                    "Punctuation",
                    "Voice and Narration",
                ],
            },
            "Comprehension": {
                "position": 2,
                "subtopics": [
                    "Reading Comprehension",
                    "Inference",
                    "Vocabulary in Context",
                    "Main Idea and Theme",
                ],
            },
            "Pedagogy of Language": {
                "position": 3,
                "subtopics": [
                    "Language Acquisition",
                    "Teaching Prose and Poetry",
                    "Developing Listening and Speaking",
                    "Developing Reading and Writing",
                ],
            },
        },
    },
    "Mathematics": {
        "position": 4,
        "topics": {
            "Number System": {
                "position": 1,
                "subtopics": [
                    "Integers",
                    "Fractions and Decimals",
                    "Rational Numbers",
                    "Exponents and Powers",
                    "Squares and Square Roots",
                    "Cubes and Cube Roots",
                ],
            },
            "Algebra": {
                "position": 2,
                "subtopics": [
                    "Algebraic Expressions",
                    "Linear Equations",
                    "Ratio and Proportion",
                    "Factorization",
                ],
            },
            "Geometry": {
                "position": 3,
                "subtopics": [
                    "Lines and Angles",
                    "Triangles",
                    "Quadrilaterals",
                    "Circles",
                    "Mensuration",
                    "Symmetry",
                ],
            },
            "Data Handling": {
                "position": 4,
                "subtopics": [
                    "Statistics",
                    "Probability",
                    "Graphical Representation",
                ],
            },
            "Pedagogy of Mathematics": {
                "position": 5,
                "subtopics": [
                    "Mathematical Reasoning",
                    "Problem Solving Strategies",
                    "Teaching Aids and Resources",
                    "Error Analysis",
                ],
            },
        },
    },
    "Science": {
        "position": 5,
        "topics": {
            "Physical Science": {
                "position": 1,
                "subtopics": [
                    "Force and Motion",
                    "Work and Energy",
                    "Sound",
                    "Light",
                    "Electricity and Circuits",
                    "Magnetism",
                    "Heat and Temperature",
                ],
            },
            "Chemical Science": {
                "position": 2,
                "subtopics": [
                    "States of Matter",
                    "Atoms and Molecules",
                    "Chemical Reactions",
                    "Acids Bases and Salts",
                    "Metals and Non-Metals",
                    "Carbon and its Compounds",
                ],
            },
            "Life Sciences": {
                "position": 3,
                "subtopics": [
                    "Cell Structure and Function",
                    "Plant Physiology",
                    "Human Body Systems",
                    "Reproduction",
                    "Heredity and Evolution",
                    "Ecology and Environment",
                    "Microorganisms",
                    "Food Production",
                ],
            },
            "Pedagogy of Science": {
                "position": 4,
                "subtopics": [
                    "Scientific Method",
                    "Laboratory Skills",
                    "Science Curriculum",
                    "Assessment in Science",
                ],
            },
        },
    },
}


class Command(BaseCommand):
    help = "Seed CTET Paper II (Science) exam configuration (idempotent)."

    def handle(self, *args, **options):
        stats = {"created": 0, "updated": 0, "skipped": 0}

        exam, was_created = Exam.objects.get_or_create(
            code=EXAM_DATA["code"],
            defaults={k: v for k, v in EXAM_DATA.items() if k != "code"},
        )
        if was_created:
            stats["created"] += 1
            self.stdout.write(f"  Created exam: {exam.code}")
        else:
            changed = False
            for field, value in EXAM_DATA.items():
                if field == "code":
                    continue
                if getattr(exam, field) != value:
                    setattr(exam, field, value)
                    changed = True
            if changed:
                exam.save(update_fields=[f for f in EXAM_DATA if f != "code"])
                stats["updated"] += 1
                self.stdout.write(f"  Updated exam: {exam.code}")
            else:
                stats["skipped"] += 1
                self.stdout.write(f"  Skipped exam: {exam.code} (unchanged)")

        total_subjects = len(SUBJECTS)
        total_topics = 0
        total_subtopics = 0

        for subject_name, subject_data in SUBJECTS.items():
            subject, _ = Subject.objects.get_or_create(
                exam=exam,
                name=subject_name,
                defaults={"position": subject_data["position"]},
            )

            for topic_name, topic_data in subject_data["topics"].items():
                total_topics += 1
                topic, _ = Topic.objects.get_or_create(
                    subject=subject,
                    name=topic_name,
                    defaults={"position": topic_data["position"]},
                )

                for subtopic_name in topic_data["subtopics"]:
                    total_subtopics += 1
                    Subtopic.objects.get_or_create(
                        topic=topic,
                        name=subtopic_name,
                        defaults={"position": topic_data["subtopics"].index(subtopic_name) + 1},
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Done — {stats['created']} created, {stats['updated']} updated, "
                f"{stats['skipped']} skipped.\n"
                f"Total: {total_subjects} subjects, {total_topics} topics, "
                f"{total_subtopics} subtopics."
            )
        )
