/** @format */

"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

// Define the shape of a single message object
interface TranscriptMessage {
  source: "user" | "agent";
  text: string;
}

// Define the props for the component
interface TranscriptProps {
  messages: TranscriptMessage[];
}

/**
 * A component to display the conversation transcript.
 * It automatically scrolls to the latest message.
 */
export const Transcript = ({ messages }: TranscriptProps) => {
  // Create a ref to the scrolling container element
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // This useEffect hook runs whenever the 'messages' array changes.
  // Its job is to automatically scroll the container to the bottom.
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollContainerRef}
      className="h-64 w-full bg-neutral-900 border-2 border-neutral-800 rounded-lg p-4 overflow-y-auto space-y-4"
    >
      {/* If there are no messages, show a placeholder */}
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-neutral-500 text-sm">
            Your conversation will appear here...
          </p>
        </div>
      ) : (
        // If there are messages, map over them and render each one
        messages.map((message, index) => (
          <div
            key={index}
            className={clsx(
              "flex flex-col w-full",
              // Align user messages to the right, agent messages to the left
              { "items-end": message.source === "user" },
              { "items-start": message.source === "agent" }
            )}
          >
            <div
              className={clsx(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                // Style user and agent bubbles differently for clarity
                {
                  "bg-primary text-primary-foreground":
                    message.source === "user",
                },
                {
                  "bg-neutral-700 text-neutral-200": message.source === "agent",
                }
              )}
            >
              {message.text}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
