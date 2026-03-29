"use client";

import dynamic from "next/dynamic";

// Force client-side only - no server analysis
const IapyxScene = dynamic(() => import("./IapyxScene"), {
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-black" />,
});

export default function ClientScene() {
  return <IapyxScene />;
}

