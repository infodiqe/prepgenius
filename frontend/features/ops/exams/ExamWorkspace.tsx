"use client";

import React from "react";
import { Button, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  EXAM_SECTIONS,
  examCounts,
  getExamTree,
  listExams,
  listPapers,
  type ExamSectionKey,
  type ExamSummary,
  type ExamTree,
  type PreviousYearPaper,
} from "./examService";
import { ExamFilters } from "./ExamFilters";
import { ExamTable, type ExamTablePhase } from "./ExamTable";
import {
  ExamHierarchyTree,
  type ExamTreeSelection,
} from "./ExamHierarchyTree";
import {
  ExamDetailDrawer,
  type ExamDrawerData,
  type ExamDrawerRow,
} from "./ExamDetailDrawer";
import { PreviousYearPaperPanel } from "./PreviousYearPaperPanel";

/**
 * ExamWorkspace — OPS-05 orchestrator.
 *
 * Section tabs (Exams, Subjects, Topics, Subtopics, Previous Year Papers) over
 * the read-only exam endpoints. The Exam selector scopes the hierarchy/papers
 * views (the API requires an exam for the tree); type/status filters are
 * "awaiting backend support". No create/edit/delete, no client-side business
 * logic. English-only.
 */
function activeBadgeText(exam: ExamSummary): string {
  return exam.is_active ? "Active" : "Inactive";
}

function baseExamRows(exam: ExamSummary): ExamDrawerRow[] {
  return [
    { label: "Code", value: exam.code },
    { label: "Type", value: exam.exam_type },
    { label: "Audience", value: exam.audience_is_minor ? "Minor" : "General" },
    { label: "Status", value: activeBadgeText(exam) },
    {
      label: "Created",
      value: exam.created_at
        ? new Date(exam.created_at).toLocaleDateString("en-GB")
        : "—",
    },
    {
      label: "Updated",
      value: exam.updated_at
        ? new Date(exam.updated_at).toLocaleDateString("en-GB")
        : "—",
    },
  ];
}

export function ExamWorkspace() {
  const [exams, setExams] = React.useState<ExamSummary[]>([]);
  const [examsPhase, setExamsPhase] = React.useState<ExamTablePhase>("loading");
  const examNameIndex = React.useMemo(() => {
    const index: Record<string, string> = {};
    for (const exam of exams) index[exam.id] = exam.name;
    return index;
  }, [exams]);

  const [section, setSection] = React.useState<ExamSectionKey>("exams");
  const [selectedExamId, setSelectedExamId] = React.useState("");

  const [tree, setTree] = React.useState<ExamTree | null>(null);
  const [treePhase, setTreePhase] = React.useState<ExamTablePhase>("ready");

  const [papers, setPapers] = React.useState<PreviousYearPaper[]>([]);
  const [papersPhase, setPapersPhase] = React.useState<ExamTablePhase>("loading");

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerData, setDrawerData] = React.useState<ExamDrawerData | null>(null);
  const [drawerLoading, setDrawerLoading] = React.useState(false);

  const activeSection = EXAM_SECTIONS.find((s) => s.key === section)!;
  const sectionKind = activeSection.kind;

  // ── Loads ──────────────────────────────────────────────────────────────
  const loadExams = React.useCallback(async () => {
    setExamsPhase("loading");
    try {
      setExams(await listExams());
      setExamsPhase("ready");
    } catch {
      setExamsPhase("error");
    }
  }, []);

  React.useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const loadTree = React.useCallback(async () => {
    if (!selectedExamId) {
      setTree(null);
      setTreePhase("ready");
      return;
    }
    setTreePhase("loading");
    try {
      setTree(await getExamTree(selectedExamId));
      setTreePhase("ready");
    } catch {
      setTreePhase("error");
    }
  }, [selectedExamId]);

  React.useEffect(() => {
    if (sectionKind === "hierarchy") void loadTree();
  }, [sectionKind, loadTree]);

  const loadPapers = React.useCallback(async () => {
    setPapersPhase("loading");
    try {
      setPapers(await listPapers(selectedExamId || undefined));
      setPapersPhase("ready");
    } catch {
      setPapersPhase("error");
    }
  }, [selectedExamId]);

  React.useEffect(() => {
    if (sectionKind === "papers") void loadPapers();
  }, [sectionKind, loadPapers]);

  // ── Drawer ───────────────────────────────────────────────────────────────
  const openExam = React.useCallback(async (exam: ExamSummary) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerData({ kind: "Exam", title: exam.name, rows: baseExamRows(exam) });
    try {
      const t = await getExamTree(exam.id);
      const c = examCounts(t);
      setDrawerData({
        kind: "Exam",
        title: exam.name,
        rows: [
          ...baseExamRows(exam),
          { label: "Subjects", value: String(c.subjects) },
          { label: "Topics", value: String(c.topics) },
          { label: "Subtopics", value: String(c.subtopics) },
        ],
      });
    } catch {
      /* keep base rows — counts unavailable */
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const openNode = React.useCallback((selection: ExamTreeSelection) => {
    setDrawerLoading(false);
    if (selection.kind === "subject") {
      setDrawerData({
        kind: "Subject",
        title: selection.node.name,
        rows: [{ label: "Position", value: String(selection.node.position) }],
        relationships: {
          label: "Topics",
          items: (selection.node.topics ?? []).map((t) => t.name),
        },
      });
    } else if (selection.kind === "topic") {
      setDrawerData({
        kind: "Topic",
        title: selection.node.name,
        rows: [
          { label: "Subject", value: selection.subjectName },
          { label: "Position", value: String(selection.node.position) },
        ],
        relationships: {
          label: "Subtopics",
          items: (selection.node.subtopics ?? []).map((s) => s.name),
        },
      });
    } else {
      setDrawerData({
        kind: "Subtopic",
        title: selection.node.name,
        rows: [
          { label: "Subject", value: selection.subjectName },
          { label: "Topic", value: selection.topicName },
          { label: "Position", value: String(selection.node.position) },
        ],
      });
    }
    setDrawerOpen(true);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label="Exam sections"
        className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1"
      >
        {EXAM_SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            aria-pressed={s.key === section}
            onClick={() => setSection(s.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              s.key === section
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {s.title}
          </button>
        ))}
      </div>

      <ExamFilters
        exams={exams}
        selectedExamId={selectedExamId}
        onSelectExam={setSelectedExamId}
        showExamSelector={sectionKind === "hierarchy" || sectionKind === "papers"}
        showListFilters={sectionKind === "exams"}
        examRequired={sectionKind === "hierarchy"}
      />

      {sectionKind === "exams" && (
        <ExamTable
          phase={examsPhase}
          exams={exams}
          onOpen={openExam}
          onRetry={() => void loadExams()}
        />
      )}

      {sectionKind === "hierarchy" &&
        (!selectedExamId ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Select an exam to browse its {activeSection.title.toLowerCase()}.
            </p>
          </div>
        ) : treePhase === "loading" ? (
          <div role="status" aria-label="Loading hierarchy" className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : treePhase === "error" || !tree ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-8 text-center"
          >
            <p className="text-sm font-medium text-foreground">
              Could not load hierarchy
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadTree()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <ExamHierarchyTree
            tree={tree}
            defaultDepth={activeSection.depth ?? 1}
            onSelect={openNode}
          />
        ))}

      {sectionKind === "papers" && (
        <PreviousYearPaperPanel
          phase={papersPhase}
          papers={papers}
          examNameIndex={examNameIndex}
          onRetry={() => void loadPapers()}
        />
      )}

      <ExamDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        data={drawerData}
        loading={drawerLoading}
      />
    </div>
  );
}
