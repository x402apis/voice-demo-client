/** @format */

"use client";

import { VoiceAgent } from "@/app/(components)/voice/VoiceAgent";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-lg text-center justify-center mb-8">
        <h1 className="text-4xl font-bold">x402 Voice Agent</h1>
        <h2 className="text-xl text-neutral-400 mt-2">
          Experience a real-time AI conversation, paid per-session with Solana.
        </h2>
      </div>

      <VoiceAgent />
    </section>
  );
}
