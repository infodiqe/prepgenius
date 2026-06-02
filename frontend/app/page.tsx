import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasToken = !!cookieStore.get("access_token")?.value;
  redirect(hasToken ? "/dashboard" : "/login");
}
