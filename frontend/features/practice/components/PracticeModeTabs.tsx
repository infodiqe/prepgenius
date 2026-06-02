"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Layers, Milestone, Award, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import MockTestCard from "./MockTestCard";
import EmptyPracticeState from "./EmptyPracticeState";

interface Subtopic {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subtopics: Subtopic[];
}

interface Subject {
  id: string;
  name: string;
  topics: Topic[];
}

interface ExamTree {
  id: string;
  code: string;
  name: string;
  subjects: Subject[];
}

interface MockTest {
  id: string;
  name: string;
  type: "system" | "previous_year" | "custom";
  duration_seconds: number;
  total_questions: number;
  is_published: boolean;
}

interface AttemptItem {
  id: string;
  mock_test_id: string | null;
  status: string;
}

interface PracticeModeTabsProps {
  examTree: ExamTree | null;
  mockTests: MockTest[];
  activeAttempts: AttemptItem[];
  onStartPractice: (
    type: "topic" | "subject" | "mixed" | "previous_year" | "full_mock",
    options: { id?: string; name?: string; durationSeconds?: number; totalQuestions?: number }
  ) => void;
}

export default function PracticeModeTabs({
  examTree,
  mockTests,
  activeAttempts,
  onStartPractice,
}: PracticeModeTabsProps) {
  const t = useTranslations("practice");
  const searchParams = useSearchParams();

  // Active tab state
  const [activeTab, setActiveTab] = useState<"topic" | "subject" | "mixed" | "pyq" | "mock">("topic");

  // Topic Practice State
  const [topicSubjectId, setTopicSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");

  // Subject Practice State
  const [subjectId, setSubjectId] = useState<string>("");

  // Parse query parameters for topic pre-selection
  useEffect(() => {
    const topicParam = searchParams.get("topic");
    if (topicParam && examTree) {
      for (const subject of examTree.subjects) {
        const foundTopic = subject.topics.find((t) => t.id === topicParam);
        if (foundTopic) {
          setTopicSubjectId(subject.id);
          setTopicId(foundTopic.id);
          setActiveTab("topic");
          break;
        }
      }
    }
  }, [searchParams, examTree]);

  // Tab definitions
  const tabs = [
    { id: "topic", label: t("tabs.topic"), icon: Milestone },
    { id: "subject", label: t("tabs.subject"), icon: BookOpen },
    { id: "mixed", label: t("tabs.mixed"), icon: Layers },
    { id: "pyq", label: t("tabs.pyq"), icon: FileText },
    { id: "mock", label: t("tabs.mock"), icon: Award },
  ] as const;

  // Filter mock tests
  const pypTests = mockTests.filter((t) => t.type === "previous_year" && t.is_published);
  const mockTestsList = mockTests.filter((t) => t.type === "system" && t.is_published);

  // Subject list from tree
  const subjects = examTree?.subjects ?? [];
  const selectedSubjectForTopic = subjects.find((s) => s.id === topicSubjectId);
  const topicsForSelectedSubject = selectedSubjectForTopic?.topics ?? [];

  const handleSubjectChangeForTopic = (val: string) => {
    setTopicSubjectId(val);
    setTopicId("");
  };

  const getAttemptStatus = (testId: string) => {
    const attempt = activeAttempts.find((a) => a.mock_test_id === testId);
    if (!attempt) return "not_started";
    return attempt.status === "in_progress" ? "in_progress" : "attempted";
  };

  return (
    <div className="space-y-6">
      {/* Scrollable Tabs Header */}
      <div className="border-b border-slate-800/80">
        <nav
          className="flex space-x-1 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
          aria-label="Practice Modes"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all outline-none focus-visible:bg-slate-800/40 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t-lg",
                  isActive
                    ? "border-indigo-500 text-white bg-indigo-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-indigo-400" : "text-slate-500")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tabs Content */}
      <div className="pt-2">
        {/* Topic Practice Content */}
        {activeTab === "topic" && (
          <div className="space-y-6 max-w-xl">
            <div className="space-y-4">
              {subjects.length === 0 ? (
                <EmptyPracticeState
                  title={t("empty_states.no_subjects_title")}
                  description={t("empty_states.no_subjects_desc")}
                />
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="topic-subject-select" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t("select_subject")}
                    </label>
                    <Select value={topicSubjectId} onValueChange={handleSubjectChangeForTopic}>
                      <SelectTrigger id="topic-subject-select" className="border-slate-800 bg-slate-950/80 text-white focus:ring-indigo-500">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent className="border-slate-800 bg-slate-950 text-slate-200">
                        {subjects.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="topic-select" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t("select_topic")}
                    </label>
                    <Select
                      value={topicId}
                      onValueChange={setTopicId}
                      disabled={!topicSubjectId}
                    >
                      <SelectTrigger id="topic-select" className="border-slate-800 bg-slate-950/80 text-white focus:ring-indigo-500">
                        <SelectValue placeholder={topicSubjectId ? "Select Topic" : "Choose a subject first"} />
                      </SelectTrigger>
                      <SelectContent className="border-slate-800 bg-slate-950 text-slate-200">
                        {topicsForSelectedSubject.map((top) => (
                          <SelectItem key={top.id} value={top.id}>
                            {top.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <Button
              onClick={() => {
                const selectedTopic = topicsForSelectedSubject.find((t) => t.id === topicId);
                onStartPractice("topic", {
                  id: topicId,
                  name: selectedTopic?.name,
                  durationSeconds: 900,
                  totalQuestions: 20,
                });
              }}
              disabled={!topicId}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
            >
              <span>{t("start_practice")}</span>
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Subject Practice Content */}
        {activeTab === "subject" && (
          <div className="space-y-6 max-w-xl">
            <div className="space-y-4">
              {subjects.length === 0 ? (
                <EmptyPracticeState
                  title={t("empty_states.no_subjects_title")}
                  description={t("empty_states.no_subjects_desc")}
                />
              ) : (
                <div className="space-y-2">
                  <label htmlFor="subject-select" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t("select_subject")}
                  </label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger id="subject-select" className="border-slate-800 bg-slate-950/80 text-white focus:ring-indigo-500">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-950 text-slate-200">
                      {subjects.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                const selectedSub = subjects.find((s) => s.id === subjectId);
                onStartPractice("subject", {
                  id: subjectId,
                  name: selectedSub?.name,
                  durationSeconds: 1500,
                  totalQuestions: 30,
                });
              }}
              disabled={!subjectId}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
            >
              <span>{t("start_subject_practice")}</span>
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mixed Practice Content */}
        {activeTab === "mixed" && (
          <div className="space-y-6 max-w-xl">
            <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-md">
              <CardContent className="p-6 space-y-3">
                <h4 className="text-lg font-bold text-white tracking-tight">
                  {t("mixed_practice.title")}
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {t("mixed_practice.desc")}
                </p>
                <div className="flex gap-4 text-xs font-semibold text-indigo-400 pt-2">
                  <span>Questions: 50</span>
                  <span>•</span>
                  <span>Duration: 40 mins</span>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() =>
                onStartPractice("mixed", {
                  name: t("mixed_practice.title"),
                  durationSeconds: 2400,
                  totalQuestions: 50,
                })
              }
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
            >
              <span>{t("start_mixed_practice")}</span>
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Previous Year Papers Content */}
        {activeTab === "pyq" && (
          <div className="space-y-4">
            {pypTests.length === 0 ? (
              <EmptyPracticeState
                title={t("empty_states.no_mocks_title")}
                description={t("empty_states.no_mocks_desc")}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pypTests.map((test) => (
                  <MockTestCard
                    key={test.id}
                    name={test.name}
                    durationSeconds={test.duration_seconds}
                    totalQuestions={test.total_questions}
                    type="previous_year"
                    attemptStatus={getAttemptStatus(test.id)}
                    onSelect={() =>
                      onStartPractice("previous_year", {
                        id: test.id,
                        name: test.name,
                        durationSeconds: test.duration_seconds,
                        totalQuestions: test.total_questions,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Full Mock Tests Content */}
        {activeTab === "mock" && (
          <div className="space-y-4">
            {mockTestsList.length === 0 ? (
              <EmptyPracticeState
                title={t("empty_states.no_mocks_title")}
                description={t("empty_states.no_mocks_desc")}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockTestsList.map((test) => (
                  <MockTestCard
                    key={test.id}
                    name={test.name}
                    durationSeconds={test.duration_seconds}
                    totalQuestions={test.total_questions}
                    type="system"
                    attemptStatus={getAttemptStatus(test.id)}
                    onSelect={() =>
                      onStartPractice("full_mock", {
                        id: test.id,
                        name: test.name,
                        durationSeconds: test.duration_seconds,
                        totalQuestions: test.total_questions,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
