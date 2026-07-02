from uuid import UUID

from django.core.exceptions import ObjectDoesNotExist
from drf_spectacular.utils import (
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
    extend_schema_view,
)
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStudent
from common.permissions import IsAuthenticatedReadOnly

from attempts.exceptions import (
    AttemptAlreadyScoredError,
    AttemptDomainError,
    AttemptAlreadySubmittedError,
    DuplicateAnswerError,
    ExamAttemptNotFoundError,
    InvalidAttemptTransitionError,
    MockTestNotFoundError,
    MockTestNotPublishedError,
    MockTestQuestionNotFoundError,
    MockTestQuestionNotUniqueError,
    UserAnswerNotFoundError,
)
from attempts.selectors.attempt_selectors import (
    get_exam_attempt_by_id,
    get_mock_test_by_id,
    get_mock_test_question_by_id,
    get_user_answer_by_id,
    list_answers_for_attempt,
    list_attempts,
    list_mock_test_questions,
    list_mock_tests,
)
from attempts.services.attempt_services import (
    add_question_to_mock_test,
    create_attempt,
    create_mock_test,
    delete_mock_test,
    remove_question_from_mock_test,
    save_answer,
    score_attempt,
    start_attempt,
    submit_attempt,
    update_mock_test,
)
from attempts.services.practice_services import create_practice_attempt
from exams.exceptions import ExamNotFoundError

from .serializers import (
    ExamAttemptCreateSerializer,
    ExamAttemptReadSerializer,
    PracticeAttemptCreateSerializer,
    MockTestCreateSerializer,
    MockTestQuestionCreateSerializer,
    MockTestQuestionReadSerializer,
    MockTestReadSerializer,
    MockTestUpdateSerializer,
    ScoredAttemptDetailSerializer,
    UserAnswerBulkSaveSerializer,
    UserAnswerPlayerSerializer,
    UserAnswerSaveSerializer,
)

_NOT_FOUND_ERRORS = (
    MockTestNotFoundError,
    MockTestQuestionNotFoundError,
    ExamAttemptNotFoundError,
    UserAnswerNotFoundError,
)


class AttemptBaseView(APIView):
    permission_classes = [IsAuthenticatedReadOnly]

    def handle_exception(self, exc):
        if isinstance(exc, AttemptDomainError):
            if isinstance(exc, _NOT_FOUND_ERRORS):
                exc = NotFound(str(exc))
            else:
                exc = ValidationError(str(exc))
        elif isinstance(exc, ExamNotFoundError):
            # create_attempt / create_practice_attempt wrap a missing exam_id in
            # ExamNotFoundError (an exams-domain error). Without this it would
            # surface as an unhandled 500; a bad exam reference is a 404.
            exc = NotFound(str(exc))
        elif isinstance(exc, ObjectDoesNotExist):
            exc = NotFound(str(exc))
        return super().handle_exception(exc)


def _get_owned_attempt_or_404(*, attempt_id: UUID, user_id: UUID):
    attempt = get_exam_attempt_by_id(attempt_id=attempt_id)
    if attempt.user_id != user_id:
        raise NotFound(str(ExamAttemptNotFoundError(str(attempt_id))))
    return attempt


# ═══════════════════════════════════════════════════════════════════════
# MOCK TESTS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    get=extend_schema(
        summary="List mock tests",
        description="List mock tests with optional exam_id and is_published filters.",
        parameters=[
            OpenApiParameter(
                name="exam_id",
                type={"type": "string", "format": "uuid"},
                required=False,
                location=OpenApiParameter.QUERY,
                description="Filter by exam UUID",
            ),
            OpenApiParameter(
                name="is_published",
                type=bool,
                required=False,
                location=OpenApiParameter.QUERY,
                description="Filter by published status",
            ),
        ],
        responses={
            200: MockTestReadSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
    post=extend_schema(
        summary="Create mock test",
        description="Create a new mock test. Requires content_manager or platform_admin role.",
        request=MockTestCreateSerializer,
        responses={
            201: MockTestReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
)
class MockTestList(AttemptBaseView):
    def get(self, request):
        exam_id = request.query_params.get("exam_id")
        is_published = request.query_params.get("is_published")
        exam_uuid: UUID | None = UUID(exam_id) if exam_id else None
        published: bool | None = (
            is_published.lower() == "true"
            if is_published
            else None
        )
        mock_tests = list_mock_tests(
            exam_id=exam_uuid, is_published=published
        )
        return Response(MockTestReadSerializer(mock_tests, many=True).data)

    def post(self, request):
        serializer = MockTestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mock_test = create_mock_test(**serializer.validated_data)
        return Response(
            MockTestReadSerializer(mock_test).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve mock test",
        description="Get a single mock test by ID.",
        responses={
            200: MockTestReadSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Mock test not found"),
        },
    ),
    patch=extend_schema(
        summary="Update mock test",
        description="Partially update a mock test. Requires content_manager or platform_admin role.",
        request=MockTestUpdateSerializer,
        responses={
            200: MockTestReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Mock test not found"),
        },
    ),
    delete=extend_schema(
        summary="Delete mock test",
        description="Delete a mock test. Requires content_manager or platform_admin role.",
        responses={
            204: None,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Mock test not found"),
        },
    ),
)
class MockTestDetail(AttemptBaseView):
    def get(self, request, pk: UUID):
        mock_test = get_mock_test_by_id(mock_test_id=pk)
        return Response(MockTestReadSerializer(mock_test).data)

    def patch(self, request, pk: UUID):
        serializer = MockTestUpdateSerializer(
            data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        mock_test = update_mock_test(
            mock_test_id=pk, **serializer.validated_data
        )
        return Response(MockTestReadSerializer(mock_test).data)

    def delete(self, request, pk: UUID):
        delete_mock_test(mock_test_id=pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# MOCK TEST QUESTIONS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    get=extend_schema(
        summary="List questions in mock test",
        description="Retrieve all questions belonging to a mock test.",
        responses={
            200: MockTestQuestionReadSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Mock test not found"),
        },
    ),
    post=extend_schema(
        summary="Add question to mock test",
        description="Add a question to a mock test. Requires content_manager or platform_admin role.",
        request=MockTestQuestionCreateSerializer,
        responses={
            201: MockTestQuestionReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Mock test or question not found"),
        },
    ),
)
class MockTestQuestionList(AttemptBaseView):
    def get(self, request, mock_test_pk: UUID):
        questions = list_mock_test_questions(mock_test_id=mock_test_pk)
        return Response(
            MockTestQuestionReadSerializer(questions, many=True).data
        )

    def post(self, request, mock_test_pk: UUID):
        serializer = MockTestQuestionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mtq = add_question_to_mock_test(
            mock_test_id=mock_test_pk,
            question_id=serializer.validated_data["question_id"],
            position=serializer.validated_data["position"],
            section=serializer.validated_data.get("section"),
            marks=serializer.validated_data.get("marks", 1),
        )
        return Response(
            MockTestQuestionReadSerializer(mtq).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    delete=extend_schema(
        summary="Remove question from mock test",
        description="Remove a question from a mock test. Requires content_manager or platform_admin role.",
        responses={
            204: None,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Mock test question not found"),
        },
    ),
)
class MockTestQuestionDetail(AttemptBaseView):
    def delete(self, request, pk: UUID):
        remove_question_from_mock_test(mock_test_question_id=pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# EXAM ATTEMPTS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    get=extend_schema(
        summary="List attempts",
        description="List exam attempts with optional filters.",
        parameters=[
            OpenApiParameter(
                name="exam_id",
                type={"type": "string", "format": "uuid"},
                required=False,
                location=OpenApiParameter.QUERY,
                description="Filter by exam UUID",
            ),
            OpenApiParameter(
                name="status",
                type=str,
                required=False,
                location=OpenApiParameter.QUERY,
                description="Filter by status (created, in_progress, submitted, scored)",
            ),
        ],
        responses={
            200: ExamAttemptReadSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
    post=extend_schema(
        summary="Create attempt",
        description="Create a new exam attempt (practice session or mock test).",
        request=ExamAttemptCreateSerializer,
        responses={
            201: ExamAttemptReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
)
class AttemptList(AttemptBaseView):
    permission_classes = [IsStudent]

    def get(self, request):
        user = request.user
        exam_id = request.query_params.get("exam_id")
        status_filter = request.query_params.get("status")
        exam_uuid: UUID | None = UUID(exam_id) if exam_id else None
        attempts = list_attempts(
            user_id=user.id,
            exam_id=exam_uuid,
            status=status_filter,
        )
        return Response(
            ExamAttemptReadSerializer(attempts, many=True).data
        )

    def post(self, request):
        serializer = ExamAttemptCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attempt = create_attempt(
            user_id=request.user.id,
            **serializer.validated_data,
        )
        return Response(
            ExamAttemptReadSerializer(attempt).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    post=extend_schema(
        summary="Create practice attempt",
        description=(
            "Create a Topic/Subject/Mixed practice attempt. The server selects "
            "published questions for the scope, generates a custom mock test, "
            "and returns an attempt that reuses the full player/scoring/"
            "analytics pipeline."
        ),
        request=PracticeAttemptCreateSerializer,
        responses={
            201: ExamAttemptReadSerializer,
            400: OpenApiResponse(description="Validation error / no questions"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
)
class PracticeAttemptCreate(AttemptBaseView):
    permission_classes = [IsStudent]

    def post(self, request):
        serializer = PracticeAttemptCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attempt = create_practice_attempt(
            user_id=request.user.id,
            **serializer.validated_data,
        )
        return Response(
            ExamAttemptReadSerializer(attempt).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve attempt",
        description="Get details of a single exam attempt by ID.",
        responses={
            200: ScoredAttemptDetailSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Attempt not found"),
        },
    ),
)
class AttemptDetail(AttemptBaseView):
    permission_classes = [IsStudent]

    def get(self, request, pk: UUID):
        attempt = _get_owned_attempt_or_404(
            attempt_id=pk, user_id=request.user.id
        )
        return Response(ScoredAttemptDetailSerializer(attempt).data)


@extend_schema_view(
    post=extend_schema(
        summary="Start attempt",
        description="Start an exam attempt (transition from created to in_progress).",
        responses={
            200: ExamAttemptReadSerializer,
            400: OpenApiResponse(description="Invalid transition or mock test not published"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Attempt not found"),
        },
    ),
)
class AttemptStart(AttemptBaseView):
    permission_classes = [IsStudent]

    def post(self, request, pk: UUID):
        _get_owned_attempt_or_404(attempt_id=pk, user_id=request.user.id)
        attempt = start_attempt(attempt_id=pk)
        return Response(ExamAttemptReadSerializer(attempt).data)


@extend_schema_view(
    post=extend_schema(
        summary="Submit attempt",
        description="Submit an exam attempt (transition from in_progress to submitted).",
        responses={
            200: ExamAttemptReadSerializer,
            400: OpenApiResponse(description="Invalid transition"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Attempt not found"),
        },
    ),
)
class AttemptSubmit(AttemptBaseView):
    permission_classes = [IsStudent]

    def post(self, request, pk: UUID):
        _get_owned_attempt_or_404(attempt_id=pk, user_id=request.user.id)
        attempt = submit_attempt(attempt_id=pk)
        return Response(ExamAttemptReadSerializer(attempt).data)


@extend_schema_view(
    post=extend_schema(
        summary="Score attempt (admin override)",
        description=(
            "Score a submitted attempt (transition from submitted to scored). "
            "Scoring is normally triggered automatically when a student submits "
            "via POST /submit/. This endpoint is an admin-only recovery path for "
            "attempts that remain in 'submitted' status due to an auto-score "
            "failure. Requires content_manager or platform_admin role."
        ),
        responses={
            200: ScoredAttemptDetailSerializer,
            400: OpenApiResponse(description="Invalid transition"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Attempt not found"),
        },
    ),
)
class AttemptScore(AttemptBaseView):
    def post(self, request, pk: UUID):
        attempt = score_attempt(attempt_id=pk)
        return Response(ScoredAttemptDetailSerializer(attempt).data)


# ═══════════════════════════════════════════════════════════════════════
# USER ANSWERS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    get=extend_schema(
        summary="List answers for attempt",
        description="Retrieve all answers belonging to an attempt. Correctness "
                    "(is_correct) is intentionally excluded while the attempt is "
                    "in progress; it is only available after scoring.",
        responses={
            200: UserAnswerPlayerSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Attempt not found"),
        },
    ),
)
class UserAnswerList(AttemptBaseView):
    permission_classes = [IsStudent]

    def get(self, request, attempt_pk: UUID):
        _get_owned_attempt_or_404(
            attempt_id=attempt_pk, user_id=request.user.id
        )
        answers = list_answers_for_attempt(attempt_id=attempt_pk)
        return Response(UserAnswerPlayerSerializer(answers, many=True).data)


@extend_schema_view(
    post=extend_schema(
        summary="Save answer",
        description="Save a single answer for a question in an active attempt. Idempotent "
                    "(same attempt+question updates existing).",
        request=UserAnswerSaveSerializer,
        responses={
            200: UserAnswerPlayerSerializer,
            400: OpenApiResponse(description="Validation error or attempt not in progress"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Attempt or question not found"),
        },
    ),
)
class UserAnswerSave(AttemptBaseView):
    permission_classes = [IsStudent]

    def post(self, request, attempt_pk: UUID):
        _get_owned_attempt_or_404(
            attempt_id=attempt_pk, user_id=request.user.id
        )
        serializer = UserAnswerSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answer = save_answer(
            attempt_id=attempt_pk, **serializer.validated_data
        )
        return Response(UserAnswerPlayerSerializer(answer).data)


@extend_schema_view(
    post=extend_schema(
        summary="Bulk save answers",
        description="Save multiple answers at once for an active attempt.",
        request=UserAnswerBulkSaveSerializer,
        responses={
            200: UserAnswerPlayerSerializer(many=True),
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Attempt or question not found"),
        },
    ),
)
class UserAnswerBulkSave(AttemptBaseView):
    permission_classes = [IsStudent]

    def post(self, request, attempt_pk: UUID):
        _get_owned_attempt_or_404(
            attempt_id=attempt_pk, user_id=request.user.id
        )
        serializer = UserAnswerBulkSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answers = []
        from attempts.services.attempt_services import bulk_save_answers

        results = bulk_save_answers(
            attempt_id=attempt_pk,
            answers=serializer.validated_data["answers"],
        )
        return Response(
            UserAnswerPlayerSerializer(results, many=True).data
        )
