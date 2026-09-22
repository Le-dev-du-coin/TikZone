import { redirect } from "next/navigation";

export default function SingularRouterRedirectPage() {
  redirect("/dashboard/routers");
}
