"use client";

import React from "react";
import {
  listExams,
  listQuestions,
  getExamTree,
  buildExamNameIndex,
  buildSubtopicIndex,
  type ContentExam,
  type ContentExamTree,
  type ContentQuestion,
  type ContentReviewStatus,
  type SubtopicLabel,
} from "./contentService";
import { QuestionSearch } from "./QuestionSearch";
import { QuestionFilters } from "./QuestionFilters";
import { QuestionTable, type TablePhase } from "./QuestionTable";
import { QuestionDetailDrawer } from "./QuestionDetailDrawer";
import { TaxonomySidebar } from "./TaxonomySidebar";

/**
 * ContentStudioPage — OPS-02.
 *
 * Orchestrates the Content Studio reads. Exam + Status are the only server
 * filters (re-fetch on change); search, subject/topic filtering, and pagination
 * are disabled in their components per the OPS-02 strict-API-only decision.
 * All state shown is computed server-side; this layer only fetches and shapes
 * IDs into display labels. English-only.
 */
export function ContentStudioPage() {
  const [exams, setExams] = React.useState<ContentExam[]>([]);
  const [examNameIndex, setExamNameIndex] = React.useState<
    Record<string, string>
  >({});
  const [treesByExam, setTreesByExam] = React.useState<
    Record<string, ContentExamTree>
  >({});
  const [subtopicIndex, setSubtopicIndex] = React.useState<
    Record<string, SubtopicLabel>
  >({});

  const [examId, setExamId] = React.useState("");
  const [status, setStatus] = React.useState<"" | ContentReviewStatus>("");

  const [questions, setQuestions] = React.useState<ContentQuestion[]>([]);
  const [phase, setPhase] = React.useState<TablePhase>("loading");

  const [drawerQuestion, setDrawerQuestion] =
    React.useState<ContentQuestion | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Load the exam list once (powers the filter dropdown + taxonomy + name map).
  React.useEffect(() => {
    let active = true;
    listExams()
      .then((list) => {
        if (!active) return;
        setExams(list);
        setExamNameIndex(buildExamNameIndex(list));
      })
      .catch(() => {
        /* non-fatal: table load surfaces the error state */
      });
    return () => {
      active = false;
    };
  }, []);

  const load = React.useCallback(async () => {
    setPhase("loading");
    try {
      const list = await listQuestions({
        examId: examId || undefined,
        reviewStatus: status || undefined,
      });
      // Resolve subject/topic names: one tree per distinct exam in the result.
      const examIds = Array.from(
        new Set(
          [examId, ...list.map((q) => q.exam_id)].filter(
            (id): id is string => Boolean(id),
          ),
        ),
      );
      const fetchedTrees = await Promise.all(
        examIds.map((id) => getExamTree(id).catch(() => null)),
      );
      const trees: Record<string, ContentExamTree> = {};
      for (const tree of fetchedTrees) {
        if (tree) trees[tree.id] = tree;
      }
      setTreesByExam(trees);
      setSubtopicIndex(buildSubtopicIndex(Object.values(trees)));
      setQuestions(list);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [examId, status]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openDrawer = React.useCallback((question: ContentQuestion) => {
    setDrawerQuestion(question);
    setDrawerOpen(true);
  }, []);

  const drawerLabel = drawerQuestion
    ? subtopicIndex[drawerQuestion.subtopic_id ?? ""]
    : undefined;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside>
        <TaxonomySidebar
          exams={exams}
          selectedExamId={examId}
          tree={examId ? (treesByExam[examId] ?? null) : null}
          treeLoading={phase === "loading" && Boolean(examId) && !treesByExam[examId]}
          onSelectExam={setExamId}
        />
      </aside>

      <div className="space-y-4">
        <QuestionSearch />

        <QuestionFilters
          exams={exams}
          examId={examId}
          status={status}
          onExamChange={setExamId}
          onStatusChange={setStatus}
        />

        <QuestionTable
          phase={phase}
          questions={questions}
          examNameIndex={examNameIndex}
          subtopicIndex={subtopicIndex}
          onOpen={openDrawer}
          onRetry={() => void load()}
        />
      </div>

      <QuestionDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        question={drawerQuestion}
        examName={
          drawerQuestion ? examNameIndex[drawerQuestion.exam_id ?? ""] : undefined
        }
        subject={drawerLabel?.subject}
        topic={drawerLabel?.topic}
      />
    </div>
  );
}
