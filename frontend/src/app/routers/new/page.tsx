"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyNewRouterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/routers/new");
  }, [router]);

  return null;
}
