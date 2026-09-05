// types.ts
export type MediaInput = Blob | HTMLCanvasElement | HTMLImageElement | AudioBuffer;

export interface MultimodalPart {
  type: 'text' | 'image' | 'audio';
  value?: string | MediaInput;
  base64Data?: string;
  mimeType?: string;
}

export interface CoreMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MultimodalPart[];
}

export interface SessionOptions {
  systemPrompt?: string;
  initialPrompts?: CoreMessage[];
  maxTokenBudget?: number;
  onContextOverflow?: (event: Event) => void;
}

// mediaUtils.ts
export async function mediaPartToBase64(part: MultimodalPart): Promise<MultimodalPart> {
  if (part.type === 'text' || typeof part.value === 'string') return part;

  const value = part.value as MediaInput;

  if (value instanceof HTMLCanvasElement) {
    return {
      type: 'image',
      mimeType: 'image/png',
      base64Data: value.toDataURL('image/png').split(',')[1],
    };
  }

  if (value instanceof Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve({
          type: part.type,
          mimeType: value.type || (part.type === 'image' ? 'image/png' : 'audio/wav'),
          base64Data: result.split(',')[1],
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(value);
    });
  }

  if (value instanceof AudioBuffer) {
    const wavBlob = audioBufferToWavBlob(value);
    return mediaPartToBase64({ type: 'audio', value: wavBlob });
  }

  return part;
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let channels: Float32Array[] = [], sample: number, offset = 0, pos = 0;

  function writeString(str: string) {
    for (let i = 0; i < str.length; i++) out.setUint8(pos++, str.charCodeAt(i));
  }
  function setUint16(data: number) { out.setUint16(pos, data, true); pos += 2; }
  function setUint32(data: number) { out.setUint32(pos, data, true); pos += 4; }

  writeString('RIFF'); setUint32(length - 8); writeString('WAVEfmt ');
  setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(buffer.sampleRate); setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2); setUint16(16); writeString('data');
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));
  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true); pos += 2;
    }
    offset++;
  }
  return new Blob([out.buffer], { type: 'audio/wav' });
}
