"""
AI question-generation & draft API (Sprint-6A-02, 6A-04).

Thin endpoints. All business logic lives in the services
(:class:`QuestionGenerationService`, :class:`QuestionDraftService`); views only
authenticate/authorize, deserialize input into a DTO, invoke the service, and
serialize the structured result.

Generation domain exceptions are mapped to structured HTTP errors by the shared
:class:`_AiGenerationBaseView.handle_exception`:

* request errors (invalid / unsupported type / unsupported language) → 400
* provider unavailable → 503, timeout → 504
* empty / invalid AI response → 502
"""
from __future__ import annotations

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound, ValidationError
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.api.serializers import (
    AIDraftRegenerationSerializer,
    AIGenerationJobSerializer,
    AIQuestionDraftDetailSerializer,
    AIQuestionDraftListSerializer,
    BatchDraftGenerationRequestSerializer,
    DraftImportRequestSerializer,
    DraftImportResponseSerializer,
    DraftRegenerateRequestSerializer,
    DraftRollbackRequestSerializer,
    QuestionGenerationRequestSerializer,
    QuestionGenerationResponseSerializer,
    RegenerationOutcomeSerializer,
    ReviewActionSerializer,
    ReviewImproveRequestSerializer,
    ReviewImprovementOutcomeSerializer,
    ReviewRecommendationsSerializer,
    TaxonomyAcceptRequestSerializer,
    TaxonomyAcceptResponseSerializer,
    TaxonomyResolutionSerializer,
    VersionCompareSerializer,
)
from ai.exceptions import InsufficientCreditsError
from ai.generation.exceptions import (
    DraftNotDiscardableError,
    DraftNotFoundError,
    DraftNotImportableError,
    DraftNotRegenerableError,
    DraftRegenerationInvalidError,
    EmptyGenerationResponseError,
    GenerationTimeoutError,
    InvalidGenerationRequestError,
    InvalidGenerationResponseError,
    ProviderUnavailableError,
    RegenerationVersionNotFoundError,
    UnsupportedLanguageError,
    UnsupportedQuestionTypeError,
)
from ai.generation.import_service import AIQuestionImportService, discard_draft
from ai.generation.job_service import create_generation_job
from ai.generation.regeneration_service import DraftRegenerationService
from ai.generation.service import QuestionGenerationService
from ai.review import AIReviewAssistantService, action_catalog
from ai.taxonomy import AITaxonomyResolutionService
from ai.selectors import (
    compare_draft_versions,
    get_ai_draft,
    get_ai_job,
    list_ai_drafts,
    list_ai_jobs,
    list_draft_regenerations,
)
from ai.tasks import run_ai_generation_job
from common.permissions import CanGenerateAiQuestions
from exams.exceptions import ExamDomainError
from questions.exceptions import QuestionDomainError


class _ProviderUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "AI provider is currently unavailable. Please try again."
    default_code = "provider_unavailable"


class _GenerationTimeout(APIException):
    status_code = status.HTTP_504_GATEWAY_TIMEOUT
    default_detail = "AI generation timed out. Please try again."
    default_code = "generation_timeout"


class _InvalidAiResponse(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "AI returned an invalid or empty response."
    default_code = "invalid_ai_response"


class _DraftStateConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Draft is not in an importable state."
    default_code = "draft_not_importable"


class _InsufficientCredits(APIException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "Not enough AI credits for this operation."
    default_code = "insufficient_credits"


class _RegenerationInvalid(APIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "The regenerated question failed validation; draft unchanged."
    default_code = "regeneration_invalid"


class _AiGenerationBaseView(APIView):
    """Shared operator-only auth + generation-error → HTTP mapping."""

    permission_classes = [IsAuthenticated, CanGenerateAiQuestions]

    def handle_exception(self, exc):
        if isinstance(
            exc,
            (
                InvalidGenerationRequestError,
                UnsupportedQuestionTypeError,
                UnsupportedLanguageError,
            ),
        ):
            exc = ValidationError(str(exc))
        elif isinstance(exc, InsufficientCreditsError):
            exc = _InsufficientCredits(str(exc))
        elif isinstance(exc, GenerationTimeoutError):
            exc = _GenerationTimeout(str(exc))
        elif isinstance(exc, ProviderUnavailableError):
            exc = _ProviderUnavailable(str(exc))
        elif isinstance(
            exc, (EmptyGenerationResponseError, InvalidGenerationResponseError)
        ):
            exc = _InvalidAiResponse(str(exc))
        return super().handle_exception(exc)


class GenerateQuestionsView(_AiGenerationBaseView):
    """POST /api/v1/ai/questions/generate/ — operator-only, no persistence."""

    @extend_schema(
        summary="Generate AI questions (no persistence)",
        description=(
            "Generate structured exam questions via the AI gateway. Operator "
            "roles only (content_manager / platform_admin). Returns JSON only; "
            "no persistence, no credits, no publishing."
        ),
        request=QuestionGenerationRequestSerializer,
        responses={
            200: QuestionGenerationResponseSerializer,
            400: OpenApiResponse(description="Invalid / unsupported request"),
            401: OpenApiResponse(description="Not authenticated"),
            402: OpenApiResponse(description="Insufficient AI credits"),
            403: OpenApiResponse(description="Permission denied"),
            502: OpenApiResponse(description="Invalid or empty AI response"),
            503: OpenApiResponse(description="AI provider unavailable"),
            504: OpenApiResponse(description="AI generation timed out"),
        },
    )
    def post(self, request):
        request_serializer = QuestionGenerationRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        dto = request_serializer.to_dto()

        result = QuestionGenerationService().generate(dto, created_by=request.user)

        response_serializer = QuestionGenerationResponseSerializer(result)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class GenerateDraftView(_AiGenerationBaseView):
    """
    POST /api/v1/ai/questions/generate-draft/ — operator-only, ASYNC.

    Returns immediately with an AIGenerationJob. A Celery task then runs the
    existing QuestionDraftService (generate → validate → persist valid drafts),
    updating job progress. Large batches (up to AI_MAX_BATCH_QUESTIONS) never hold
    the HTTP request open. Poll GET /ai/jobs/{id}/ for progress.
    """

    @extend_schema(
        summary="Queue an async AI draft-generation job",
        description=(
            "Create an AIGenerationJob and queue a Celery task that generates → "
            "validates → persists valid questions as Drafts. Returns the job "
            "immediately (202). Operator roles only (content_manager / "
            "platform_admin). No publishing, no credits, no review workflow."
        ),
        request=BatchDraftGenerationRequestSerializer,
        responses={
            202: AIGenerationJobSerializer,
            400: OpenApiResponse(description="Invalid / unsupported request"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    )
    def post(self, request):
        request_serializer = BatchDraftGenerationRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        dto = request_serializer.to_dto()

        job = create_generation_job(request=dto, created_by=request.user)
        run_ai_generation_job.delay(str(job.id))

        return Response(
            AIGenerationJobSerializer(job).data, status=status.HTTP_202_ACCEPTED
        )


class JobDetailView(_AiGenerationBaseView):
    """GET /api/v1/ai/jobs/{id}/ — progress of one of the caller's own jobs."""

    @extend_schema(
        summary="Get AI generation job progress",
        responses={
            200: AIGenerationJobSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Job not found"),
        },
    )
    def get(self, request, job_id):
        job = get_ai_job(job_id=job_id, user=request.user)
        if job is None:
            raise NotFound("Job not found.")
        return Response(AIGenerationJobSerializer(job).data)


class JobListView(_AiGenerationBaseView):
    """GET /api/v1/ai/jobs/ — the caller's own jobs, newest first."""

    @extend_schema(
        summary="List the caller's AI generation jobs",
        responses={
            200: AIGenerationJobSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
        },
    )
    def get(self, request):
        jobs = list_ai_jobs(user=request.user)
        return Response(AIGenerationJobSerializer(jobs, many=True).data)


class _DraftActionView(_AiGenerationBaseView):
    """Shared draft-lifecycle error mapping (import / discard)."""

    def handle_exception(self, exc):
        if isinstance(exc, DraftNotFoundError):
            exc = NotFound(str(exc))
        elif isinstance(exc, (DraftNotImportableError, DraftNotDiscardableError)):
            exc = _DraftStateConflict(str(exc))
        elif isinstance(exc, (QuestionDomainError, ExamDomainError, ValueError)):
            # Bad target exam/subtopic references, or a subtopic that does not
            # belong to the exam → client error.
            exc = ValidationError(str(exc))
        return super().handle_exception(exc)


class DraftListView(_AiGenerationBaseView):
    """
    GET /api/v1/ai/questions/drafts/ — operator-only paginated draft list.

    Server-side filtering (status/exam/subject/difficulty/language/provider),
    free-text search, whitelisted ordering, and offset pagination. All drafts are
    team content (not owner-scoped); RBAC gates access.
    """

    @extend_schema(
        summary="List AI question drafts",
        responses={200: AIQuestionDraftListSerializer(many=True)},
    )
    def get(self, request):
        qs = list_ai_drafts(
            status=request.query_params.get("status"),
            exam=request.query_params.get("exam"),
            subject=request.query_params.get("subject"),
            difficulty=request.query_params.get("difficulty"),
            language=request.query_params.get("language"),
            provider=request.query_params.get("provider"),
            search=request.query_params.get("search"),
            ordering=request.query_params.get("ordering"),
            # Quality prioritisation filters (6B-03, Task 11).
            quality_grade=request.query_params.get("quality_grade"),
            duplicate_status=request.query_params.get("duplicate_status"),
            alignment_status=request.query_params.get("alignment_status"),
            difficulty_match=request.query_params.get("difficulty_match"),
            bloom_match=request.query_params.get("bloom_match"),
        )
        paginator = LimitOffsetPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        data = AIQuestionDraftListSerializer(page, many=True).data
        return paginator.get_paginated_response(data)


class DraftDetailView(_AiGenerationBaseView):
    """GET /api/v1/ai/questions/drafts/{id}/ — full draft preview."""

    @extend_schema(
        summary="Retrieve an AI question draft",
        responses={
            200: AIQuestionDraftDetailSerializer,
            404: OpenApiResponse(description="Draft not found"),
        },
    )
    def get(self, request, draft_id):
        draft = get_ai_draft(draft_id=draft_id)
        if draft is None:
            raise NotFound("Draft not found.")
        return Response(AIQuestionDraftDetailSerializer(draft).data)


class DiscardDraftView(_DraftActionView):
    """POST /api/v1/ai/questions/drafts/{id}/discard/ — abandon a draft."""

    @extend_schema(
        summary="Discard an AI question draft",
        request=None,
        responses={
            200: AIQuestionDraftDetailSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Draft not found"),
            409: OpenApiResponse(description="Draft not in a discardable state"),
        },
    )
    def post(self, request, draft_id):
        draft = discard_draft(draft_id=draft_id)
        return Response(AIQuestionDraftDetailSerializer(draft).data)


class ImportDraftView(_DraftActionView):
    """
    POST /api/v1/ai/questions/drafts/{id}/import/ — operator-only.

    Bridges an importable AIQuestionDraft into a Question (review_status=draft,
    origin=ai) via the existing Question creation services, then marks the draft
    imported (immutable audit record). The Question enters the single existing
    review pipeline — no AI-specific review/approval/publish logic.
    """

    @extend_schema(
        summary="Import an AI draft into the Question review pipeline",
        description=(
            "Create a Question (status=draft, origin=ai) from an importable draft "
            "using the existing Question services, and mark the draft imported. "
            "Operator roles only (content_manager / platform_admin). The Question "
            "enters the same review/SME/approval/publish workflow as manual ones."
        ),
        request=DraftImportRequestSerializer,
        responses={
            201: DraftImportResponseSerializer,
            400: OpenApiResponse(description="Invalid exam/subtopic reference"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Draft not found"),
            409: OpenApiResponse(description="Draft already imported or discarded"),
        },
    )
    def post(self, request, draft_id):
        request_serializer = DraftImportRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        result = AIQuestionImportService().import_draft(
            draft_id=draft_id,
            created_by=request.user,
            **request_serializer.validated_data,
        )

        return Response(
            DraftImportResponseSerializer(result.to_dict()).data,
            status=status.HTTP_201_CREATED,
        )


# ── Draft regeneration / versioning (Sprint-6B-02) ───────────────────────────


class _RegenerationActionView(_AiGenerationBaseView):
    """
    Shared error mapping for the regenerate/rollback lifecycle. Generation/provider
    and credit errors already map via ``_AiGenerationBaseView.handle_exception``
    (called by ``super()``); these add the draft-state and version-specific ones.
    """

    def handle_exception(self, exc):
        if isinstance(exc, DraftNotFoundError):
            exc = NotFound(str(exc))
        elif isinstance(exc, RegenerationVersionNotFoundError):
            exc = NotFound(str(exc))
        elif isinstance(exc, DraftNotRegenerableError):
            exc = _DraftStateConflict(str(exc))
        elif isinstance(exc, DraftRegenerationInvalidError):
            api_exc = _RegenerationInvalid(str(exc))
            api_exc.detail = {"detail": str(exc), "validation": exc.report}
            exc = api_exc
        return super().handle_exception(exc)


class RegenerateDraftView(_RegenerationActionView):
    """
    POST /api/v1/ai/questions/drafts/{id}/regenerate/ — operator-only.

    Generate ONE improved version of an existing draft (Generate → Draft →
    Preview → Improve → Review → Publish). Replaces only the AI-generated fields,
    preserving the draft id, audit, timestamps, status, and provider history.
    Optional operator ``feedback`` augments the prompt (never the system prompt);
    an optional ``provider`` overrides provider selection for this call only.
    Credits are reserved/committed/released by the gateway (Sprint-6B-01).
    """

    @extend_schema(
        summary="Regenerate (improve) a single AI draft",
        request=DraftRegenerateRequestSerializer,
        responses={
            200: RegenerationOutcomeSerializer,
            400: OpenApiResponse(description="Invalid request"),
            401: OpenApiResponse(description="Not authenticated"),
            402: OpenApiResponse(description="Insufficient AI credits"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Draft not found"),
            409: OpenApiResponse(description="Draft not in a regenerable state"),
            422: OpenApiResponse(description="Regenerated question failed validation"),
            502: OpenApiResponse(description="Invalid or empty AI response"),
            503: OpenApiResponse(description="AI provider unavailable"),
            504: OpenApiResponse(description="AI generation timed out"),
        },
    )
    def post(self, request, draft_id):
        request_serializer = DraftRegenerateRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        data = request_serializer.validated_data

        outcome = DraftRegenerationService().regenerate(
            draft_id=draft_id,
            feedback=data.get("feedback"),
            provider=data.get("provider"),
            created_by=request.user,
        )
        return Response(
            RegenerationOutcomeSerializer(
                {"draft": outcome.draft, "regeneration": outcome.regeneration}
            ).data
        )


class RollbackDraftView(_RegenerationActionView):
    """
    POST /api/v1/ai/questions/drafts/{id}/rollback/ — operator-only.

    Restore the draft's live content to an earlier version. No AI call, no
    credits — history is never overwritten.
    """

    @extend_schema(
        summary="Roll a draft back to an earlier version",
        request=DraftRollbackRequestSerializer,
        responses={
            200: AIQuestionDraftDetailSerializer,
            400: OpenApiResponse(description="Invalid request"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Draft or version not found"),
            409: OpenApiResponse(description="Draft not in a regenerable state"),
        },
    )
    def post(self, request, draft_id):
        request_serializer = DraftRollbackRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        draft = DraftRegenerationService().rollback(
            draft_id=draft_id,
            version=request_serializer.validated_data["version"],
            created_by=request.user,
        )
        return Response(AIQuestionDraftDetailSerializer(draft).data)


class DraftRegenerationListView(_RegenerationActionView):
    """
    GET /api/v1/ai/questions/drafts/{id}/regenerations/ — version history.

    The append-only audit of every version (who / when / provider / model / tokens
    / cost / feedback / version), oldest first (Tasks 2, 3, 7).
    """

    @extend_schema(
        summary="List a draft's regeneration history",
        responses={
            200: AIDraftRegenerationSerializer(many=True),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Draft not found"),
        },
    )
    def get(self, request, draft_id):
        if get_ai_draft(draft_id=draft_id) is None:
            raise NotFound("Draft not found.")
        history = list_draft_regenerations(draft_id=draft_id)
        return Response(AIDraftRegenerationSerializer(history, many=True).data)


class DraftVersionCompareView(_RegenerationActionView):
    """
    GET /api/v1/ai/questions/drafts/{id}/compare/ — backend-only version diff.

    Compares the current version against a previous one (defaults: current vs. the
    immediately preceding version), highlighting changed content fields (Task 4).
    Optional ``current`` / ``previous`` query params select explicit versions.
    """

    @extend_schema(
        summary="Compare two versions of a draft",
        responses={
            200: VersionCompareSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Draft or version history not found"),
        },
    )
    def get(self, request, draft_id):
        draft = get_ai_draft(draft_id=draft_id)
        if draft is None:
            raise NotFound("Draft not found.")
        comparison = compare_draft_versions(
            draft=draft,
            current_version=_int_param(request, "current"),
            previous_version=_int_param(request, "previous"),
        )
        if comparison is None:
            raise NotFound("No version history to compare for this draft.")
        return Response(VersionCompareSerializer(comparison).data)


def _int_param(request, name: str) -> int | None:
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        raise ValidationError({name: "Must be an integer."})


# ── AI Content Review Assistant (Sprint-6B-04) ───────────────────────────────


class ReviewActionsView(_AiGenerationBaseView):
    """GET /api/v1/ai/questions/drafts/review/actions/ — the action-selector catalog."""

    @extend_schema(
        summary="List available AI review actions",
        responses={200: ReviewActionSerializer(many=True)},
    )
    def get(self, request):
        return Response(ReviewActionSerializer(action_catalog(), many=True).data)


class ReviewRecommendationsView(_RegenerationActionView):
    """
    GET /api/v1/ai/questions/drafts/{id}/review/recommendations/ — operator-only.

    Structured, rule-based recommendations (no AI, no rewrite) derived from the
    reused quality analysis: which review actions would most help this draft (Task 5).
    """

    @extend_schema(
        summary="Get AI review recommendations for a draft",
        responses={
            200: ReviewRecommendationsSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Draft not found"),
        },
    )
    def get(self, request, draft_id):
        recommendations = AIReviewAssistantService().recommend(draft_id=draft_id)
        return Response(ReviewRecommendationsSerializer(recommendations.to_dict()).data)


class ReviewImproveView(_RegenerationActionView):
    """
    POST /api/v1/ai/questions/drafts/{id}/review/improve/ — operator-only.

    Apply ONE AI-assisted review action to a draft. The AI proposes an improved
    question; it is validated, re-analysed for quality, and committed as a NEW
    immutable draft version (never editing in place, never bypassing review). Credits
    are reserved/committed/released by the gateway (Task 7). Returns the improved
    draft, the new version (audit), and the before/after quality comparison (Task 4).
    """

    @extend_schema(
        summary="Apply an AI-assisted review improvement to a draft",
        request=ReviewImproveRequestSerializer,
        responses={
            200: ReviewImprovementOutcomeSerializer,
            400: OpenApiResponse(description="Invalid request / unknown action"),
            401: OpenApiResponse(description="Not authenticated"),
            402: OpenApiResponse(description="Insufficient AI credits"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Draft not found"),
            409: OpenApiResponse(description="Draft not in an improvable state"),
            422: OpenApiResponse(description="AI improvement failed validation"),
            502: OpenApiResponse(description="Invalid or empty AI response"),
            503: OpenApiResponse(description="AI provider unavailable"),
            504: OpenApiResponse(description="AI improvement timed out"),
        },
    )
    def post(self, request, draft_id):
        request_serializer = ReviewImproveRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        data = request_serializer.validated_data

        outcome = AIReviewAssistantService().improve(
            draft_id=draft_id,
            action=data["action"],
            instructions=data.get("instructions"),
            provider=data.get("provider"),
            created_by=request.user,
        )
        return Response(
            ReviewImprovementOutcomeSerializer(
                {
                    "draft": outcome.draft,
                    "regeneration": outcome.regeneration,
                    "comparison": outcome.comparison.to_dict(),
                }
            ).data
        )


# ── AI Taxonomy Resolution & Intelligent Import (Sprint-6C-01) ───────────────


class TaxonomySuggestionsView(_AiGenerationBaseView):
    """
    GET /api/v1/ai/questions/drafts/{id}/taxonomy-suggestions/ — operator-only.

    Deterministic (no AI) exam/subject/topic/subtopic suggestions plus the
    pre-import duplicate check, so the reviewer starts from a resolved taxonomy.
    Nothing is imported; the reviewer decides (Tasks 1–4).
    """

    @extend_schema(
        summary="Get taxonomy suggestions + duplicate check for a draft",
        responses={
            200: TaxonomyResolutionSerializer,
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Draft not found"),
        },
    )
    def get(self, request, draft_id):
        draft = get_ai_draft(draft_id=draft_id)
        if draft is None:
            raise NotFound("Draft not found.")
        resolution = AITaxonomyResolutionService().resolve(draft=draft)
        return Response(TaxonomyResolutionSerializer(resolution.to_dict()).data)


class TaxonomyAcceptView(_DraftActionView):
    """
    POST /api/v1/ai/questions/drafts/{id}/taxonomy-accept/ — operator-only.

    The reviewer accepts (or overrides) the suggested taxonomy and imports the draft
    via the EXISTING import service. Records an append-only taxonomy audit (Tasks
    5/6). No new review workflow: the created Question enters the same pipeline.
    """

    @extend_schema(
        summary="Accept a taxonomy suggestion and import the draft",
        request=TaxonomyAcceptRequestSerializer,
        responses={
            201: TaxonomyAcceptResponseSerializer,
            400: OpenApiResponse(description="Invalid exam/subtopic reference"),
            401: OpenApiResponse(description="Not authenticated"),
            403: OpenApiResponse(description="Permission denied"),
            404: OpenApiResponse(description="Draft not found"),
            409: OpenApiResponse(description="Draft already imported or discarded"),
        },
    )
    def post(self, request, draft_id):
        request_serializer = TaxonomyAcceptRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        outcome = AITaxonomyResolutionService().accept_and_import(
            draft_id=draft_id,
            created_by=request.user,
            **request_serializer.validated_data,
        )
        return Response(
            TaxonomyAcceptResponseSerializer(
                {"imported": outcome.import_result.to_dict(), "audit": outcome.audit}
            ).data,
            status=status.HTTP_201_CREATED,
        )
