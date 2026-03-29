"use client";
import dynamic from "next/dynamic";

const IapyxScene = dynamic(() => import("./components/IapyxScene"), {
  ssr: false,
  loading: () => <div className="h-screen w-screen bg-black" />,
});

export default function Home() {
  return (
    <main className="min-h-screen w-full">
      <IapyxScene />
    </main>
  );
}

