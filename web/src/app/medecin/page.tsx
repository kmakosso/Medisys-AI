"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MedecinIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/medecin/rendez-vous");
  }, [router]);
  return null;
}
