/**
 * Studio-grade Audio Processing & Encoding Utility
 * Supports PCM decoding, Pitch & Speed adjustment, Waveform extraction,
 * and high-quality WAV, MP3, and AAC export.
 */

import lamejs from 'lamejs';

/**
 * Convert base64 encoded string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Safely decode base64 audio payload (whether WAV RIFF container, MP3, or raw 24kHz PCM) into an AudioBuffer
 */
export async function decodeAudioPayload(
  base64: string,
  audioCtx: AudioContext,
  sampleRate = 24000
): Promise<AudioBuffer> {
  const arrayBuffer = base64ToArrayBuffer(base64);
  try {
    // Clone arrayBuffer because decodeAudioData can detach the buffer
    const copy = arrayBuffer.slice(0);
    return await audioCtx.decodeAudioData(copy);
  } catch {
    // If standard browser decode fails (e.g. raw headerless PCM), use manual PCM decoder
    return pcmToAudioBuffer(arrayBuffer, audioCtx, sampleRate, 1);
  }
}

/**
 * Decode 16-bit linear PCM (mono or stereo) at given sample rate into an AudioBuffer
 */
export function pcmToAudioBuffer(
  pcmBuffer: ArrayBuffer,
  audioCtx: AudioContext | OfflineAudioContext,
  sampleRate = 24000,
  numChannels = 1
): AudioBuffer {
  const int16Data = new Int16Array(pcmBuffer);
  const frameCount = int16Data.length / numChannels;
  const audioBuffer = audioCtx.createBuffer(numChannels, frameCount, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < frameCount; i++) {
      // Normalize 16-bit signed integer [-32768, 32767] to [-1.0, 1.0]
      const sample = int16Data[i * numChannels + ch];
      channelData[i] = sample < 0 ? sample / 32768.0 : sample / 32767.0;
    }
  }

  return audioBuffer;
}

/**
 * Render AudioBuffer with Pitch (semitones: -12 to +12) and Speed (0.5 to 2.0)
 * using an OfflineAudioContext so the output file matches exactly what the user hears.
 */
export async function renderProcessedAudioBuffer(
  sourceBuffer: AudioBuffer,
  pitchSemitones = 0,
  speedRate = 1.0
): Promise<AudioBuffer> {
  // Speed alters duration proportionally: newDuration = originalDuration / speedRate
  // Pitch detune alters frequency by cents: pitchSemitones * 100
  const effectiveSpeed = Math.max(0.25, Math.min(4.0, speedRate));
  const newDuration = Math.max(0.1, sourceBuffer.duration / effectiveSpeed);
  const targetSampleRate = sourceBuffer.sampleRate;
  const targetLength = Math.ceil(newDuration * targetSampleRate);

  const offlineCtx = new OfflineAudioContext(
    sourceBuffer.numberOfChannels,
    targetLength,
    targetSampleRate
  );

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = sourceBuffer;
  sourceNode.playbackRate.value = effectiveSpeed;
  // Detune in cents: 1 semitone = 100 cents
  sourceNode.detune.value = pitchSemitones * 100;

  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  return await offlineCtx.startRendering();
}

/**
 * Convert an AudioBuffer to an uncompressed 16-bit PCM WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length;
  const dataByteCount = length * blockAlign;
  const headerByteCount = 44;
  const totalByteCount = headerByteCount + dataByteCount;

  const arrayBuffer = new ArrayBuffer(totalByteCount);
  const view = new DataView(arrayBuffer);

  // Helper to write ASCII strings
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF identifier
  writeString(0, 'RIFF');
  // RIFF chunk size
  view.setUint32(4, 36 + dataByteCount, true);
  // WAVE identifier
  writeString(8, 'WAVE');
  // fmt chunk identifier
  writeString(12, 'fmt ');
  // fmt chunk size (16 for PCM)
  view.setUint32(16, 16, true);
  // Audio format (1 for PCM)
  view.setUint16(20, format, true);
  // Number of channels
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint32(28, sampleRate * blockAlign, true);
  // Block align
  view.setUint16(32, blockAlign, true);
  // Bits per sample
  view.setUint16(34, bitDepth, true);
  // data chunk identifier
  writeString(36, 'data');
  // data chunk length
  view.setUint32(40, dataByteCount, true);

  // Write interleaved PCM samples
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 32768 : sample * 32767;
      view.setInt16(offset, Math.floor(intSample), true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Convert an AudioBuffer to an MP3 Blob using lamejs
 */
export function audioBufferToMp3Blob(buffer: AudioBuffer, bitrateKbps = 192): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, bitrateKbps);
  const mp3Data: Int8Array[] = [];

  const length = buffer.length;
  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : undefined;

  // Convert Float32Array to Int16Array
  const leftInt16 = new Int16Array(length);
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, left[i]));
    leftInt16[i] = s < 0 ? s * 32768 : s * 32767;
  }

  let rightInt16: Int16Array | undefined = undefined;
  if (right) {
    rightInt16 = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      const s = Math.max(-1, Math.min(1, right[i]));
      rightInt16[i] = s < 0 ? s * 32768 : s * 32767;
    }
  }

  const sampleBlockSize = 1152;
  for (let i = 0; i < length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    let mp3buf: Int8Array;
    if (numChannels === 1 || !rightInt16) {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    } else {
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    }
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const mp3buf = mp3encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }

  return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
}

/**
 * Convert an AudioBuffer to an AAC / M4A Blob using Web Audio & MediaRecorder
 */
export async function audioBufferToAacBlob(buffer: AudioBuffer): Promise<Blob> {
  // Check supported mimeTypes in browser
  const preferredTypes = [
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
    'audio/webm;codecs=opus',
  ];

  let selectedMimeType = '';
  for (const mime of preferredTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      selectedMimeType = mime;
      break;
    }
  }

  if (!selectedMimeType) {
    // Fallback to WAV if no compressed media recorder supported
    return audioBufferToWavBlob(buffer);
  }

  const audioCtx = new AudioContext({ sampleRate: buffer.sampleRate });
  const destination = audioCtx.createMediaStreamDestination();
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(destination);

  const recorder = new MediaRecorder(destination.stream, {
    mimeType: selectedMimeType,
    audioBitsPerSecond: 192000,
  });

  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      audioCtx.close();
      const outputBlob = new Blob(chunks, { type: selectedMimeType });
      resolve(outputBlob);
    };

    recorder.onerror = (e) => {
      audioCtx.close();
      reject(e);
    };

    recorder.start(100);
    source.start(0);

    setTimeout(() => {
      source.stop();
      recorder.stop();
    }, buffer.duration * 1000 + 300);
  });
}

/**
 * Extract normalized waveform peaks (e.g. 60 bars) for visualization
 */
export function extractWaveformData(buffer: AudioBuffer, points = 64): number[] {
  const channelData = buffer.getChannelData(0);
  const step = Math.floor(channelData.length / points);
  const peaks: number[] = [];

  for (let i = 0; i < points; i++) {
    const start = i * step;
    let max = 0;
    for (let j = 0; j < step; j++) {
      const val = Math.abs(channelData[start + j] || 0);
      if (val > max) max = val;
    }
    // Normalized value between 0.08 and 1.0 for pleasant visual bar height
    peaks.push(Math.max(0.08, Math.min(1.0, max)));
  }

  return peaks;
}
