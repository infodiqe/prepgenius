import React from "react";
import { useTranslations } from "next-intl";
import WeakTopicCard from "@/features/dashboard/components/WeakTopicCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface WeakTopicItem {
  topic_id: string;
  topic_name: string;
  accuracy: string | number | null;
  severity: number;
}

interface WeakTopicPanelProps {
  weakTopics: WeakTopicItem[];
}

export default function WeakTopicPanel({
  weakTopics,
}: WeakTopicPanelProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-1">
        <h3 className="text-xl font-bold text-white tracking-tight">
          {t("weak_topics_title")}
        </h3>
        <p className="text-xs text-slate-400">
          {t("weak_topics_subtitle")}
        </p>
      </div>

      {weakTopics.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/20 p-6 text-center">
          <p className="text-sm text-slate-400 font-medium">
            {t("positive_reinforcement")}
          </p>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800">
          {weakTopics.map((wt) => (
            <WeakTopicCard
              key={wt.topic_id}
              topicName={wt.topic_name}
              subjectName="Syllabus Item"
              accuracy={wt.accuracy ?? 0}
              severity={wt.severity}
              topicId={wt.topic_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
