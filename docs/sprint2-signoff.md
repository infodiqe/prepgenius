# Sprint 2 — Exam Taxonomy & Syllabus Framework

**Status:** `GO`
**Date:** 31 May 2026
**Previous:** Sprint 1 (Accounts & Auth) — Signed off

---

## Traceability to PRD v4

| Section | Delivered |
|---|---|
| §19 Exam Framework Architecture | Exam config as data — `Exam → Subject → Topic → Subtopic`; rules/blueprint/passing-criteria/analytics-rules as JSONB; `audience_is_minor` flag |
| §10 Exam Engine | Taxonomy CRUD API (21 endpoints) powers the exam engine's topic/subject/mixed/previous-year/full-mock selectors |
| §12 Content Operations Roles & RBAC | `common/permissions.py` with `IsAuthenticatedReadOnly`, `CanManageExamConfiguration`, `CanActivateDeactivateExam`; 7 roles tested |

---

## Components Built

### Models (Sprint 1 + Sprint 2 refinements)
- `Exam` — config-driven; `difficulty_levels`, `exam_rules`, `blueprint`, `passing_criteria`, `analytics_rules` as JSONB; `audience_is_minor`
- `Subject`, `Topic`, `Subtopic` — 3-level hierarchy with `position` ordering
- `SyllabusItem` — self-referential tree with `weightage`, optional `topic_id`/`subtopic_id` linkages
- `PreviousYearPaper` — PYP metadata with `code`, `year`, `language`, `file_path`

### API Endpoints (21 routes under `/api/v1/`)
- **Exams:** list, detail, tree (nested hierarchy), activate, deactivate
- **Subjects:** list (by exam), create, detail, update
- **Topics:** list (by subject), create, detail, update
- **Subtopics:** list (by topic), create, detail, update
- **Syllabus:** list (by exam), create, detail, update
- **Previous Year Papers:** list, create, detail, update

### Management Command
- `python manage.py seed_ctet` — idempotent seed of CTET Paper II (Science) with 5 subjects, 18 topics, 94 subtopics

### OpenAPI Schema
- `drf-spectacular` integrated and configured in `base.py`
- All 20 view classes annotated with `@extend_schema` / `@extend_schema_view`
- Schema validates clean: **30 paths, 34 schemas, 0 warnings, 0 errors**

### RBAC / Permissions
- `common/permissions.py`: 3 reusable permission classes
- `ExamBaseView.permission_classes = [IsAuthenticatedReadOnly]` — read methods allow broader access, write methods require specific roles
- Activation/deactivation gated to `CanActivateDeactivateExam` (platform_admin only)
- CRUD operations gated to `CanManageExamConfiguration` (content_manager, content_reviewer, sme, platform_admin)

---

## Validation Results

### Test Suite
```
accounts/tests/  — 132 passed
exams/tests/     — 281 passed
Total:           413 passed (0 failures, 0 errors)
```

### Test Breakdown (Exams)
| Layer | Tests | File |
|---|---|---|
| Selectors | 52 | `test_selectors.py` |
| Services | 96 | `test_services.py` |
| Serializers | 37 | `test_serializers.py` |
| API (functional) | 69 | `test_api.py` |
| RBAC / Permissions | 27 | `test_permissions.py` |
| **Total** | **281** | |

### Coverage (Exams Module)
| Component | Coverage |
|---|---|
| `api/views.py` | 100% |
| `selectors/exam_selectors.py` | 100% |
| `serializers/exam_serializers.py` | 99% |
| `services/exam_services.py` | 87% |
| `exceptions.py` | 100% |
| `models/` | 91–96% |
| **Overall** | **96%** |

### Architecture Audit (7 checks)
| Rule | Result |
|---|---|
| Models contain no business logic | PASS |
| Selectors are read-only | PASS |
| Services own writes and validation | PASS |
| Serializers contain no ORM queries | PASS |
| Views orchestrate only (no ORM, no `serializer.save()`) | PASS |
| Permissions isolated to permission layer | PASS |
| No cross-app model writes | PASS |

### Docker Validation
| Check | Result |
|---|---|
| `docker compose up` starts clean | PASS |
| Migrations apply (showmigrations ✓) | PASS |
| `seed_ctet` runs (1 exam, 5 subjects, 18 topics, 94 subtopics) | PASS |
| All 281 tests pass inside container | PASS |

### Query Counts
| Endpoint | Queries | Notes |
|---|---|---|
| GET /exams/ | 2 | auth lookup + list |
| GET /exams/:id/ | 2 | auth lookup + detail |
| GET /exams/:id/tree/ | 8 | auth + role + 6 domain (exam + subjects + topics + subtopics) |
| POST /exams/:id/activate/ | 2 | auth + activate |
| Other CRUD | 2–4 | auth + role + CRUD |

---

## GO/NO-GO Decision

| Criterion | Status |
|---|---|
| Tests pass (413/413) | ✅ |
| OpenAPI schema validates (0 errors) | ✅ |
| Architecture layering enforced | ✅ |
| RBAC implemented and tested | ✅ |
| Docker stack healthy | ✅ |
| CTET seed command works | ✅ |
| Coverage ≥ 90% (96%) | ✅ |
| No N+1 queries | ✅ |
| No cross-app violations | ✅ |

**Decision: GO** — Sprint 2 is complete. The Exam Taxonomy & Syllabus Framework is ready. Proceed to **Sprint 3: Question Bank Domain**.
