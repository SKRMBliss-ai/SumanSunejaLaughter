import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'hi' | 'es' | 'ar' | 'fr' | 'de' | 'ja';
export type FontSize = 'small' | 'normal' | 'large' | 'xl';

interface SettingsContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: {code: Language, label: string}[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'es', label: 'Español' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
];

const translations: Record<Language, Record<string, string>> = {
  en: {
    'home.welcome': 'Ignite Your Inner Joy',
    'home.subtitle': 'Boost immunity & relieve stress with expert guidance from Suman Suneja.',
    'home.test_laugh': 'Test Your Laugh',
    'nav.home': 'Home',
    'nav.videos': 'Videos',
    'nav.games': 'Games',
    'nav.coach': 'Coach',
    'nav.ask_ai': 'Ask Suman',
    'profile.title': 'Your Profile',
    'profile.subtitle': 'Customize your joy identity',
    'settings.dark_mode': 'Dark Mode',
    'settings.language': 'Language',
    'settings.font_size': 'Font Size',
    'streak': 'Day Streak',
    'points': 'Points',
    'level': 'Level',
    'today': 'Today',
    'save_changes': 'Save Changes',
    'sign_out': 'Sign Out',
    'daily_session': 'Daily Laughter Yoga',
    'join_session': 'Join Daily Session',
    'every_day': 'Every Day',
    'traditional_yoga': 'Traditional & Laughter Yoga',
    'join_yoga': 'Join Yoga Class',
    'mon_fri': 'Mon - Fri',
    'fun_games': 'Fun Games',
    'book_session': 'Book Session',
    'contact': 'Contact'
  },
  hi: {
    'home.welcome': 'अपनी आंतरिक खुशी को जगाएं',
    'home.subtitle': 'सुमन सुनेजा के मार्गदर्शन के साथ प्रतिरक्षा बढ़ाएं और तनाव दूर करें।',
    'home.test_laugh': 'हंसी की जांच करें',
    'nav.home': 'होम',
    'nav.videos': 'वीडियो',
    'nav.games': 'खेल',
    'nav.coach': 'कोच',
    'nav.ask_ai': 'सुमन से पूछें',
    'profile.title': 'आपकी प्रोफाइल',
    'profile.subtitle': 'अपनी पहचान को अनुकूलित करें',
    'settings.dark_mode': 'डार्क मोड',
    'settings.language': 'भाषा',
    'settings.font_size': 'फ़ॉन्ट आकार',
    'streak': 'स्ट्रीक',
    'points': 'अंक',
    'level': 'स्तर',
    'today': 'आज',
    'save_changes': 'सहेजें',
    'sign_out': 'साइन आउट',
    'daily_session': 'दैनिक हास्य योग',
    'join_session': 'शामिल हों',
    'every_day': 'हर दिन',
    'traditional_yoga': 'पारंपरिक और हास्य योग',
    'join_yoga': 'योग कक्षा',
    'mon_fri': 'सोम - शुक्र',
    'fun_games': 'मजेदार खेल',
    'book_session': 'सत्र बुक करें',
    'contact': 'संपर्क'
  },
  es: {
    'home.welcome': 'Enciende tu Alegría',
    'home.subtitle': 'Mejora la inmunidad y alivia el estrés con Suman Suneja.',
    'home.test_laugh': 'Prueba tu Risa',
    'nav.home': 'Inicio',
    'nav.videos': 'Videos',
    'nav.games': 'Juegos',
    'nav.coach': 'Entrenador',
    'nav.ask_ai': 'Pregunta Suman',
    'profile.title': 'Tu Perfil',
    'profile.subtitle': 'Personaliza tu identidad',
    'settings.dark_mode': 'Modo Oscuro',
    'settings.language': 'Idioma',
    'settings.font_size': 'Tamaño de letra',
    'streak': 'Racha',
    'points': 'Puntos',
    'level': 'Nivel',
    'today': 'Hoy',
    'save_changes': 'Guardar',
    'sign_out': 'Salir',
    'daily_session': 'Yoga de la Risa',
    'join_session': 'Unirse',
    'every_day': 'Diario',
    'traditional_yoga': 'Yoga Tradicional',
    'join_yoga': 'Unirse Clase',
    'mon_fri': 'Lun - Vie',
    'fun_games': 'Juegos',
    'book_session': 'Reservar',
    'contact': 'Contacto'
  },
  ar: {
    'home.welcome': 'أشعل فرحك الداخلي',
    'home.subtitle': 'عزز المناعة وخفف التوتر بتوجيه من خبيرة يوغا الضحك सुमन سونيجا.',
    'home.test_laugh': 'اختبر ضحكتك',
    'nav.home': 'الرئيسية',
    'nav.videos': 'فيديو',
    'nav.games': 'ألعاب',
    'nav.coach': 'مدرب',
    'nav.ask_ai': 'اسأل سومان',
    'profile.title': 'ملفك الشخصي',
    'profile.subtitle': 'خصص هويتك السعيدة',
    'settings.dark_mode': 'الوضع الليلي',
    'settings.language': 'اللغة',
    'settings.font_size': 'حجم الخط',
    'streak': 'أيام متتالية',
    'points': 'نقاط',
    'level': 'مستوى',
    'today': 'اليوم',
    'save_changes': 'حفظ التغييرات',
    'sign_out': 'تسجيل خروج',
    'daily_session': 'يوغا الضحك اليومية',
    'join_session': 'انضم للجلسة',
    'every_day': 'كل يوم',
    'traditional_yoga': 'يوغا تقليدية وضحك',
    'join_yoga': 'انضم لصف اليوغا',
    'mon_fri': 'اثنين - جمعة',
    'fun_games': 'ألعاب مرحة',
    'book_session': 'احجز جلسة',
    'contact': 'اتصل بنا'
  },
  fr: {
    'home.welcome': 'Allumez votre joie intérieure',
    'home.subtitle': 'Boostez l\'immunité et soulagez le stress avec les conseils d\'expert de Suman Suneja.',
    'home.test_laugh': 'Testez votre rire',
    'nav.home': 'Accueil',
    'nav.videos': 'Vidéos',
    'nav.games': 'Jeux',
    'nav.coach': 'Coach',
    'nav.ask_ai': 'Demander Suman',
    'profile.title': 'Votre Profil',
    'profile.subtitle': 'Personnalisez votre identité',
    'settings.dark_mode': 'Mode Sombre',
    'settings.language': 'Langue',
    'settings.font_size': 'Taille de la police',
    'streak': 'Série',
    'points': 'Points',
    'level': 'Niveau',
    'today': 'Aujourd\'hui',
    'save_changes': 'Sauvegarder',
    'sign_out': 'Déconnexion',
    'daily_session': 'Yoga du Rire Quotidien',
    'join_session': 'Rejoindre',
    'every_day': 'Chaque Jour',
    'traditional_yoga': 'Yoga Traditionnel',
    'join_yoga': 'Rejoindre le Cours',
    'mon_fri': 'Lun - Ven',
    'fun_games': 'Jeux Amusants',
    'book_session': 'Réserver',
    'contact': 'Contact'
  },
  de: {
    'home.welcome': 'Entfache deine innere Freude',
    'home.subtitle': 'Stärke dein Immunsystem und baue Stress ab mit Expertenrat von Suman Suneja.',
    'home.test_laugh': 'Teste dein Lachen',
    'nav.home': 'Start',
    'nav.videos': 'Videos',
    'nav.games': 'Spiele',
    'nav.coach': 'Coach',
    'nav.ask_ai': 'Frag Suman',
    'profile.title': 'Dein Profil',
    'profile.subtitle': 'Personalisiere deine Identität',
    'settings.dark_mode': 'Dunkelmodus',
    'settings.language': 'Sprache',
    'settings.font_size': 'Schriftgröße',
    'streak': 'Serie',
    'points': 'Punkte',
    'level': 'Level',
    'today': 'Heute',
    'save_changes': 'Speichern',
    'sign_out': 'Abmelden',
    'daily_session': 'Tägliches Lachyoga',
    'join_session': 'Beitreten',
    'every_day': 'Täglich',
    'traditional_yoga': 'Traditionelles Yoga',
    'join_yoga': 'Kurs beitreten',
    'mon_fri': 'Mo - Fr',
    'fun_games': 'Lustige Spiele',
    'book_session': 'Sitzung buchen',
    'contact': 'Kontakt'
  },
  ja: {
    'home.welcome': '内なる喜びを点火しよう',
    'home.subtitle': 'Suman Sunejaの専門的な指導で免疫力を高め、ストレスを解消しましょう。',
    'home.test_laugh': '笑いをテスト',
    'nav.home': 'ホーム',
    'nav.videos': '動画',
    'nav.games': 'ゲーム',
    'nav.coach': 'コーチ',
    'nav.ask_ai': 'Sumanに聞く',
    'profile.title': 'プロフィール',
    'profile.subtitle': '喜びのIDをカスタマイズ',
    'settings.dark_mode': 'ダークモード',
    'settings.language': '言語',
    'settings.font_size': '文字サイズ',
    'streak': '連続記録',
    'points': 'ポイント',
    'level': 'レベル',
    'today': '今日',
    'save_changes': '保存',
    'sign_out': 'ログアウト',
    'daily_session': '毎日のラフターヨガ',
    'join_session': '参加する',
    'every_day': '毎日',
    'traditional_yoga': '伝統的＆ラフターヨガ',
    'join_yoga': 'クラスに参加',
    'mon_fri': '月 - 金',
    'fun_games': '楽しいゲーム',
    'book_session': 'セッション予約',
    'contact': '連絡先'
  }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('app_theme') as Theme) || 'light');
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'en');
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('app_fontsize') as FontSize) || 'normal');
  const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr');

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('app_lang', language);
    document.documentElement.lang = language;
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    setDir(direction);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('app_fontsize', fontSize);
    const sizeMap = {
        small: '14px',
        normal: '16px',
        large: '19px',
        xl: '22px'
    };
    document.documentElement.style.fontSize = sizeMap[fontSize];
  }, [fontSize]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const t = (key: string) => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };

  return (
    <SettingsContext.Provider value={{ theme, toggleTheme, language, setLanguage, fontSize, setFontSize, t, dir }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};