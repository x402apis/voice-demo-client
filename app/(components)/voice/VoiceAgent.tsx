/** @format */

"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@heroui/button";
import { WalletConnector } from "../wallet/WalletConnector";
import { X402Router } from "@x402apis/client";
import { BrowserWalletSigner } from "@/lib/wallet-signer";
import { useMicrophone } from "@/app/(hooks)/useMicrophone";
import { AudioPlayer } from "@/lib/audio";
import { Transcript } from "./Transcript";

// --- Type Definitions ---
interface TranscriptMessage {
  source: "user" | "agent";
  text: string;
}

// --- Deepgram Agent Configuration ---
// This function creates the configuration object required by the Deepgram Agent.
// --- Deepgram Agent Configuration ---
const getDeepgramConfig = (companyName: string) => ({
  type: "Settings",
  audio: {
    input: { encoding: "linear16", sample_rate: 16000 },
    output: {
      encoding: "linear16",
      sample_rate: 24000,
      container: "none",
    },
  },
  agent: {
    language: "en",
    listen: {
      provider: {
        type: "deepgram",
        model: "nova-3",
        smart_format: true,
      },
    },
    think: {
      provider: { type: "open_ai", model: "gpt-4o-mini" },
      prompt: `You are a friendly and helpful AI assistant for ${companyName}. Your goal is to answer questions concisely. Keep your responses under 30 words.`,
    },
    speak: {
      provider: {
        type: "deepgram",
        model: "aura-2-callista-en",
      },
    },
    greeting: `Hello! Thank you for calling ${companyName}. How can I assist you today?`,
  },
});

// --- Main Component ---
export const VoiceAgent = () => {
  // --- State Management ---
  const [isCalling, setIsCalling] = useState(false);
  const [status, setStatus] = useState("Ready to call");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  // --- Refs for persistent objects ---
  const socketRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  // --- Hooks ---
  const walletContext = useWallet();
  const { startRecording, stopRecording, isRecording } = useMicrophone();

  // Initialize the AudioPlayer once when the component mounts.
  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer();
    // Cleanup function to stop everything when the component unmounts.
    return () => {
      endCall();
    };
  }, []);

  // --- Core Functions ---

  const startCall = async () => {
    if (!walletContext.connected || !walletContext.publicKey) {
      setStatus("Please connect your wallet first.");
      return;
    }

    console.log("🚀 CLIENT: Starting call...");
    setStatus("Purchasing session via x402...");
    setTranscript([]);

    // CRITICAL: Stop any existing recording first
    if (isRecording) {
      console.log("⚠️ CLIENT: Stopping existing recording before new call");
      stopRecording();
    }

    try {
      const signer = new BrowserWalletSigner(walletContext);
      const router = new X402Router({
        signer: signer,
        registry:
          process.env.NEXT_PUBLIC_REGISTRY_URL || "http://localhost:3000/api",
        rpcEndpoint:
          process.env.NEXT_PUBLIC_SOLANA_RPC_HOST ||
          "https://api.mainnet-beta.solana.com",
      });

      const response = await router.call("deepgram.agent.createSession", {
        userIdentifier: walletContext.publicKey.toBase58(),
      });

      const { sessionToken, websocketUrl } = response.data;
      console.log("✅ CLIENT: Session created, connecting to:", websocketUrl);
      setStatus("Connecting to agent...");

      const ws = new WebSocket(`${websocketUrl}?token=${sessionToken}`);
      socketRef.current = ws;
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        console.log("✅ CLIENT: WebSocket connected");
        console.log("📊 CLIENT: WebSocket readyState:", ws.readyState);
        setStatus("Connected! Initializing agent...");
        setIsCalling(true);

        // Send Settings
        const agentConfig = getDeepgramConfig("x402 Demo");
        console.log("🔧 CLIENT: Preparing to send Settings");
        console.log(
          "📄 CLIENT: Settings config:",
          JSON.stringify(agentConfig, null, 2)
        );

        try {
          ws.send(JSON.stringify(agentConfig));
          console.log("✅ CLIENT: Settings sent successfully");
        } catch (error) {
          console.error("❌ CLIENT: Failed to send Settings:", error);
        }
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          console.log(
            "🔊 CLIENT: Received audio data, length:",
            event.data.byteLength
          );
          audioPlayerRef.current?.addAudio(event.data);
        } else {
          try {
            const message = JSON.parse(event.data);
            console.log("📩 CLIENT: Received message:", message.type);

            if (message.type === "SettingsApplied" && !isRecording) {
              console.log(
                "✅ CLIENT: SettingsApplied received, starting microphone"
              );
              setStatus("Agent ready! Starting microphone...");
              handleToggleRecording();
            }

            if (message.type === "UserTranscript" && message.transcript) {
              setTranscript((prev) => [
                ...prev,
                { source: "user", text: message.transcript },
              ]);
            } else if (
              message.type === "AgentTranscript" &&
              message.transcript
            ) {
              setTranscript((prev) => [
                ...prev,
                { source: "agent", text: message.transcript },
              ]);
            }
          } catch (e) {
            console.warn("⚠️ CLIENT: Received non-JSON message:", event.data);
          }
        }
      };

      ws.onclose = (event) => {
        console.log(
          "🔌 CLIENT: WebSocket closed, code:",
          event.code,
          "reason:",
          event.reason
        );
        setStatus(`Call ended: ${event.reason || "Connection closed"}`);
        setIsCalling(false);
        stopRecording();
      };

      ws.onerror = (error) => {
        console.error("❌ CLIENT: WebSocket error:", error);
        setStatus("An error occurred during the call.");
        setIsCalling(false);
        stopRecording();
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("❌ CLIENT: Failed to start call:", errorMessage);
      setStatus(`Error: ${errorMessage}`);
    }
  };
  const endCall = () => {
    if (socketRef.current) {
      socketRef.current.close(1000, "User ended the call");
      socketRef.current = null;
    }
    stopRecording();
    audioPlayerRef.current?.stop();
    setIsCalling(false);
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording((data) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(data);
        }
      }).catch((err) => setStatus(err.message));
    }
  };

  // --- Render Logic ---
  return (
    <div className="w-full max-w-md p-8 border-2 border-neutral-800 bg-neutral-900/50 rounded-lg space-y-6 flex flex-col">
      <div>
        <h3 className="text-xl font-bold text-center">AI Voice Agent Demo</h3>
        <p className="text-sm text-neutral-400 text-center">
          Powered by x402 & Deepgram
        </p>
      </div>

      <WalletConnector />

      <Transcript messages={transcript} />

      <div className="p-4 bg-neutral-800 rounded-md min-h-[48px] text-center">
        <p className="text-sm font-mono">{status}</p>
      </div>

      {!isCalling ? (
        <Button
          color="primary"
          size="lg"
          onPress={startCall}
          className="w-full font-bold"
          isDisabled={!walletContext.connected}
        >
          Start 3-Minute Call (~$0.10 in SOL)
        </Button>
      ) : (
        <div className="space-y-4">
          <Button
            color={isRecording ? "warning" : "success"}
            size="lg"
            onPress={handleToggleRecording}
            className="w-full font-bold"
          >
            {isRecording ? "Mute Microphone" : "Unmute Microphone"}
          </Button>
          <Button
            color="danger"
            variant="bordered"
            size="lg"
            onPress={endCall}
            className="w-full font-bold"
          >
            End Call
          </Button>
        </div>
      )}
    </div>
  );
};
