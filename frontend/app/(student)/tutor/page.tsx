"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";

export default function TutorPlaceholder() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-white">AI Tutor Assistant</h2>
      
      <Card className="border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl text-white">PrepGenius AI Copilot</CardTitle>
          <CardDescription className="text-slate-400">
            This is a placeholder for your real-time conversational AI tutor.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-300">
          Chat interfaces, question explanations, and concept clarity features will be rendered here.
        </CardContent>
      </Card>
    </div>
  );
}
