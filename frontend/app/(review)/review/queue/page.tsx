import { ReviewQueuePage } from "@/features/review/ReviewQueuePage";

/*
 * Review queue route (T31). Guarded by the (review) layout's RoleGuard
 * (content_reviewer / sme / content_manager / platform_admin). The client
 * ReviewQueuePage owns its loading/empty/error states and consumes existing
 * content-review APIs only.
 */
export default function ReviewQueueRoute() {
  return <ReviewQueuePage />;
}
