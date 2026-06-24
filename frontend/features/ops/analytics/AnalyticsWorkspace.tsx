"use client";

import React from "react";
import { AnalyticsFilters } from "./AnalyticsFilters";
import { AnalyticsKpiCards } from "./AnalyticsKpiCards";
import { ReadinessDistributionPanel } from "./ReadinessDistributionPanel";
import { ContentPipelinePanel } from "./ContentPipelinePanel";
import { ReviewOperationsPanel } from "./ReviewOperationsPanel";
import { CreditOperationsPanel } from "./CreditOperationsPanel";
import {
  classifyError,
  getOpsContent,
  getOpsCredits,
  getOpsOverview,
  getOpsReadiness,
  getOpsReview,
  type AnalyticsPhase,
  type OpsContentDistribution,
  type OpsCreditAnalytics,
  type OpsOverview,
  type OpsReadinessDistribution,
  type OpsReviewAnalytics,
} from "./analyticsService";

/**
 * AnalyticsWorkspace — OPS-08A orchestrator (READ-ONLY).
 *
 * Operator-wide platform analytics built entirely on the OPS-BE-03 endpoints.
 * Every value is loaded from the API and rendered verbatim — no client
 * aggregation, no derivation, no mock data, no optimistic state. The backend is
 * the source of truth and the RBAC gate (401/403 surface per panel).
 *
 * The five endpoints are platform-wide and take no parameters, so the workspace
 * loads on mount (no exam gating). Each resource owns its own phase + retry so a
 * single endpoint's failure degrades only its panel. English-only.
 */
export function AnalyticsWorkspace() {
  const [overview, setOverview] = React.useState<OpsOverview | null>(null);
  const [overviewPhase, setOverviewPhase] =
    React.useState<AnalyticsPhase>("loading");

  const [readiness, setReadiness] =
    React.useState<OpsReadinessDistribution | null>(null);
  const [readinessPhase, setReadinessPhase] =
    React.useState<AnalyticsPhase>("loading");

  const [content, setContent] = React.useState<OpsContentDistribution | null>(
    null,
  );
  const [contentPhase, setContentPhase] =
    React.useState<AnalyticsPhase>("loading");

  const [review, setReview] = React.useState<OpsReviewAnalytics | null>(null);
  const [reviewPhase, setReviewPhase] =
    React.useState<AnalyticsPhase>("loading");

  const [credits, setCredits] = React.useState<OpsCreditAnalytics | null>(null);
  const [creditsPhase, setCreditsPhase] =
    React.useState<AnalyticsPhase>("loading");

  const loadOverview = React.useCallback(async () => {
    setOverviewPhase("loading");
    try {
      setOverview(await getOpsOverview());
      setOverviewPhase("ready");
    } catch (err) {
      setOverview(null);
      setOverviewPhase(classifyError(err));
    }
  }, []);

  const loadReadiness = React.useCallback(async () => {
    setReadinessPhase("loading");
    try {
      setReadiness(await getOpsReadiness());
      setReadinessPhase("ready");
    } catch (err) {
      setReadiness(null);
      setReadinessPhase(classifyError(err));
    }
  }, []);

  const loadContent = React.useCallback(async () => {
    setContentPhase("loading");
    try {
      setContent(await getOpsContent());
      setContentPhase("ready");
    } catch (err) {
      setContent(null);
      setContentPhase(classifyError(err));
    }
  }, []);

  const loadReview = React.useCallback(async () => {
    setReviewPhase("loading");
    try {
      setReview(await getOpsReview());
      setReviewPhase("ready");
    } catch (err) {
      setReview(null);
      setReviewPhase(classifyError(err));
    }
  }, []);

  const loadCredits = React.useCallback(async () => {
    setCreditsPhase("loading");
    try {
      setCredits(await getOpsCredits());
      setCreditsPhase("ready");
    } catch (err) {
      setCredits(null);
      setCreditsPhase(classifyError(err));
    }
  }, []);

  React.useEffect(() => {
    void loadOverview();
    void loadReadiness();
    void loadContent();
    void loadReview();
    void loadCredits();
  }, [loadOverview, loadReadiness, loadContent, loadReview, loadCredits]);

  return (
    <div className="space-y-4">
      <AnalyticsFilters />

      <AnalyticsKpiCards
        overview={overview}
        phase={overviewPhase}
        onRetry={() => void loadOverview()}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReadinessDistributionPanel
          data={readiness}
          phase={readinessPhase}
          onRetry={() => void loadReadiness()}
        />
        <ContentPipelinePanel
          data={content}
          phase={contentPhase}
          onRetry={() => void loadContent()}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReviewOperationsPanel
          data={review}
          phase={reviewPhase}
          onRetry={() => void loadReview()}
        />
        <CreditOperationsPanel
          data={credits}
          phase={creditsPhase}
          onRetry={() => void loadCredits()}
        />
      </div>
    </div>
  );
}
