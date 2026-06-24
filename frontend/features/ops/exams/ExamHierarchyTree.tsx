"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ExamSubjectNode,
  ExamSubtopicNode,
  ExamTopicNode,
  ExamTree,
} from "./examService";

/**
 * ExamHierarchyTree — OPS-05.
 *
 * Read-only Exam → Subject → Topic → Subtopic browser with expand/collapse and
 * child counts. The active section sets the initial expand depth. Selecting any
 * node opens the read-only detail drawer. No editing, no reordering, no
 * drag-and-drop. English-only; keyboard-accessible disclosure list.
 */
export type ExamTreeSelection =
  | { kind: "subject"; node: ExamSubjectNode }
  | { kind: "topic"; node: ExamTopicNode; subjectName: string }
  | {
      kind: "subtopic";
      node: ExamSubtopicNode;
      topicName: string;
      subjectName: string;
    };

export interface ExamHierarchyTreeProps {
  tree: ExamTree;
  /** 1 = subjects, 2 = topics, 3 = subtopics expanded initially. */
  defaultDepth: 1 | 2 | 3;
  onSelect: (selection: ExamTreeSelection) => void;
}

function initialExpanded(tree: ExamTree, depth: number): Set<string> {
  const expanded = new Set<string>();
  for (const subject of tree.subjects ?? []) {
    if (depth >= 2) expanded.add(subject.id);
    if (depth >= 3) {
      for (const topic of subject.topics ?? []) expanded.add(topic.id);
    }
  }
  return expanded;
}

export function ExamHierarchyTree({
  tree,
  defaultDepth,
  onSelect,
}: ExamHierarchyTreeProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(() =>
    initialExpanded(tree, defaultDepth),
  );

  // Re-seed expansion when the exam or the section depth changes.
  React.useEffect(() => {
    setExpanded(initialExpanded(tree, defaultDepth));
  }, [tree, defaultDepth]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const subjects = tree.subjects ?? [];

  if (subjects.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        No subjects
      </p>
    );
  }

  return (
    <nav
      aria-label="Exam hierarchy"
      className="rounded-lg border border-border bg-card p-2 text-sm"
    >
      <ul className="space-y-0.5">
        {subjects.map((subject) => {
          const topics = subject.topics ?? [];
          const isOpen = expanded.has(subject.id);
          return (
            <li key={subject.id}>
              <div className="flex items-center gap-1">
                <DisclosureToggle
                  hasChildren={topics.length > 0}
                  open={isOpen}
                  name={subject.name}
                  onToggle={() => toggle(subject.id)}
                />
                <NodeButton
                  label={subject.name}
                  count={`${topics.length} ${topics.length === 1 ? "topic" : "topics"}`}
                  ariaLabel={`Subject ${subject.name}`}
                  onClick={() => onSelect({ kind: "subject", node: subject })}
                />
              </div>

              {isOpen && topics.length > 0 && (
                <ul className="ml-5 space-y-0.5 border-l border-border pl-2">
                  {topics.map((topic) => {
                    const subs = topic.subtopics ?? [];
                    const topicOpen = expanded.has(topic.id);
                    return (
                      <li key={topic.id}>
                        <div className="flex items-center gap-1">
                          <DisclosureToggle
                            hasChildren={subs.length > 0}
                            open={topicOpen}
                            name={topic.name}
                            onToggle={() => toggle(topic.id)}
                          />
                          <NodeButton
                            label={topic.name}
                            count={`${subs.length} ${subs.length === 1 ? "subtopic" : "subtopics"}`}
                            ariaLabel={`Topic ${topic.name}`}
                            onClick={() =>
                              onSelect({
                                kind: "topic",
                                node: topic,
                                subjectName: subject.name,
                              })
                            }
                          />
                        </div>

                        {topicOpen && subs.length > 0 && (
                          <ul className="ml-5 space-y-0.5 border-l border-border pl-2">
                            {subs.map((sub) => (
                              <li key={sub.id} className="flex items-center gap-1">
                                <span className="w-5 shrink-0" aria-hidden="true" />
                                <NodeButton
                                  label={sub.name}
                                  ariaLabel={`Subtopic ${sub.name}`}
                                  onClick={() =>
                                    onSelect({
                                      kind: "subtopic",
                                      node: sub,
                                      topicName: topic.name,
                                      subjectName: subject.name,
                                    })
                                  }
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DisclosureToggle({
  hasChildren,
  open,
  name,
  onToggle,
}: {
  hasChildren: boolean;
  open: boolean;
  name: string;
  onToggle: () => void;
}) {
  if (!hasChildren) {
    return <span className="w-5 shrink-0" aria-hidden="true" />;
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${open ? "Collapse" : "Expand"} ${name}`}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronRight
        className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")}
        aria-hidden="true"
      />
    </button>
  );
}

function NodeButton({
  label,
  count,
  ariaLabel,
  onClick,
}: {
  label: string;
  count?: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex flex-1 items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="truncate">{label}</span>
      {count && (
        <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );
}
