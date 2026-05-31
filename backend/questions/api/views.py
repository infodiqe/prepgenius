from uuid import UUID

from django.core.exceptions import ObjectDoesNotExist
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStudent
from common.permissions import (
    CanManageExamConfiguration,
    IsAuthenticatedReadOnly,
)

from questions.exceptions import (
    AiGeneratedQuestionInvalidStateError,
    AiGeneratedQuestionNotFoundError,
    ApprovalRequiredForPublishError,
    QuestionAlreadyClaimedError,
    QuestionAppearanceNotFoundError,
    QuestionAppearanceNotUniqueError,
    QuestionDomainError,
    QuestionHasMultipleCorrectOptionsError,
    QuestionHasNoCorrectOptionError,
    QuestionNotClaimedError,
    QuestionNotFoundError,
    QuestionOptionLabelNotUniqueError,
    QuestionOptionNotFoundError,
    QuestionStatNotFoundError,
)
from questions.selectors.learner_selectors import (
    get_published_question_by_id,
    list_published_questions,
    list_published_questions_for_subtopic,
)
from questions.selectors.question_selectors import (
    get_ai_generated_question_by_id,
    get_question_appearance_by_id,
    get_question_by_id,
    get_question_option_by_id,
    get_question_stat_by_id,
    list_ai_generations_for_exam,
    list_question_appearances_for_question,
    list_question_options_for_question,
    list_questions,
)
from questions.serializers import (
    AiGeneratedPromoteSerializer,
    AiGeneratedQuestionCreateSerializer,
    AiGeneratedQuestionReadSerializer,
    AiGeneratedQuestionUpdateSerializer,
    QuestionAppearanceCreateSerializer,
    QuestionAppearanceReadSerializer,
    QuestionCreateSerializer,
    QuestionOptionCreateSerializer,
    QuestionOptionReadSerializer,
    QuestionOptionUpdateSerializer,
    QuestionReadSerializer,
    QuestionStatReadSerializer,
    QuestionUpdateSerializer,
)
from questions.services.question_services import (
    claim_question_for_review,
    create_ai_generated_question,
    create_question,
    create_question_appearance,
    create_question_option,
    delete_ai_generated_question,
    delete_question,
    delete_question_appearance,
    delete_question_option,
    promote_ai_generated_question,
    release_claim,
    update_ai_generated_question,
    update_question,
    update_question_option,
)

_NOT_FOUND_ERRORS = (
    QuestionNotFoundError,
    QuestionOptionNotFoundError,
    QuestionAppearanceNotFoundError,
    QuestionStatNotFoundError,
    AiGeneratedQuestionNotFoundError,
)


class QuestionBaseView(APIView):
    permission_classes = [IsAuthenticatedReadOnly]

    def handle_exception(self, exc):
        if isinstance(exc, QuestionDomainError):
            if isinstance(exc, _NOT_FOUND_ERRORS):
                exc = NotFound(str(exc))
            else:
                exc = ValidationError(str(exc))
        elif isinstance(exc, ObjectDoesNotExist):
            exc = NotFound(str(exc))
        return super().handle_exception(exc)


# ═══════════════════════════════════════════════════════════════════════
# QUESTIONS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    get=extend_schema(
        summary="List questions",
        description="List questions with optional exam_id and review_status filters.",
        parameters=[
            OpenApiParameter(name="exam_id", type={"type": "string", "format": "uuid"}, required=False, location=OpenApiParameter.QUERY, description="Filter by exam UUID"),
            OpenApiParameter(name="review_status", type=str, required=False, location=OpenApiParameter.QUERY, description="Filter by review status (draft, in_review, approved, published, rejected)"),
        ],
        responses={
            200: QuestionReadSerializer(many=True),
            400: OpenApiResponse(description="Invalid query parameter"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
    post=extend_schema(
        summary="Create question",
        description="Create a new question. Requires content_manager or platform_admin role.",
        request=QuestionCreateSerializer,
        responses={
            201: QuestionReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
)
class QuestionList(QuestionBaseView):
    def get(self, request):
        exam_id = request.query_params.get("exam_id")
        review_status = request.query_params.get("review_status")
        exam_uuid: UUID | None = UUID(exam_id) if exam_id else None
        questions = list_questions(
            exam_id=exam_uuid, review_status=review_status
        )
        return Response(QuestionReadSerializer(questions, many=True).data)

    def post(self, request):
        serializer = QuestionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = create_question(**serializer.validated_data)
        return Response(
            QuestionReadSerializer(question).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve question",
        description="Get a single question by ID.",
        responses={
            200: QuestionReadSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
    patch=extend_schema(
        summary="Update question",
        description="Partially update a question. Requires content_manager or platform_admin role.",
        request=QuestionUpdateSerializer,
        responses={
            200: QuestionReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
    delete=extend_schema(
        summary="Delete question",
        description="Delete a question. Requires content_manager or platform_admin role.",
        responses={
            204: None,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class QuestionDetail(QuestionBaseView):
    serializer_class = QuestionReadSerializer
    def get(self, request, pk: UUID):
        question = get_question_by_id(question_id=pk)
        return Response(QuestionReadSerializer(question).data)

    def patch(self, request, pk: UUID):
        serializer = QuestionUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        question = update_question(question_id=pk, **serializer.validated_data)
        return Response(QuestionReadSerializer(question).data)

    def delete(self, request, pk: UUID):
        delete_question(question_id=pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# QUESTION OPTIONS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    get=extend_schema(
        summary="List options for question",
        description="Retrieve all options belonging to a question.",
        responses={
            200: QuestionOptionReadSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class QuestionOptionList(QuestionBaseView):
    def get(self, request, question_pk: UUID):
        options = list_question_options_for_question(question_id=question_pk)
        return Response(QuestionOptionReadSerializer(options, many=True).data)


@extend_schema_view(
    post=extend_schema(
        summary="Create question option",
        description="Create a new option for a question. Requires content_manager or platform_admin role.",
        request=QuestionOptionCreateSerializer,
        responses={
            201: QuestionOptionReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
)
class QuestionOptionCreate(QuestionBaseView):
    permission_classes = [CanManageExamConfiguration]

    def post(self, request):
        serializer = QuestionOptionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        option = create_question_option(**serializer.validated_data)
        return Response(
            QuestionOptionReadSerializer(option).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve question option",
        description="Get a single option by ID.",
        responses={
            200: QuestionOptionReadSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Option not found"),
        },
    ),
    patch=extend_schema(
        summary="Update question option",
        description="Partially update an option. Requires content_manager or platform_admin role.",
        request=QuestionOptionUpdateSerializer,
        responses={
            200: QuestionOptionReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Option not found"),
        },
    ),
    delete=extend_schema(
        summary="Delete question option",
        description="Delete an option. Requires content_manager or platform_admin role.",
        responses={
            204: None,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Option not found"),
        },
    ),
)
class QuestionOptionDetail(QuestionBaseView):
    serializer_class = QuestionOptionReadSerializer
    def get(self, request, pk: UUID):
        option = get_question_option_by_id(option_id=pk)
        return Response(QuestionOptionReadSerializer(option).data)

    def patch(self, request, pk: UUID):
        serializer = QuestionOptionUpdateSerializer(
            data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        option = update_question_option(option_id=pk, **serializer.validated_data)
        return Response(QuestionOptionReadSerializer(option).data)

    def delete(self, request, pk: UUID):
        delete_question_option(option_id=pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# QUESTION APPEARANCES
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    get=extend_schema(
        summary="List appearances for question",
        description="Retrieve all previous-year appearances for a question.",
        responses={
            200: QuestionAppearanceReadSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Question not found"),
        },
    ),
)
class QuestionAppearanceList(QuestionBaseView):
    def get(self, request, question_pk: UUID):
        appearances = list_question_appearances_for_question(
            question_id=question_pk
        )
        return Response(
            QuestionAppearanceReadSerializer(appearances, many=True).data
        )


@extend_schema_view(
    post=extend_schema(
        summary="Create question appearance",
        description="Record a question appearance in a previous-year paper. Requires content_manager or platform_admin role.",
        request=QuestionAppearanceCreateSerializer,
        responses={
            201: QuestionAppearanceReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
)
class QuestionAppearanceCreate(QuestionBaseView):
    permission_classes = [CanManageExamConfiguration]

    def post(self, request):
        serializer = QuestionAppearanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appearance = create_question_appearance(**serializer.validated_data)
        return Response(
            QuestionAppearanceReadSerializer(appearance).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    delete=extend_schema(
        summary="Delete question appearance",
        description="Delete a question appearance. Requires content_manager or platform_admin role.",
        responses={
            204: None,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Appearance not found"),
        },
    ),
)
class QuestionAppearanceDelete(QuestionBaseView):
    serializer_class = QuestionAppearanceReadSerializer
    permission_classes = [CanManageExamConfiguration]

    def delete(self, request, pk: UUID):
        delete_question_appearance(appearance_id=pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# QUESTION STATS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve question stats",
        description="Get performance statistics for a question.",
        responses={
            200: QuestionStatReadSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Stats not found"),
        },
    ),
)
class QuestionStatsDetail(QuestionBaseView):
    def get(self, request, question_pk: UUID):
        stats = get_question_stat_by_id(question_id=question_pk)
        return Response(QuestionStatReadSerializer(stats).data)


# ═══════════════════════════════════════════════════════════════════════
# AI GENERATED QUESTIONS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    get=extend_schema(
        summary="List AI generations",
        description="List AI-generated questions for an exam. Requires content_manager or platform_admin role.",
        parameters=[
            OpenApiParameter(name="exam_id", type={"type": "string", "format": "uuid"}, required=True, location=OpenApiParameter.QUERY, description="Filter by exam UUID"),
            OpenApiParameter(name="status", type=str, required=False, location=OpenApiParameter.QUERY, description="Filter by generation status (generated, validated, promoted, discarded)"),
        ],
        responses={
            200: AiGeneratedQuestionReadSerializer(many=True),
            400: OpenApiResponse(description="Missing required query parameter"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
    post=extend_schema(
        summary="Create AI generation",
        description="Record a new AI generation attempt. Requires content_manager or platform_admin role.",
        request=AiGeneratedQuestionCreateSerializer,
        responses={
            201: AiGeneratedQuestionReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
)
class AiGeneratedList(QuestionBaseView):
    permission_classes = [CanManageExamConfiguration]

    def get(self, request):
        exam_id = request.query_params.get("exam_id")
        if not exam_id:
            raise ValidationError("exam_id query parameter is required")
        status_filter = request.query_params.get("status")
        generations = list_ai_generations_for_exam(
            exam_id=UUID(exam_id), status=status_filter
        )
        return Response(
            AiGeneratedQuestionReadSerializer(generations, many=True).data
        )

    def post(self, request):
        serializer = AiGeneratedQuestionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ai_gen = create_ai_generated_question(**serializer.validated_data)
        return Response(
            AiGeneratedQuestionReadSerializer(ai_gen).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve AI generation",
        description="Get a single AI generation record by ID. Requires content_manager or platform_admin role.",
        responses={
            200: AiGeneratedQuestionReadSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="AI generation not found"),
        },
    ),
    patch=extend_schema(
        summary="Update AI generation",
        description="Partially update an AI generation record. Requires content_manager or platform_admin role.",
        request=AiGeneratedQuestionUpdateSerializer,
        responses={
            200: AiGeneratedQuestionReadSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="AI generation not found"),
        },
    ),
    delete=extend_schema(
        summary="Delete AI generation",
        description="Delete an AI generation record. Requires content_manager or platform_admin role.",
        responses={
            204: None,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="AI generation not found"),
        },
    ),
)
class AiGeneratedDetail(QuestionBaseView):
    serializer_class = AiGeneratedQuestionReadSerializer
    permission_classes = [CanManageExamConfiguration]

    def get(self, request, pk: UUID):
        ai_gen = get_ai_generated_question_by_id(ai_gen_id=pk)
        return Response(AiGeneratedQuestionReadSerializer(ai_gen).data)

    def patch(self, request, pk: UUID):
        serializer = AiGeneratedQuestionUpdateSerializer(
            data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        ai_gen = update_ai_generated_question(
            ai_gen_id=pk, **serializer.validated_data
        )
        return Response(AiGeneratedQuestionReadSerializer(ai_gen).data)

    def delete(self, request, pk: UUID):
        delete_ai_generated_question(ai_gen_id=pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    post=extend_schema(
        summary="Promote AI generation to question",
        description="Promote a validated AI generation to a draft question. Requires content_manager or platform_admin role.",
        request=AiGeneratedPromoteSerializer,
        responses={
            201: QuestionReadSerializer,
            400: OpenApiResponse(description="Validation error or invalid AI generation state"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="AI generation not found"),
        },
    ),
)
class AiGeneratedPromote(QuestionBaseView):
    permission_classes = [CanManageExamConfiguration]

    def post(self, request, pk: UUID):
        serializer = AiGeneratedPromoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        _, question = promote_ai_generated_question(
            ai_gen_id=pk, **serializer.validated_data
        )
        return Response(
            QuestionReadSerializer(question).data,
            status=status.HTTP_201_CREATED,
        )


# ═══════════════════════════════════════════════════════════════════════
# LEARNER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════


@extend_schema_view(
    get=extend_schema(
        summary="List published questions",
        description="List published questions for practice. Optionally filter by exam_id.",
        parameters=[
            OpenApiParameter(name="exam_id", type={"type": "string", "format": "uuid"}, required=False, location=OpenApiParameter.QUERY, description="Filter by exam UUID"),
        ],
        responses={
            200: QuestionReadSerializer(many=True),
            400: OpenApiResponse(description="Invalid query parameter"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    ),
)
class PublishedQuestionList(QuestionBaseView):
    permission_classes = [IsStudent]

    def get(self, request):
        exam_id = request.query_params.get("exam_id")
        exam_uuid: UUID | None = UUID(exam_id) if exam_id else None
        questions = list_published_questions(exam_id=exam_uuid)
        return Response(QuestionReadSerializer(questions, many=True).data)


@extend_schema_view(
    get=extend_schema(
        summary="Retrieve published question",
        description="Get a single published question by ID.",
        responses={
            200: QuestionReadSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Published question not found"),
        },
    ),
)
class PublishedQuestionDetail(QuestionBaseView):
    permission_classes = [IsStudent]

    def get(self, request, pk: UUID):
        question = get_published_question_by_id(question_id=pk)
        return Response(QuestionReadSerializer(question).data)


@extend_schema_view(
    get=extend_schema(
        summary="List published questions by subtopic",
        description="List published questions for a specific subtopic.",
        responses={
            200: QuestionReadSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Subtopic not found"),
        },
    ),
)
class PublishedQuestionBySubtopic(QuestionBaseView):
    permission_classes = [IsStudent]

    def get(self, request, subtopic_id: UUID):
        questions = list_published_questions_for_subtopic(
            subtopic_id=subtopic_id
        )
        return Response(QuestionReadSerializer(questions, many=True).data)
