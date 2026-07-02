import React from "react";
import { Search } from "lucide-react";
import { Button, Input } from "@/components/ui";

/**
 * DraftFilters — Section B controls. All filtering/search is server-side; this
 * only collects operator intent and hands it up. Native <select>s for keyboard
 * + screen-reader friendliness; each control is labelled.
 */
export interface DraftFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit: () => void;
  status: string;
  difficulty: string;
  language: string;
  provider: string;
  onStatusChange: (v: string) => void;
  onDifficultyChange: (v: string) => void;
  onLanguageChange: (v: string) => void;
  onProviderChange: (v: string) => void;
  examOptions: readonly string[];
  exam: string;
  onExamChange: (v: string) => void;
}

const STATUS_OPTIONS = ["generated", "imported", "discarded"];
const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];
const LANGUAGE_OPTIONS = ["as", "en", "hi"];
const PROVIDER_OPTIONS = ["groq", "openai", "anthropic", "gemini", "deepseek", "mock"];

function Field({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DraftFilters(props: DraftFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
      <form
        role="search"
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          props.onSearchSubmit();
        }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="draft-search" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <Input
            id="draft-search"
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder="Search stem, exam, subject, topic"
            className="h-9 w-64"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" aria-label="Search drafts">
          <Search className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>

      <Field id="draft-status" label="Status" value={props.status} onChange={props.onStatusChange} options={STATUS_OPTIONS} />
      <Field id="draft-exam" label="Exam" value={props.exam} onChange={props.onExamChange} options={props.examOptions} />
      <Field id="draft-difficulty" label="Difficulty" value={props.difficulty} onChange={props.onDifficultyChange} options={DIFFICULTY_OPTIONS} />
      <Field id="draft-language" label="Language" value={props.language} onChange={props.onLanguageChange} options={LANGUAGE_OPTIONS} />
      <Field id="draft-provider" label="Provider" value={props.provider} onChange={props.onProviderChange} options={PROVIDER_OPTIONS} />
    </div>
  );
}
