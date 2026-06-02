import React from "react";
import PracticeSkeleton from "@/features/practice/components/PracticeSkeleton";

export default function PracticeLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PracticeSkeleton />
    </div>
  );
}
