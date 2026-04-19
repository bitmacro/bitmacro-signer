import { redirect } from "next/navigation";

/** Legacy URL — bookmarks and old links redirect to the panel route. */
export default function OnboardingRedirectPage() {
  redirect("/panel");
}
