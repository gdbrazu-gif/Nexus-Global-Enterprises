import { LanguageCode } from '../types';

export interface LanguageMeta {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  region: 'Global / Americas' | 'Middle East & North Africa' | 'South & Central Asia' | 'East & Southeast Asia' | 'Europe' | 'Sub-Saharan Africa';
}

export const ALL_SUPPORTED_LANGUAGES: LanguageMeta[] = [
  // Global & English
  {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    flag: '🇬🇧',
    dir: 'ltr',
    region: 'Global / Americas',
  },
  // Middle East & North Africa (MENA)
  {
    code: 'ar',
    nativeName: 'العربية',
    englishName: 'Arabic',
    flag: '🇸🇦',
    dir: 'rtl',
    region: 'Middle East & North Africa',
  },
  {
    code: 'fa',
    nativeName: 'فارسی',
    englishName: 'Persian / Farsi',
    flag: '🇮🇷',
    dir: 'rtl',
    region: 'Middle East & North Africa',
  },
  {
    code: 'he',
    nativeName: 'עברית',
    englishName: 'Hebrew',
    flag: '🇮🇱',
    dir: 'rtl',
    region: 'Middle East & North Africa',
  },
  {
    code: 'tr',
    nativeName: 'Türkçe',
    englishName: 'Turkish',
    flag: '🇹🇷',
    dir: 'ltr',
    region: 'Middle East & North Africa',
  },
  // South & Central Asia
  {
    code: 'ur',
    nativeName: 'اردو',
    englishName: 'Urdu',
    flag: '🇵🇰',
    dir: 'rtl',
    region: 'South & Central Asia',
  },
  {
    code: 'hi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    flag: '🇮🇳',
    dir: 'ltr',
    region: 'South & Central Asia',
  },
  {
    code: 'bn',
    nativeName: 'বাংলা',
    englishName: 'Bengali',
    flag: '🇧🇩',
    dir: 'ltr',
    region: 'South & Central Asia',
  },
  // East & Southeast Asia
  {
    code: 'zh',
    nativeName: '简体中文',
    englishName: 'Chinese (Simplified)',
    flag: '🇨🇳',
    dir: 'ltr',
    region: 'East & Southeast Asia',
  },
  {
    code: 'ja',
    nativeName: '日本語',
    englishName: 'Japanese',
    flag: '🇯🇵',
    dir: 'ltr',
    region: 'East & Southeast Asia',
  },
  {
    code: 'ko',
    nativeName: '한국어',
    englishName: 'Korean',
    flag: '🇰🇷',
    dir: 'ltr',
    region: 'East & Southeast Asia',
  },
  {
    code: 'id',
    nativeName: 'Bahasa Indonesia',
    englishName: 'Indonesian',
    flag: '🇮🇩',
    dir: 'ltr',
    region: 'East & Southeast Asia',
  },
  {
    code: 'ms',
    nativeName: 'Bahasa Melayu',
    englishName: 'Malay',
    flag: '🇲🇾',
    dir: 'ltr',
    region: 'East & Southeast Asia',
  },
  {
    code: 'tl',
    nativeName: 'Filipino',
    englishName: 'Tagalog / Filipino',
    flag: '🇵🇭',
    dir: 'ltr',
    region: 'East & Southeast Asia',
  },
  {
    code: 'vi',
    nativeName: 'Tiếng Việt',
    englishName: 'Vietnamese',
    flag: '🇻🇳',
    dir: 'ltr',
    region: 'East & Southeast Asia',
  },
  {
    code: 'th',
    nativeName: 'ไทย',
    englishName: 'Thai',
    flag: '🇹🇭',
    dir: 'ltr',
    region: 'East & Southeast Asia',
  },
  // Europe & Americas
  {
    code: 'fr',
    nativeName: 'Français',
    englishName: 'French',
    flag: '🇫🇷',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'es',
    nativeName: 'Español',
    englishName: 'Spanish',
    flag: '🇪🇸',
    dir: 'ltr',
    region: 'Global / Americas',
  },
  {
    code: 'de',
    nativeName: 'Deutsch',
    englishName: 'German',
    flag: '🇩🇪',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'it',
    nativeName: 'Italiano',
    englishName: 'Italian',
    flag: '🇮🇹',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'pt',
    nativeName: 'Português',
    englishName: 'Portuguese',
    flag: '🇵🇹',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'ru',
    nativeName: 'Русский',
    englishName: 'Russian',
    flag: '🇷🇺',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'uk',
    nativeName: 'Українська',
    englishName: 'Ukrainian',
    flag: '🇺🇦',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'nl',
    nativeName: 'Nederlands',
    englishName: 'Dutch',
    flag: '🇳🇱',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'pl',
    nativeName: 'Polski',
    englishName: 'Polish',
    flag: '🇵🇱',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'sv',
    nativeName: 'Svenska',
    englishName: 'Swedish',
    flag: '🇸🇪',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'el',
    nativeName: 'Ελληνικά',
    englishName: 'Greek',
    flag: '🇬🇷',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'cs',
    nativeName: 'Čeština',
    englishName: 'Czech',
    flag: '🇨🇿',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'ro',
    nativeName: 'Română',
    englishName: 'Romanian',
    flag: '🇷🇴',
    dir: 'ltr',
    region: 'Europe',
  },
  {
    code: 'hu',
    nativeName: 'Magyar',
    englishName: 'Hungarian',
    flag: '🇭🇺',
    dir: 'ltr',
    region: 'Europe',
  },
  // Sub-Saharan Africa
  {
    code: 'sw',
    nativeName: 'Kiswahili',
    englishName: 'Swahili',
    flag: '🇰🇪',
    dir: 'ltr',
    region: 'Sub-Saharan Africa',
  },
];

export const RTL_LANGUAGES: LanguageCode[] = ['ar', 'ur', 'fa', 'he'];

export const isLanguageRTL = (lang: LanguageCode): boolean => {
  return RTL_LANGUAGES.includes(lang);
};
