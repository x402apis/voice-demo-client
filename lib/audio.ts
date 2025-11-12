/**
 * A simple audio player class to handle raw PCM audio from Deepgram Voice Agent.
 * Handles linear16 PCM at 24kHz sample rate with byte buffering for incomplete chunks.
 */
export class AudioPlayer {
    private audioQueue: ArrayBuffer[] = [];
    private isPlaying = false;
    private audioContext: AudioContext;
    private nextStartTime = 0;
    private byteBuffer: Uint8Array = new Uint8Array(0); // Buffer for incomplete bytes

    constructor() {
        // Initialize AudioContext with 24kHz to match Deepgram's output
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
            sampleRate: 24000
        });
    }

    /**
     * Adds a new chunk of raw PCM audio data to the playback queue.
     * @param audioData The raw linear16 PCM audio as an ArrayBuffer.
     */
    public addAudio(audioData: ArrayBuffer) {
        // Combine with any leftover bytes from previous chunk
        const newBytes = new Uint8Array(audioData);
        const combined = new Uint8Array(this.byteBuffer.length + newBytes.length);
        combined.set(this.byteBuffer);
        combined.set(newBytes, this.byteBuffer.length);

        // Check if we have an even number of bytes (required for Int16Array)
        const usableLength = Math.floor(combined.length / 2) * 2; // Round down to even number

        if (usableLength > 0) {
            // Extract the usable portion
            const usableBytes = combined.slice(0, usableLength);
            this.audioQueue.push(usableBytes.buffer);

            // Store any leftover odd byte for next chunk
            if (usableLength < combined.length) {
                this.byteBuffer = combined.slice(usableLength);
            } else {
                this.byteBuffer = new Uint8Array(0);
            }

            if (!this.isPlaying) {
                this.playNext();
            }
        } else {
            // Not enough bytes yet, just buffer them
            this.byteBuffer = combined;
        }
    }

    /**
     * Converts raw linear16 PCM data to an AudioBuffer
     */
    private createAudioBuffer(audioData: ArrayBuffer): AudioBuffer {
        // Convert Int16 PCM to Float32 for Web Audio API
        const int16Array = new Int16Array(audioData);
        const float32Array = new Float32Array(int16Array.length);

        // Convert from Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }

        // Create audio buffer (1 channel = mono, 24000 Hz sample rate)
        const audioBuffer = this.audioContext.createBuffer(
            1,
            float32Array.length,
            24000
        );

        // Copy the converted data into the buffer
        audioBuffer.getChannelData(0).set(float32Array);

        return audioBuffer;
    }

    /**
     * The core playback loop. Plays the next audio chunk in the queue.
     */
    private async playNext() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        const audioData = this.audioQueue.shift()!;

        try {
            // Convert raw PCM to AudioBuffer
            const audioBuffer = this.createAudioBuffer(audioData);

            // Create a source node to play the buffer
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.audioContext.destination);

            // Schedule playback to maintain continuous audio without gaps
            const currentTime = this.audioContext.currentTime;
            const startTime = Math.max(currentTime, this.nextStartTime);

            source.start(startTime);
            this.nextStartTime = startTime + audioBuffer.duration;

            // When this clip ends, play the next one
            source.onended = () => {
                this.playNext();
            };
        } catch (error) {
            console.error("Error creating or playing audio:", error);
            // If an error occurs, skip this chunk and try the next one
            this.isPlaying = false;
            this.playNext();
        }
    }

    /**
     * Immediately stops all playback and clears the audio queue.
     */
    public stop() {
        this.audioQueue = [];
        this.isPlaying = false;
        this.nextStartTime = 0;
        this.byteBuffer = new Uint8Array(0);
    }
}