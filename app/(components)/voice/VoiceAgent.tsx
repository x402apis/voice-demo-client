/** @format */

"use client";

import { useState, useRef, useEffect, useCallback } from "react"; // Added useCallback
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@heroui/button";
import { WalletConnector } from "../wallet/WalletConnector";
import { X402Router } from "@x402apis/client";
import { BrowserWalletSigner } from "@/lib/wallet-signer";
import { useMicrophone } from "@/app/(hooks)/useMicrophone";
import { Transcript } from "./Transcript";
import { AudioPlayer } from "@/lib/audio";

// --- Type Definitions ---
interface TranscriptMessage {
  source: "user" | "agent";
  text: string;
}

// --- Deepgram Agent Configuration ---
// in VoiceAgent.tsx

// --- Deepgram Agent Configuration ---
const getDeepgramConfig = (companyName: string) => {
  const config = {
    type: "Settings",
    audio: {
      input: { encoding: "linear16", sample_rate: 16000 },
      output: {
        encoding: "linear16",
        // --- THE FIX ---
        // Change this to match what Deepgram is actually sending.
        sample_rate: 16000,
        container: "none",
      },
    },
    agent: {
      language: "en",
      listen: {
        provider: {
          type: "deepgram",
          model: "nova-3",
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
  };
  console.log(
    "🔊 CLIENT: Deepgram Agent Config generated:",
    JSON.stringify(config, null, 2)
  );
  return config;
};

// ... rest of the VoiceAgent.tsx file remains the same ...

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
    console.log("🔊 CLIENT: Initializing AudioPlayer...");
    audioPlayerRef.current = new AudioPlayer(
      getDeepgramConfig("").audio.output.sample_rate // Pass the expected sample rate
    );

    // Cleanup function to stop everything when the component unmounts.
    return () => {
      console.log(
        "🔊 CLIENT: Component unmounting, ending call and cleaning up."
      );
      endCall();
    };
  }, []); // Empty dependency array means this runs once on mount

  // Use useCallback for stable function references
  const endCall = useCallback(() => {
    console.log("🔊 CLIENT: endCall triggered.");
    setIsCalling(false);
    stopRecording();
    audioPlayerRef.current?.stop();
    if (socketRef.current) {
      console.log("🔊 CLIENT: Closing WebSocket connection.");
      socketRef.current.close(1000, "User ended the call");
      socketRef.current = null;
    }
    setStatus("Ready to call");
  }, [stopRecording]); // Only re-create if stopRecording changes

  const startCall = async () => {
    if (!walletContext.connected || !walletContext.publicKey) {
      setStatus("Please connect your wallet first.");
      console.warn("🔊 CLIENT: Wallet not connected, cannot start call.");
      return;
    }

    console.log("🚀 CLIENT: Starting call...");
    setStatus("Purchasing session via x402...");
    setTranscript([]);

    if (isRecording) {
      console.log("⚠️ CLIENT: Stopping existing recording before new call.");
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

      console.log("🔊 CLIENT: Calling x402 router for session...");
      const response = await router.call("deepgram.agent.createSession", {
        userIdentifier: walletContext.publicKey.toBase58(),
      });

      const { sessionToken, websocketUrl } = response.data;
      console.log("✅ CLIENT: Session created.");
      console.log(`   WebSocket URL: ${websocketUrl}`);
      console.log(
        `   Session Token (first 10 chars): ${sessionToken.substring(0, 10)}...`
      );
      setStatus("Connecting to agent...");

      const ws = new WebSocket(`${websocketUrl}?token=${sessionToken}`);
      socketRef.current = ws;
      ws.binaryType = "arraybuffer";
      console.log(
        "🔊 CLIENT: WebSocket instance created, binaryType set to ArrayBuffer."
      );

      ws.onopen = () => {
        console.log("✅ CLIENT: WebSocket connected to proxy.");
        setStatus("Connected! Initializing agent...");
        setIsCalling(true);
        const agentConfig = getDeepgramConfig("x402 Demo");
        ws.send(JSON.stringify(agentConfig));
        console.log("✅ CLIENT: Deepgram Agent Settings sent to proxy.");
      };

      // in VoiceAgent.tsx, inside startCall()

      ws.onmessage = (event) => {
        let isAudio = false;
        let messageData = event.data;

        // --- NEW LOGIC: Check ArrayBuffer for hidden JSON ---
        if (messageData instanceof ArrayBuffer) {
          // Assume ArrayBuffer is audio, but try to parse as JSON first
          try {
            // Decode ArrayBuffer to string
            const messageString = new TextDecoder("utf-8").decode(messageData);
            const message = JSON.parse(messageString);

            // Successfully parsed JSON that arrived in a binary frame
            messageData = message; // Use the parsed object for the rest of the handler
            console.log(
              "🔊 CLIENT: Received JSON message (was binary):",
              message.type,
              message
            );
          } catch (e) {
            // Failed to parse as JSON, so it must be audio data
            isAudio = true;
            console.log(
              `🔊 CLIENT: Received binary audio chunk (${messageData.byteLength} bytes)`
            );
          }
        } else {
          // Already a string, so parse as JSON (standard path)
          try {
            messageData = JSON.parse(messageData);
            console.log(
              "🔊 CLIENT: Received JSON message (was text):",
              messageData.type,
              messageData
            );
          } catch (e) {
            console.warn(
              "⚠️ CLIENT: Received unparsable text message:",
              event.data
            );
            return;
          }
        }

        // --- Processing Logic ---
        if (isAudio) {
          // Only process if explicitly identified as audio
          audioPlayerRef.current?.addAudio(messageData as ArrayBuffer);
          return;
        }

        // Process JSON control messages
        const message = messageData as any;

        if (message.type === "SettingsApplied") {
          console.log(
            "✅ CLIENT: Deepgram SettingsApplied received. Output details:",
            message.response
          );
          handleToggleRecording();
        }

        if (message.type === "UserStartedSpeaking") {
          console.log(
            "🎤 CLIENT: User started speaking, stopping AI audio playback."
          );
          audioPlayerRef.current?.stop();
        }

        if (message.type === "UserTranscript" && message.transcript) {
          setTranscript((prev) => [
            ...prev,
            { source: "user", text: message.transcript },
          ]);
          console.log("🗣️ CLIENT: User Transcript:", message.transcript);
        } else if (message.type === "AgentTranscript" && message.transcript) {
          setTranscript((prev) => [
            ...prev,
            { source: "agent", text: message.transcript },
          ]);
          console.log("🤖 CLIENT: Agent Transcript:", message.transcript);
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
        endCall();
      };

      ws.onerror = (error) => {
        console.error("❌ CLIENT: WebSocket error:", error);
        setStatus("An error occurred during the call.");
        endCall();
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("❌ CLIENT: Failed to start call:", errorMessage);
      setStatus(`Error: ${errorMessage}`);
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      console.log("🎤 CLIENT: Stopping microphone recording.");
      stopRecording();
    } else {
      console.log("🎤 CLIENT: Starting microphone recording.");
      startRecording((data) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(data);
        }
      }).catch((err) => {
        setStatus(err.message);
        console.error("❌ CLIENT: Microphone start error:", err.message);
      });
    }
  };

  // --- Render Logic (No changes needed here) ---
  return (
    <div className="w-full max-w-md p-8 border-2 border-neutral-800 bg-neutral-900/50 rounded-lg space-y-6 flex flex-col">
      <div>
        <h3 className="text-xl font-bold text-center">AI Voice Agent Demo</h3>
        <p className="text-sm text-neutral-400 text-center">
          Powered by x402 & Deepgram
        </p>
      </div>

      <WalletConnector />

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
