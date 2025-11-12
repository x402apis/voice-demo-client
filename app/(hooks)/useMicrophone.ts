"use client";

import { useState, useRef, useCallback } from 'react';

/**
 * A custom React hook to manage microphone recording using the MediaRecorder API.
 * It provides functions to start and stop recording and exposes the current recording state.
 */
export const useMicrophone = () => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    /**
     * Requests microphone access and starts recording.
     * The audio is streamed out in chunks via the onDataAvailable callback.
     * @param onDataAvailable A callback function that receives audio chunks (as Blobs) periodically.
     */
    const startRecording = useCallback(async (onDataAvailable: (data: Blob) => void) => {
        // Prevent starting a new recording if one is already in progress.
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.warn("Microphone is already recording.");
            return;
        }

        try {
            // Request access to the user's microphone.
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Create a new MediaRecorder instance with the stream.
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;

            // Event handler for when a chunk of audio data is available.
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    // Pass the audio chunk to the provided callback.
                    onDataAvailable(event.data);
                }
            };

            // Event handler for when the recording officially starts.
            recorder.onstart = () => {
                setIsRecording(true);
            };

            // Event handler for when the recording stops.
            recorder.onstop = () => {
                setIsRecording(false);
                // Clean up by stopping all tracks on the stream.
                stream.getTracks().forEach(track => track.stop());
            };

            // Start recording and slice the audio into chunks every 250ms.
            // This is the key to "streaming" the audio.
            recorder.start(250);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            // Provide a user-friendly error message.
            throw new Error("Microphone access was denied. Please allow access in your browser settings.");
        }
    }, []);

    /**
     * Stops the current recording session.
     */
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    // Expose the recording state and control functions to the component.
    return { isRecording, startRecording, stopRecording };
};