export interface AudioClip {
  id: string;
  originalText: string;
  kannadaText: string;
  transliteration: string;
  literalMeaning?: string;
  voiceName: 'Kore' | 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr';
  tone: 'natural' | 'formal' | 'warm' | 'storytelling';
  pitch: number; // in semitones: -12 to +12
  speed: number; // multiplier: 0.5 to 2.0
  sampleRate: number;
  duration: number; // in seconds
  audioBase64: string;
  mimeType: string;
  createdAt: number;
}

export interface VoiceOption {
  id: 'Kore' | 'Puck' | 'Fenrir' | 'Charon' | 'Zephyr';
  name: string;
  gender: string;
  tone: string;
  description: string;
  recommendedFor: string;
}

export interface PresetPhrase {
  title: string;
  category: 'Everyday' | 'Travel & Auto' | 'Hospitality & Food' | 'Formal & Work' | 'Festive';
  english: string;
  kannadaHint?: string;
}
