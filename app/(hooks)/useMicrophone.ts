"use client";

import { useState, useRef, useCallback } from 'react';

export const useMicrophone = () => {
    const [isRecording, setIsRecording] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = useCallback(async (onDataAvailable: (data: ArrayBuffer) => void) => {
        if (isRecording) {
            console.warn("Microphone is already recording.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 48000,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            // THIS IS WHERE processor.onaudioprocess IS
            processor.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                const inputSampleRate = audioContext.sampleRate;
                const outputSampleRate = 16000;

                // Fixed downsampling
                const ratio = outputSampleRate / inputSampleRate;
                const downsampledLength = Math.floor(inputData.length * ratio);
                const downsampledData = new Float32Array(downsampledLength);

                for (let i = 0; i < downsampledLength; i++) {
                    const srcIndex = Math.floor(i / ratio);
                    downsampledData[i] = inputData[srcIndex];
                }

                // Convert to Int16 PCM
                const int16Data = new Int16Array(downsampledLength);
                for (let i = 0; i < downsampledLength; i++) {
                    const s = Math.max(-1, Math.min(1, downsampledData[i]));
                    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                onDataAvailable(int16Data.buffer);
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsRecording(true);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            throw new Error("Microphone access was denied.");
        }
    }, [isRecording]);

    const stopRecording = useCallback(() => {
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        setIsRecording(false);
    }, []);

    return { isRecording, startRecording, stopRecording };
};