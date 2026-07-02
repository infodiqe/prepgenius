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
    <Card className="border-border bg-card backdrop-blur-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <Compass className="h-5 w-5 text-indigo-400" />
          {t("topic_performance")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {t("topic_table_desc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        {topics.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {t("no_topic_data")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-muted-foreground">
              <caption className="sr-only">{t("topic_performance")}</caption>
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th scope="col" className="px-4 py-3">{t("col_topic")}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t("col_resolved")}</th>
                  <th scope="col" className="px-4 py-3 text-center">{t("col_correct")}</th>
                  <th scope="col" className="px-4 py-3 text-right">{t("col_accuracy")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topics.map((topic, idx) => (
                  <tr key={idx} className="hover:bg-accent transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">{topic.name}</td>
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
