"use client";

import dynamic from "next/dynamic";

const TechnicalSpike3D = dynamic(
  () => import("@/components/technical-spike-3d"),
  { ssr: false }
);

export default function SpikePage() {
  return <TechnicalSpike3D />;
}
