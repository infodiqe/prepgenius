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
    <BaseCard className="border-border bg-card backdrop-blur-md hover:border-border transition-colors">
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>
        <div className={`rounded-full bg-muted p-3 ${iconColorClass} bg-opacity-40`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </CardContent>
    </BaseCard>
  );
}
