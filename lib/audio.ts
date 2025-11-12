/**
 * @file AudioPlayer.ts
 * @description A robust audio player with buffering to eliminate static and clicking.
 * It queues audio data and plays it in larger chunks for smoother playback.
 */

export class AudioPlayer {
    private audioContext: AudioContext | undefined;
    private audioQueue: ArrayBuffer[] = [];
    private isPlaying = false;
    private sourceNode: AudioBufferSourceNode | null = null;
    private sampleRate: number; // Stored for consistent reference

    // --- THE FIX ---
    // Change the default sample rate to 16000.
    constructor(sampleRate = 16000) {
        this.sampleRate = sampleRate;
        // Ensure this runs only in the browser
        if (typeof window !== "undefined") {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            this.audioContext = new AudioContext({
                sampleRate: this.sampleRate,
                latencyHint: "interactive",
            });
            console.log(`🔊 AudioPlayer: AudioContext initialized with sampleRate: ${this.audioContext.sampleRate}Hz`);
            console.log(`🔊 AudioPlayer: AudioContext state: ${this.audioContext.state}`);
        } else {
            this.audioContext = undefined
        }
    }

    /**
     * Returns the sample rate of the AudioContext used by this player.
     */
    public getSampleRate(): number {
        return this.audioContext?.sampleRate || this.sampleRate;
    }


    /**
     * Adds raw audio data (ArrayBuffer) to the queue.
     * @param audioData The ArrayBuffer containing PCM audio data.
     */
    public addAudio(audioData: ArrayBuffer): void {
        if (!this.audioContext) {
            console.warn("🔊 AudioPlayer: Cannot add audio, AudioContext not initialized.");
            return;
        }
        console.log(`🔊 AudioPlayer: Adding audio chunk of ${audioData.byteLength} bytes to queue. Queue size now: ${this.audioQueue.length + 1}`);
        this.audioQueue.push(audioData);
        if (!this.isPlaying) {
            this.playNextChunk();
        }
    }

    /**
     * Creates a single continuous AudioBuffer from all data in the queue.
     */
    private createContinuousBuffer(): AudioBuffer | null {
        if (!this.audioContext) return null;

        if (this.audioQueue.length === 0) {
            console.log("🔊 AudioPlayer: Queue is empty, cannot create continuous buffer.");
            return null;
        }

        // 1. Calculate the total length of all buffers (in bytes)
        let totalByteLength = 0;
        for (const buffer of this.audioQueue) {
            totalByteLength += buffer.byteLength;
        }
        console.log(`🔊 AudioPlayer: Total raw audio bytes in queue: ${totalByteLength}`);


        // Ensure the total byte length is even. If it's odd, discard the last byte.
        // This is crucial for Int16Array which requires 2-byte alignment.
        const alignedByteLength = totalByteLength - (totalByteLength % 2);
        console.log(`🔊 AudioPlayer: Aligned byte length for Int16 conversion: ${alignedByteLength}`);

        if (alignedByteLength === 0) {
            console.warn("🔊 AudioPlayer: Aligned byte length is 0, no playable data after alignment. Clearing queue.");
            this.audioQueue = [];
            return null;
        }

        // 2. Create a single Uint8Array to hold all data with the aligned length
        const combinedUint8Array = new Uint8Array(alignedByteLength);
        let offset = 0;
        for (const buffer of this.audioQueue) {
            const bytesToCopy = Math.min(buffer.byteLength, alignedByteLength - offset);
            combinedUint8Array.set(new Uint8Array(buffer, 0, bytesToCopy), offset);
            offset += bytesToCopy;
            if (offset >= alignedByteLength) break; // Stop if we filled the buffer
        }
        console.log(`🔊 AudioPlayer: Combined all queued audio into Uint8Array (actual bytes copied: ${offset}).`);
        console.log(`🔊 AudioPlayer: Combined buffer (first 20 hex): ${Array.from(combinedUint8Array.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);


        // 3. Create the AudioBuffer and get its channel data
        // The frameCount is the number of 16-bit samples, so byteLength / 2
        const frameCount = alignedByteLength / 2;
        const audioBuffer = this.audioContext.createBuffer(1, frameCount, this.sampleRate); // Using stored sampleRate
        const channelData = audioBuffer.getChannelData(0);
        console.log(`🔊 AudioPlayer: Created AudioBuffer: channels=1, frameCount=${frameCount}, sampleRate=${this.sampleRate}Hz.`);


        // 4. Safely convert the Uint8Array to Int16Array and normalize to Float32
        const dataView = new DataView(combinedUint8Array.buffer);

        for (let i = 0; i < frameCount; i++) {
            const pcmValue = dataView.getInt16(i * 2, true); // true for little-endian
            channelData[i] = pcmValue / 32768.0; // Normalize to Float32 [-1.0, 1.0]
        }
        console.log(`🔊 AudioPlayer: Converted ${frameCount} samples to Float32.`);


        // 5. Clear the queue now that the data is processed
        this.audioQueue = [];
        console.log("🔊 AudioPlayer: Audio queue cleared after buffer creation.");

        return audioBuffer;
    }

    /**
     * Plays the next available audio chunk from the queue.
     */
    private async playNextChunk(): Promise<void> {
        if (!this.audioContext) {
            console.warn("🔊 AudioPlayer: Cannot play chunk, AudioContext not initialized.");
            return;
        }
        if (this.audioQueue.length === 0 || this.isPlaying) {
            console.log(`🔊 AudioPlayer: playNextChunk skipped. Queue empty? ${this.audioQueue.length === 0}. Already playing? ${this.isPlaying}.`);
            return;
        }

        // Resume AudioContext if it was suspended
        if (this.audioContext.state === "suspended") {
            console.log("🔊 AudioPlayer: AudioContext is suspended, attempting to resume.");
            try {
                await this.audioContext.resume();
                console.log(`🔊 AudioPlayer: AudioContext resumed. State: ${this.audioContext.state}`);
            } catch (error) {
                console.error("❌ AudioPlayer: Failed to resume AudioContext:", error);
                return; // Cannot proceed without resumed context
            }
        }

        const audioBuffer = this.createContinuousBuffer();
        if (!audioBuffer) {
            console.log("🔊 AudioPlayer: No AudioBuffer created, stopping playNextChunk.");
            return;
        }

        this.isPlaying = true;
        console.log("🔊 AudioPlayer: Starting playback of AudioBuffer.");

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        source.onended = () => {
            console.log("🔊 AudioPlayer: Current audio chunk finished playing.");
            this.isPlaying = false;
            // Disconnect source to free up resources
            source.disconnect();
            this.sourceNode = null; // Clear reference

            // Immediately check if more audio has been queued while this was playing
            if (this.audioQueue.length > 0) {
                console.log(`🔊 AudioPlayer: More audio in queue (${this.audioQueue.length}), playing next chunk.`);
                this.playNextChunk();
            } else {
                console.log("🔊 AudioPlayer: Audio queue is empty, waiting for new audio.");
            }
        };

        this.sourceNode = source;
        source.start();
    }

    /**
     * Stops all current and queued playback immediately.
     * Essential for handling interruptions when the user speaks.
     */
    public stop(): void {
        if (!this.audioContext) return; // No audio context, nothing to stop.

        if (this.sourceNode) {
            console.log("🔊 AudioPlayer: Stopping current playback via sourceNode.stop().");
            try {
                this.sourceNode.stop();
                this.sourceNode.disconnect();
            } catch (e) {
                console.warn("🔊 AudioPlayer: Could not stop source node gracefully (might have already ended).", e);
            } finally {
                this.sourceNode = null;
            }
        }
        // Clear any pending audio data
        this.audioQueue = [];
        this.isPlaying = false;
        console.log("🔊 AudioPlayer: Playback stopped, queue cleared.");
        // Consider suspending AudioContext to save resources if no more audio expected for a while
        // if (this.audioContext.state === "running") {
        //     this.audioContext.suspend().then(() => console.log("🔊 AudioPlayer: AudioContext suspended."));
        // }
    }
}