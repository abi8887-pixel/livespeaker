import { PresetPhrase, VoiceOption } from '../types';

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore (ಕೋರೆ)',
    gender: 'Female',
    tone: 'Warm & Natural',
    description: 'Balanced, melodic, and authentic everyday conversational cadence.',
    recommendedFor: 'Storytelling, conversational greetings, warm dialogues',
  },
  {
    id: 'Puck',
    name: 'Puck (ಪಕ್)',
    gender: 'Male',
    tone: 'Crisp & Dynamic',
    description: 'Energetic, modern, and distinct articulation with clear rhythm.',
    recommendedFor: 'Announcements, travel guides, podcasts, modern dialogue',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (ಫೆನ್ರಿರ್)',
    gender: 'Male',
    tone: 'Resonant & Authoritative',
    description: 'Deep, rich, and confident timbre with impressive low-end presence.',
    recommendedFor: 'Documentaries, formal addresses, grand narrations',
  },
  {
    id: 'Charon',
    name: 'Charon (ಕಾರನ್)',
    gender: 'Male',
    tone: 'Calm & Measured',
    description: 'Soft, relaxing, and introspective voice with smooth pacing.',
    recommendedFor: 'Audiobooks, guided meditation, introspective stories',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr (ಜೆಫಿರ್)',
    gender: 'Female',
    tone: 'Bright & Professional',
    description: 'Clear, modern, and engaging voice with studio-grade polish.',
    recommendedFor: 'Tutorials, customer service, business presentations',
  },
];

export const PRESET_PHRASES: PresetPhrase[] = [
  {
    title: 'Warm Welcome & Health',
    category: 'Everyday',
    english: 'Hello, how are you? Is everything going well with you and your family?',
    kannadaHint: 'ನಮಸ್ಕಾರ, ಹೇಗಿದ್ದೀರಾ? ಮನೆಯಲ್ಲಿ ಎಲ್ಲರೂ ಕ್ಷೇಮವೇ?',
  },
  {
    title: 'Bangalore Auto Commute',
    category: 'Travel & Auto',
    english: 'Brother, will you go to Indiranagar Metro Station? Please turn on the meter.',
    kannadaHint: 'ಅಣ್ಣಾ, ಇಂದಿರಾನಗರ ಮೆಟ್ರೋ ಸ್ಟೇಷನ್‌ಗೆ ಬರ್ತೀರಾ? ದಯವಿಟ್ಟು ಮೀಟರ್ ಹಾಕಿ.',
  },
  {
    title: 'Breakfast & Filter Coffee',
    category: 'Hospitality & Food',
    english: 'Please bring one crispy Masala Dosa with coconut chutney and one strong Filter Coffee.',
    kannadaHint: 'ಒಂದು ಗರಿಗರಿ ಮಸಾಲೆ ದೋಸೆ ಜೊತೆ ಕಾಯಿ ಚಟ್ನಿ, ಮತ್ತೆ ಒಂದು ಸ್ಟ್ರಾಂಗ್ ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡಿ.',
  },
  {
    title: 'Formal Meeting & Thanks',
    category: 'Formal & Work',
    english: 'Thank you very much for your valuable time and participation in today’s meeting.',
    kannadaHint: 'ಇಂದಿನ ಸಭೆಯಲ್ಲಿ ಭಾಗವಹಿಸಿ ತಮ್ಮ ಅಮೂಲ್ಯವಾದ ಸಮಯ ನೀಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು.',
  },
  {
    title: 'Karnataka Rajyotsava Wishes',
    category: 'Festive',
    english: 'Hearty wishes on Kannada Rajyotsava! May our beautiful Kannada language and culture flourish forever.',
    kannadaHint: 'ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವದ ಹಾರ್ದಿಕ ಶುಭಾಶಯಗಳು! ಸಿರಿಗನ್ನಡಂ ಗೆಲ್ಗೆ, ಸಿರಿಗನ್ನಡಂ ಬಾಳ್ಗೆ.',
  },
  {
    title: 'Ugadi Festival Blessing',
    category: 'Festive',
    english: 'Happy Ugadi to you! May this New Year bring you immense joy, good health, and success.',
    kannadaHint: 'ಯುಗಾದಿ ಹಬ್ಬದ ಹಾರ್ದಿಕ ಶುಭಾಶಯಗಳು! ಈ ಹೊಸ ವರ್ಷವು ನಿಮಗೆ ಸುಖ, ಶಾಂತಿ ಮತ್ತು ಸಮೃದ್ಧಿಯನ್ನು ತರಲಿ.',
  },
  {
    title: 'Asking for Directions',
    category: 'Travel & Auto',
    english: 'Excuse me, which road should I take to reach Vidhana Soudha?',
    kannadaHint: 'ಕ್ಷಮಿಸಿ, ವಿಧಾನ ಸೌಧಕ್ಕೆ ಹೋಗಲು ಯಾವ ರಸ್ತೆ ಹಿಡಿಯಬೇಕು?',
  },
];
