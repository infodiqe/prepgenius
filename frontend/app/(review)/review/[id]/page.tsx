import { ReviewDetailPage } from "@/features/review/ReviewDetailPage";

/*
 * Review detail route (T31). Thin shell; the client ReviewDetailPage reuses the
 * existing question + review-history endpoints and owns its states.
 */
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewDetailRoute({ params }: PageProps) {
  const { id } = await params;
  return <ReviewDetailPage id={id} />;
}
