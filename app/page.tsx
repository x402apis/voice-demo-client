/** @format */

"use client";

import { VoiceAgent } from "@/app/(components)/voice/VoiceAgent";
import { Wallet, ArrowRight, Server, Cloud, MicVocal } from "lucide-react";

/**
 * A new component to visually explain the x402 process flow.
 */
const HowItWorks = () => {
  const steps = [
    {
      icon: <Wallet className="h-10 w-10 text-primary" />,
      title: "1. Web3 Payment",
      description:
        "You click 'Start Call'. The x402 client uses your connected wallet to send a micro-payment in SOL to a Provider Node on the Solana network.",
    },
    {
      icon: <Server className="h-10 w-10 text-primary" />,
      title: "2. The Provider Bridge",
      description:
        "The independent Provider Node receives your payment. It then uses its own private API keys to make a request to the traditional Deepgram API.",
    },
    {
      icon: <Cloud className="h-10 w-10 text-primary" />,
      title: "3. Web2 Service",
      description:
        "Deepgram's AI agent is activated and a new voice session is created, paid for by the Provider on your behalf.",
    },
  ];

  return (
    <section className="w-full max-w-5xl mt-24 text-center">
      <h2 className="text-3xl font-bold">How It Works: Behind the Scenes</h2>
      <p className="text-neutral-400 mt-2 max-w-2xl mx-auto">
        x402 acts as a decentralized bridge, allowing you to pay for traditional
        Web2 APIs directly from your wallet, pay-per-call.
      </p>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
        {steps.map((step, index) => (
          <>
            <div
              key={step.title}
              className="flex flex-col items-center p-4 text-center col-span-1"
            >
              <div className="mb-4">{step.icon}</div>
              <h3 className="font-bold mt-2">{step.title}</h3>
              <p className="text-sm text-neutral-400 mt-1">
                {step.description}
              </p>
            </div>
            {/* Show arrow between steps, but not after the last one */}
            {index < steps.length - 1 && (
              <div className="hidden md:flex items-center justify-center h-full mt-12">
                <ArrowRight className="h-8 w-8 text-neutral-600" />
              </div>
            )}
          </>
        ))}
      </div>
      <div className="mt-10 flex justify-center items-center gap-4 p-4 border-2 border-green-800/50 bg-green-900/30 rounded-lg max-w-lg mx-auto">
        <MicVocal className="h-8 w-8 text-green-400 flex-shrink-0" />
        <p className="text-sm text-green-300 text-left">
          The Provider then securely proxies the real-time audio stream between
          you and Deepgram, completing the connection.
        </p>
      </div>
    </section>
  );
};

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

      <HowItWorks />
    </section>
  );
}
