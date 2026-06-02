"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen } from "lucide-react";

interface ExamItem {
  id: string;
  code: string;
  name: string;
}

interface ExamSelectorProps {
  exams: ExamItem[];
  selectedExamId: string;
}

export default function ExamSelector({
  exams,
  selectedExamId,
}: ExamSelectorProps) {
  const t = useTranslations("practice");
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleValueChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("examId", val);
    
    // Clear subtopic/topic filters when changing exam
    params.delete("topic");
    
    router.push(`/practice?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="rounded-full p-2.5 bg-indigo-500/10 text-indigo-400">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-slate-400">
            {t("select_exam_label")}
          </h3>
          <p className="text-xs text-slate-500">
            Switch your active context to browse other practice sets.
          </p>
        </div>
      </div>

      <div className="w-full sm:w-72 space-y-1">
        <Select value={selectedExamId} onValueChange={handleValueChange}>
          <SelectTrigger className="border-slate-800 bg-slate-950/80 text-white focus:ring-indigo-500">
            <SelectValue placeholder="Select target exam" />
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-950 text-slate-200">
            {exams.map((exam) => (
              <SelectItem key={exam.id} value={exam.id}>
                {exam.name} ({exam.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
