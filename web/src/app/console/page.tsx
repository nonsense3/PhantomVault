import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";

export default async function ConsoleRedirectPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/login?redirect=/dashboard");
  }
}
