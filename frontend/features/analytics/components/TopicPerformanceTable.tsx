import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopicData {
  name: string;
  accuracy: number;
  total: number;
  correct: number;
}

interface TopicPerformanceTableProps {
  topics: TopicData[];
}

export default function TopicPerformanceTable({
  topics,
}: TopicPerformanceTableProps) {
  const t = useTranslations("analytics");

  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Compass className="h-5 w-5 text-indigo-400" />
          {t("topic_performance")}
        </CardTitle>
        <CardDescription className="text-xs text-slate-400">
          Accuracy and question breakdowns for subtopics.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        {topics.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No topic data available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs uppercase bg-slate-950/45 text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-4 py-3">Topic</th>
                  <th scope="col" className="px-4 py-3 text-center">Resolved</th>
                  <th scope="col" className="px-4 py-3 text-center">Correct</th>
                  <th scope="col" className="px-4 py-3 text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {topics.map((topic, idx) => (
                  <tr key={idx} className="hover:bg-slate-950/20 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-white">{topic.name}</td>
                    <td className="px-4 py-3.5 text-center">{topic.total}</td>
                    <td className="px-4 py-3.5 text-center text-green-400">{topic.correct}</td>
                    <td className="px-4 py-3.5 text-right font-bold">
                      <span
                        className={cn(
                          topic.accuracy >= 60
                            ? "text-green-400"
                            : topic.accuracy >= 40
                            ? "text-amber-400"
                            : "text-red-400"
                        )}
                      >
                        {topic.accuracy}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
