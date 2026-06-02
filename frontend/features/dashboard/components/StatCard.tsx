import React from "react";
import { Card as BaseCard, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  iconColorClass?: string;
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColorClass = "text-blue-500",
}: StatCardProps) {
  return (
    <BaseCard className="border-slate-800 bg-slate-900/40 backdrop-blur-md hover:border-slate-700 transition-colors">
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-white">
            {value}
          </p>
          <p className="text-xs text-slate-500">
            {description}
          </p>
        </div>
        <div className={`rounded-full bg-slate-950 p-3 ${iconColorClass} bg-opacity-40`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </CardContent>
    </BaseCard>
  );
}
