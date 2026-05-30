import uuid

from django.db import models


class SyllabusItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(
        "exams.Exam", on_delete=models.CASCADE, related_name="syllabus_items"
    )
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE
    )
    topic = models.ForeignKey(
        "exams.Topic", null=True, blank=True, on_delete=models.SET_NULL
    )
    subtopic = models.ForeignKey(
        "exams.Subtopic", null=True, blank=True, on_delete=models.SET_NULL
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    weightage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    position = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Syllabus Item"
        verbose_name_plural = "Syllabus Items"
        indexes = [
            models.Index(fields=["exam"]),
            models.Index(fields=["parent"]),
        ]

    def __str__(self) -> str:
        return f"{self.exam.code} / {self.title}"
