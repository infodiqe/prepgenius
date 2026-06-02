import React, { Suspense } from "react";
import Link from "next/link";
import { getAttemptDetailServer } from "@/features/attempts/attemptServerService";
import { getCurrentUser } from "@/features/auth/serverAuth";
import { ArrowLeft, Clock, BookOpen, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

const ATTEMPT_TYPE_LABELS: Record<string, string> = {
  topic: "Topic Practice",
  subject: "Subject Practice",
  mixed: "Mixed Practice",
  previous_year: "Previous Year Paper",
  full_mock: "Full Mock Test",
};

const STATUS_LABELS: Record<string, string> = {
  created: "Ready to Start",
  in_progress: "In Progress",
  submitted: "Submitted — Awaiting Results",
  scored: "Scored",
};

async function AttemptPlayerContent({ attemptId }: { attemptId: string }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        Please log in to access this session.
      </div>
    );
  }

  const attempt = await getAttemptDetailServer(attemptId);

  if (!attempt) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-6">
        <div className="rounded-full bg-red-500/10 p-5 text-red-400">
          <AlertCircle className="h-10 w-10" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Session Not Found</h2>
          <p className="text-sm text-slate-400">
            This practice session does not exist or you do not have access to it.
          </p>
        </div>
        <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
          <Link href="/practice">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Practice
          </Link>
        </Button>
      </div>
    );
  }

  const typeLabel = ATTEMPT_TYPE_LABELS[attempt.attempt_type] ?? attempt.attempt_type;
  const statusLabel = STATUS_LABELS[attempt.status] ?? attempt.status;

  if (attempt.status === "scored") {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-6">
        <p className="text-slate-400 text-sm">This attempt has already been scored.</p>
        <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white">
          <Link href={`/results/${attemptId}`}>View Results</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 max-w-2xl mx-auto">
      {/* Back navigation */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-5">
        <Button
          asChild
          variant="ghost"
          className="text-slate-400 hover:text-white flex items-center gap-2 px-0"
        >
          <Link href="/practice">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Practice</span>
          </Link>
        </Button>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {typeLabel}
        </span>
      </div>

      {/* Session details */}
      <Card className="border-amber-500/20 bg-amber-500/5 shadow-xl backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-500/10 p-3 text-amber-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-amber-300">
                Practice Player Under Construction
              </CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                The interactive exam player is being built. Your session has been saved.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
              <Clock className="h-5 w-5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Status</p>
                <p className="text-sm font-bold text-white">{statusLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800">
              <BookOpen className="h-5 w-5 text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Mode</p>
                <p className="text-sm font-bold text-white">{typeLabel}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Session ID: <span className="font-mono text-slate-400">{attemptId}</span>
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild className="bg-blue-600 hover:bg-blue-500 text-white font-semibold">
          <Link href="/practice">Return to Practice Hub</Link>
        </Button>
        <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function PracticeAttemptPage({ params }: PageProps) {
  const { attemptId } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
        </div>
      }
    >
      <AttemptPlayerContent attemptId={attemptId} />
    </Suspense>
  );
}
