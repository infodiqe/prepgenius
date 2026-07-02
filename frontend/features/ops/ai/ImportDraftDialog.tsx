import React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import {
  flattenSubtopics,
  getExamTree,
  listExams,
  type AiDraftListItem,
  type DraftImportBody,
  type ExamSummary,
  type ExamTree,
  type SubtopicChoice,
} from "./aiDraftService";

/**
 * ImportDraftDialog — Section D. Imports a draft into the EXISTING Question
 * review pipeline. The operator picks the target exam + subtopic (the draft
 * carries only free-text context; the Question requires FK exam/subtopic). Exam
 * and subtopic options come from the existing /exams/ endpoints (reused).
 *
 * Radix Dialog provides focus trap, Escape, and labelling. The workspace owns
 * the import request; this dialog collects the target and confirms.
 */
export interface ImportDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: AiDraftListItem | null;
  onConfirm: (body: DraftImportBody) => void;
  submitting: boolean;
  error: string | null;
}

export function ImportDraftDialog({
  open,
  onOpenChange,
  draft,
  onConfirm,
  submitting,
  error,
}: ImportDraftDialogProps) {
  const [exams, setExams] = React.useState<ExamSummary[]>([]);
  const [examId, setExamId] = React.useState("");
  const [subtopics, setSubtopics] = React.useState<SubtopicChoice[]>([]);
  const [subtopicId, setSubtopicId] = React.useState("");
  const [loadingTree, setLoadingTree] = React.useState(false);

  // Load exam options when the dialog opens; reset selection each open.
  React.useEffect(() => {
    if (!open) return;
    setExamId("");
    setSubtopicId("");
    setSubtopics([]);
    let active = true;
    void (async () => {
      try {
        const list = await listExams();
        if (active) setExams(list);
      } catch {
        /* options unavailable — confirm stays disabled */
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  // Load subtopics for the selected exam.
  React.useEffect(() => {
    if (!examId) {
      setSubtopics([]);
      setSubtopicId("");
      return;
    }
    let active = true;
    setLoadingTree(true);
    void (async () => {
      try {
        const tree: ExamTree = await getExamTree(examId);
        if (active) setSubtopics(flattenSubtopics(tree));
      } catch {
        if (active) setSubtopics([]);
      } finally {
        if (active) setLoadingTree(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [examId]);

  const canConfirm = Boolean(examId && subtopicId) && !submitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import draft into review</DialogTitle>
          <DialogDescription>
            Create a question (status Draft, origin AI) in the existing review pipeline. Choose the
            target exam and subtopic. The question then follows the same review, SME and publish
            workflow as manually authored questions.
          </DialogDescription>
        </DialogHeader>

        {draft && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <span className="line-clamp-2">{draft.stem}</span>
          </p>
        )}

        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="import-exam" className="text-xs font-medium text-muted-foreground">
              Target exam
            </label>
            <select
              id="import-exam"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select an exam…</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="import-subtopic" className="text-xs font-medium text-muted-foreground">
              Target subtopic
            </label>
            <select
              id="import-subtopic"
              value={subtopicId}
              onChange={(e) => setSubtopicId(e.target.value)}
              disabled={!examId || loadingTree}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <option value="">
                {loadingTree ? "Loading subtopics…" : examId ? "Select a subtopic…" : "Choose an exam first"}
              </option>
              {subtopics.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm({ exam_id: examId, subtopic_id: subtopicId })}
            disabled={!canConfirm}
            aria-busy={submitting || undefined}
          >
            {submitting ? "Importing…" : "Import draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
