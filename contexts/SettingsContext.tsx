import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'hi' | 'es' | 'ar' | 'fr' | 'de' | 'ja';
export type Theme = 'light' | 'dark';
export type ColorTheme = 'red_brick' | 'pastel';
export type FontSize = 'small' | 'normal' | 'large' | 'xl';

export const SUPPORTED_LANGUAGES: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'es', label: 'Español' },
    { code: 'ar', label: 'العربية' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'ja', label: '日本語' },
];

interface SettingsContextType {
    theme: Theme;
    toggleTheme: () => void;
    colorTheme: ColorTheme;
    setColorTheme: (theme: ColorTheme) => void;
    currentTheme: ThemeColors;
    language: Language;
    setLanguage: (lang: Language) => void;
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
    t: (key: string) => string;
    dir: 'ltr' | 'rtl';
}

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
        'settings.title': 'Settings',
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
        'contact': 'Contact',
        'contact.header_title': "Let's Make Magic Happen!",
        'contact.header_subtitle': "Booking a session is the first step to a happier, healthier life.",
        'contact.whatsapp_btn': "WhatsApp Us",
        'contact.instant_reply': "Instant Reply",
        'contact.email_btn': "Send Email",
        'contact.for_enquiries': "For Enquiries",
        'contact.offerings_title': "What we offer",
        'contact.offering_1_title': "1-on-1",
        'contact.offering_1_desc': "Personal Coaching",
        'contact.offering_2_title': "Corporate",
        'contact.offering_2_desc': "Stress Relief",
        'contact.offering_3_title': "Groups",
        'contact.offering_3_desc': "Workshops",
        'contact.offering_4_title': "Retreats",
        'contact.offering_4_desc': "Wellness Days",
        'contact.youtube_btn': "Watch on YouTube",
        'contact.subscribe': "Subscribe",
        'contact.website_btn': "Visit Official Website",
        'app.developed_by': "App Developed by",
        'profile.display_name': "Display Name",
        'profile.enter_name_placeholder': "Enter your name",
        'profile.phone_number': "Phone Number",
        'profile.no_number': "No number linked",
        'profile.streak_power': "STREAK POWER",
        'profile.streak_power_description': "Keep your laughter streak alive to unlock exclusive badges and premium content!",
        'profile.start_today': "Start today!",
        'profile.bonus': "Bonus",
        'profile.personal_info': "Personal Info",
        'profile.edit_button': "Edit",
        'profile.link_button': "Link",
        'games.title': "AI Laughter Lab",
        'games.subtitle_jokes': "One-Liner Joke Generator",
        'games.subtitle_joy': "Experimental Joy Generator",
        'games.tab_story': "Story",
        'games.tab_jokes': "Jokes",
        'games.tab_moods': "Moods",
        'games.speaking': "Speaking...",
        'games.writing_joke': "Writing a zinger...",
        'games.brewing_laughter': "Brewing Laughter...",
        'games.funny_mode': "Funny Mode",
        'games.ai_mode': "AI Mode",
        'games.play_real_laughter': "Play Real Laughter",
        'games.offline_voice': "Offline Voice",
        'games.input_placeholder_story': "Situation (e.g. Missed Alarm)",
        'games.input_placeholder_joke': "Topic (e.g. Cats, Boss, Coffee)",
        'games.input_placeholder_mood': "Select a mood to hear different laughter styles.",
        'games.btn_joke': "Tell Me a Joke & Laugh!",
        'games.btn_story': "Generate Joy Story",
        'games.stop_audio': "Stop Audio",
        'games.mood_giggle': "Giggle Fit",
        'games.mood_belly': "Belly Laugh",
        'games.mood_snort': "Snort Laugh",
        'games.mood_cackle': "Witchy Cackle",
        'video.title': 'Video Library',
        'video.visit_channel': 'Visit Official Channel',
        'video.count_suffix': 'Videos',
        'video.tab_all': 'All Videos',
        'video.tab_favorites': 'Favorites',
        'video.tab_offline': 'Offline',
        'video.search_placeholder': 'Search videos...',
        'video.filter_all': 'All',
        'video.no_videos': 'No videos found',
        'video.now_playing': 'Now Playing',
        'video.open_app': 'Open in App',
        'video.save_offline': 'Save Offline',
        'video.saving': 'Saving...',
        'video.saved': 'Saved',
        'video.remove_confirm': 'Remove from offline library?',
        'video.saved_toast': 'Offline Video Saved',
        'video.started_toast': 'Video Session Started',
        'video.page': 'Page',
        'video.of': 'of',
        'video.category_events': 'Events',
        'video.category_corporate': 'Corporate',
        'video.category_health': 'Health',
        'video.category_exercises': 'Exercises',
        'video.category_fun': 'Fun',
        'video.category_morning': 'Morning',
        'video.category_meditation': 'Meditation',
        'video.category_stress_relief': 'Stress Relief',
        'video.category_daily': 'Daily',
        'video.category_sessions': 'Sessions',
        'video.category_seniors': 'Seniors',
        'coach.title': 'Laughter Coach',
        'coach.subtitle': 'Laugh loudly to get your happiness score!',
        'coach.how_was_it': 'How was it?',
        'coach.help_improve': 'Help Suman AI improve!',
        'coach.skip_feedback': 'Skip Feedback',
        'coach.start_live': 'Start Live Session',
        'coach.interactive': 'Interactive Conversation',
        'coach.quick_laugh': 'Quick 1-Min Laugh',
        'coach.guided_boost': 'Guided Energy Boost',
        'coach.analyzing': 'Analyzing Joy...',
        'coach.api_missing': 'Gemini API Key Missing!',
        'coach.offline_fallback': 'Falling back to offline mode',
        'coach.joy_score': 'Joy Score',
        'coach.ai_listening': 'AI Listening...',
        'coach.listen_laugh': 'Listen & Laugh',
        'coach.listening': 'Listening...',
        'coach.ready': 'Ready',
        'coach.rate_my_laugh': 'Rate My Laugh',
        'coach.stop_rate': 'Stop & Rate',
        'coach.energy': 'Energy',
        'coach.play_again': 'Play Again',
        'coach.offline_voice': 'Using Offline Voice (Connection Issue)',
        'coach.laughter_log': 'Laughter Log',
        'coach.clear': 'Clear',
        'coach.clear_confirm': 'Are you sure you want to clear your laughter log?',
        'coach.thanks_feedback': 'Thanks for Feedback!',
        'coach.session_completed': 'Session Completed',
        'coach.laughter_analyzed': 'Laughter Analyzed',
        'coach.mic_permission': 'Please allow microphone access to use the Coach!',
        'coach.analyze_error': "Couldn't analyze the laughter. Try again!",
        'coach.session_error': 'Unable to start session.',
        'coach.connection_lost': 'Connection lost.',
        'coach.live_unavailable': 'API Key missing. Live session unavailable.',
        'coach.close': 'Close',
        'coach.try_again': 'Try Again',
        'coach.history': 'History',
        'coach.clear_history': 'Clear History',
        'coach.no_history': 'No history yet. Start laughing!',
    },
    hi: {}, es: {}, ar: {}, fr: {}, de: {}, ja: {}
};

export interface ThemeColors {
    HERO: string;
    HERO_BUTTON: string;
    BUTTON: string;
    BUTTON_SECONDARY: string;
    GAMES: string;
    GAMES_ICON_BG: string;
    BOOK: string;
    BOOK_ICON_BG: string;
    TEXT_PRIMARY: string;
    ICON_BG: string;
    ICON_COLOR: string;
    STAT_BG_1: string;
    STAT_ICON_BG_1: string;
    STAT_BG_2: string;
    STAT_ICON_BG_2: string;
    LIVE_CARD_BG: string;
    LIVE_BTN: string;
    HEADER_BG: string;
    HEADER_TEXT: string;
    HEADER_BORDER: string;
    SUBSCRIBE_BTN: string;
    MUSIC_BTN: string;
    MUSIC_BTN_ACTIVE: string;
    MUSIC_ICON: string;
    MIC_BTN: string;
    MIC_RIPPLE: string;
    VIDEO_BG: string;
    INPUT_RING: string;
    LOADING_SPINNER: string;
    TEXT_ACCENT: string;
    VIDEO_RING_1: string;
    VIDEO_RING_2: string;
    VIDEO_BORDER: string;
    APP_BG: string;
    SESSION_1_BG: string;
    SESSION_1_ACCENT: string;
    SESSION_2_BG: string;
    SESSION_2_ACCENT: string;
}

export const THEMES: Record<ColorTheme, ThemeColors> = {
    pastel: {
        HERO: "bg-[linear-gradient(to_right,#C2B2D6,#99A9C9)]",
        HERO_BUTTON: "bg-white text-[#7A8C99] shadow-sm hover:bg-gray-50 border-none",
        BUTTON: "bg-[#A8C8C0] text-white shadow-sm hover:brightness-105 border-none",
        BUTTON_SECONDARY: "bg-[#C0B8D0] text-white shadow-sm hover:brightness-105 border-none",
        GAMES: "bg-[#F3E5F5] text-[#5B5166] border-none shadow-sm hover:shadow-md",
        GAMES_ICON_BG: "bg-[#CE93D8] text-white p-3 rounded-full mb-1",
        BOOK: "bg-[#E0F2F1] text-[#00695C] border-none shadow-sm hover:shadow-md",
        BOOK_ICON_BG: "bg-[#80CBC4] text-white p-3 rounded-full mb-1",
        TEXT_PRIMARY: "text-[#5B5166]",
        ICON_BG: "bg-[#E8DFF5]",
        ICON_COLOR: "text-[#9B86BD]",
        STAT_BG_1: "bg-[#FFF0E0] border border-orange-100",
        STAT_ICON_BG_1: "bg-white text-orange-400",
        STAT_BG_2: "bg-[#F0F0FF] border border-purple-100",
        STAT_ICON_BG_2: "bg-white text-purple-400",
        LIVE_CARD_BG: "bg-white border-2 border-purple-100",
        LIVE_BTN: "bg-[#A8C8C0] text-white hover:brightness-105 shadow-md",

        HEADER_BG: "bg-[#F7F9FC]",
        HEADER_TEXT: "text-[#5B5166]",
        HEADER_BORDER: "border-[#B8B8D0]/20",

        // Pastel: Default is purple/grey button with white text
        SUBSCRIBE_BTN: "bg-[#C0B8D0] hover:bg-[#B0A8C0] text-white",

        MUSIC_BTN: "bg-white border-[#EDE8F8] text-[#C3B8D5] hover:border-[#A8C8C0] hover:text-[#A8C8C0]",
        MUSIC_BTN_ACTIVE: "bg-[#A8C8C0] border-white text-white",
        MUSIC_ICON: "text-[#A8C8C0]",
        MIC_BTN: "bg-[#C0B8D0] text-white hover:scale-110",
        MIC_RIPPLE: "bg-[#C0B8D0]/30",
        VIDEO_BG: "bg-[#F7F9FC]",
        INPUT_RING: "focus:ring-[#A8C8C0]",
        LOADING_SPINNER: "border-[#A8C8C0]",
        TEXT_ACCENT: "text-[#A8C8C0]",
        VIDEO_RING_1: "bg-[#C0B8D0]/20",
        VIDEO_RING_2: "bg-[#C0B8D0]/40",
        VIDEO_BORDER: "border-[#C0B8D0]/50",
        APP_BG: "bg-[#F7F9FC]",
        SESSION_1_BG: "bg-[#E0F7FA]",
        SESSION_1_ACCENT: "text-[#006064]",
        SESSION_2_BG: "bg-[#F3E5F5]",
        SESSION_2_ACCENT: "text-[#4A148C]"
    },
    red_brick: {
        HERO: "bg-[linear-gradient(110deg,#592E2E_0%,#8C4A4A_50%,#592E2E_100%)]",
        HERO_BUTTON: "bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] hover:border-[#FFF8F0] shadow-lg transition-colors",
        BUTTON: "bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] hover:border-[#FFF8F0] shadow-md transition-colors",
        BUTTON_SECONDARY: "bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] hover:border-[#FFF8F0] shadow-md transition-colors",
        GAMES: "bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] hover:border-[#FFF8F0] transition-colors",
        GAMES_ICON_BG: "text-[#8B3A3A] group-hover:text-[#FFF8F0] mb-1",
        BOOK: "bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] hover:border-[#FFF8F0] transition-colors",
        BOOK_ICON_BG: "text-[#8B3A3A] group-hover:text-[#FFF8F0] mb-1",
        TEXT_PRIMARY: "text-[#934139]",
        ICON_BG: "bg-pink-100",
        ICON_COLOR: "text-pink-500",
        STAT_BG_1: "bg-[#FFF8F0] border border-orange-100",
        STAT_ICON_BG_1: "bg-white text-orange-500",
        STAT_BG_2: "bg-[#F8F0FF] border border-purple-100",
        STAT_ICON_BG_2: "bg-white text-purple-500",
        LIVE_CARD_BG: "bg-white/70 backdrop-blur-xl border-2 border-purple-300/50",
        LIVE_BTN: "bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] hover:border-[#FFF8F0] shadow-lg transition-colors",

        HEADER_BG: "bg-[#FEF4E6]",
        HEADER_TEXT: "text-[#783766]",
        HEADER_BORDER: "border-[#783766]/10",

        // UPDATED: Text is Brick Red by default, White on Hover
        SUBSCRIBE_BTN: "bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] hover:border-[#FFF8F0] transition-colors",

        MUSIC_BTN: "bg-white border-[#EDE8F8] text-[#C3B8D5] hover:border-[#8B3A3A] hover:text-[#8B3A3A]",
        MUSIC_BTN_ACTIVE: "bg-[#8B3A3A] border-white text-white",
        MUSIC_ICON: "text-[#8B3A3A]",
        MIC_BTN: "bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] hover:border-[#FFF8F0] transition-colors hover:scale-110",
        MIC_RIPPLE: "bg-[#8B3A3A]/30",
        VIDEO_BG: "bg-[#FEF4E6]",
        INPUT_RING: "focus:ring-[#8B3A3A]",
        LOADING_SPINNER: "border-[#8B3A3A]",
        TEXT_ACCENT: "text-[#8B3A3A]",
        VIDEO_RING_1: "bg-[#8B3A3A]/20",
        VIDEO_RING_2: "bg-[#8B3A3A]/40",
        VIDEO_BORDER: "border-[#8B3A3A]/50",
        APP_BG: "bg-[#FFF8F0]",
        SESSION_1_BG: "bg-pink-50",
        SESSION_1_ACCENT: "text-pink-500",
        SESSION_2_BG: "bg-violet-50",
        SESSION_2_ACCENT: "text-violet-500"
    }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('app_theme') as Theme) || 'light');
    const [colorTheme, setColorTheme] = useState<ColorTheme>(() => (localStorage.getItem('app_color_theme') as ColorTheme) || 'red_brick');
    const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'en');
    const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('app_fontsize') as FontSize) || 'normal');
    const [dir, setDir] = useState<'ltr' | 'rtl'>('ltr');

    const currentTheme = THEMES[colorTheme] || THEMES.red_brick;

    useEffect(() => {
        localStorage.setItem('app_theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('app_color_theme', colorTheme);
    }, [colorTheme]);

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
        <SettingsContext.Provider value={{ theme, toggleTheme, colorTheme, setColorTheme, currentTheme, language, setLanguage, fontSize, setFontSize, t, dir }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within SettingsProvider');
    return context;
};