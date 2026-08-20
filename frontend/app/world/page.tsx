"use client";

import dynamic from "next/dynamic";

const WorldSlice3D = dynamic(
  () => import("@/components/world-slice-3d"),
  { ssr: false }
);

export default function WorldPage() {
  return <WorldSlice3D />;
}
