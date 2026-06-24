from django.urls import path

from exams.api.views import (
    ExamActivate,
    ExamDeactivate,
    ExamDetail,
    ExamList,
    ExamSubjectList,
    ExamSyllabusList,
    ExamTree,
    PaperDetail,
    PaperList,
    PublicExamDetail,
    PublicExamList,
    PublicExamPreviousYearPapers,
    PublicExamSyllabus,
    SubjectCreate,
    SubjectDetail,
    SubjectTopicList,
    SubtopicCreate,
    SubtopicDetail,
    SyllabusCreate,
    SyllabusDetail,
    TopicCreate,
    TopicDetail,
    TopicSubtopicList,
)

app_name = "exams"

urlpatterns = [
    # Public exam landing pages (T42) — literal "public" segment, declared
    # before the <uuid:pk> detail route.
    path(
        "exams/public/",
        PublicExamList.as_view(),
        name="public-exam-list",
    ),
    path(
        "exams/public/<slug:slug>/",
        PublicExamDetail.as_view(),
        name="public-exam-detail",
    ),
    path(
        "exams/public/<slug:slug>/syllabus/",
        PublicExamSyllabus.as_view(),
        name="public-exam-syllabus",
    ),
    path(
        "exams/public/<slug:slug>/previous-year-papers/",
        PublicExamPreviousYearPapers.as_view(),
        name="public-exam-previous-year-papers",
    ),
    # Exams
    path("exams/", ExamList.as_view(), name="exam-list"),
    path("exams/<uuid:pk>/", ExamDetail.as_view(), name="exam-detail"),
    path("exams/<uuid:pk>/tree/", ExamTree.as_view(), name="exam-tree"),
    path(
        "exams/<uuid:pk>/activate/",
        ExamActivate.as_view(),
        name="exam-activate",
    ),
    path(
        "exams/<uuid:pk>/deactivate/",
        ExamDeactivate.as_view(),
        name="exam-deactivate",
    ),
    # Subjects
    path(
        "exams/<uuid:exam_pk>/subjects/",
        ExamSubjectList.as_view(),
        name="exam-subject-list",
    ),
    path("subjects/", SubjectCreate.as_view(), name="subject-create"),
    path(
        "subjects/<uuid:pk>/", SubjectDetail.as_view(), name="subject-detail"
    ),
    # Topics
    path(
        "subjects/<uuid:subject_pk>/topics/",
        SubjectTopicList.as_view(),
        name="subject-topic-list",
    ),
    path("topics/", TopicCreate.as_view(), name="topic-create"),
    path("topics/<uuid:pk>/", TopicDetail.as_view(), name="topic-detail"),
    # Subtopics
    path(
        "topics/<uuid:topic_pk>/subtopics/",
        TopicSubtopicList.as_view(),
        name="topic-subtopic-list",
    ),
    path(
        "subtopics/", SubtopicCreate.as_view(), name="subtopic-create"
    ),
    path(
        "subtopics/<uuid:pk>/",
        SubtopicDetail.as_view(),
        name="subtopic-detail",
    ),
    # Syllabus
    path(
        "exams/<uuid:exam_pk>/syllabus/",
        ExamSyllabusList.as_view(),
        name="exam-syllabus-list",
    ),
    path(
        "syllabus/", SyllabusCreate.as_view(), name="syllabus-create"
    ),
    path(
        "syllabus/<uuid:pk>/",
        SyllabusDetail.as_view(),
        name="syllabus-detail",
    ),
    # Previous Year Papers
    path("papers/", PaperList.as_view(), name="paper-list"),
    path(
        "papers/<uuid:pk>/", PaperDetail.as_view(), name="paper-detail"
    ),
]
