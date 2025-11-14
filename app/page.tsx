/** @format */

"use client";

import { VoiceAgent } from "@/app/(components)/voice/VoiceAgent";
import {
  Wallet,
  ArrowRight,
  Server,
  Cloud,
  MicVocal,
  Building2,
  Phone,
} from "lucide-react";

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

/**
 * Use case section for SaaS applications
 */
const UseCaseSection = () => {
  return (
    <section className="w-full max-w-5xl mt-24">
      <div className="p-8 border-2 border-blue-800/50 bg-blue-950/30 rounded-lg">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <Building2 className="h-12 w-12 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-3">
              Perfect for SaaS Voice AI Services
            </h3>
            <p className="text-neutral-300 mb-4">
              x402 enables SaaS platforms to offer pay-per-call voice AI to
              their customers without upfront subscriptions. Services like{" "}
              <a
                href="https://instantcallai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                InstantCallAI
              </a>{" "}
              can use this protocol to provide AI backup systems to home service
              contractors—auto repair shops, HVAC companies, and plumbers.
              Allowing them to pay only for the calls they actually receive.
            </p>
            <div className="flex items-start gap-3 mt-6 p-4 bg-blue-900/20 rounded border border-blue-800/30">
              <Phone className="h-6 w-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-blue-300 mb-1">
                  Example Use Case
                </h4>
                <p className="text-sm text-neutral-400">
                  A plumbing company uses InstantCallAI's voice agent. Instead
                  of a fixed monthly subscription, they pay per conversation
                  through x402, $0.05 per call handled. When a customer calls
                  after hours asking about a burst pipe emergency, the AI
                  answers, books the appointment, and the plumber only pays for
                  that single interaction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
      <div className="inline-block max-w-lg text-center justify-center mb-8">
        <h1 className="text-4xl font-bold">Parallax x402 Voice Agent (BETA)</h1>
        <h2 className="text-xl text-neutral-400 mt-2">
          Experience a real-time AI conversation, paid per-session with Solana.
        </h2>
        <h3 className="text-xl text-neutral-600 mt-2">
          This is experimental and in beta. If any{" "}
          <span className="text-red-300">errors</span> or
          <span className="text-warning-300"> latency</span> issues with the
          Parallax model please try OpenAI for demo purposes, thank you!
        </h3>
      </div>

      <VoiceAgent />

      <HowItWorks />

      <UseCaseSection />
    </section>
  );
}
