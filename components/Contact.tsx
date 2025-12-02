import React from 'react';
import { Phone, Mail, Globe, Youtube, MessageCircle, Briefcase, Users, User, MapPin, Smile, Star, Heart, ArrowRight } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const Contact: React.FC = () => {
    const { currentTheme, colorTheme } = useSettings();
    const handleWhatsApp = () => {
        const text = encodeURIComponent("Hi Suman! I'm interested in Laughter Yoga and want to know more.");
        window.open(`https://wa.me/918217581238?text=${text}`, '_blank');
    };

    const handleEmail = () => {
        window.location.href = "mailto:Enquiry@sumansuneja.com?subject=Laughter%20Yoga%20Enquiry&body=Hi%20Suman%2C%20I%20would%20love%20to%20book%20a%20session.";
    };

    // Helper for card styles based on theme
    const getCardStyle = (type: 'primary' | 'secondary' | 'tertiary' | 'quaternary') => {
        if (colorTheme === 'pastel') {
            switch (type) {
                case 'primary': return "bg-[#E8DFF5] border-purple-100 text-[#5B5166]"; // Light Purple
                case 'secondary': return "bg-[#E0F2F1] border-teal-100 text-[#00695C]"; // Light Teal
                case 'tertiary': return "bg-[#FFF3E0] border-orange-100 text-orange-800"; // Light Orange
                case 'quaternary': return "bg-[#FCE4EC] border-pink-100 text-pink-800"; // Light Pink
            }
        } else {
            // Red Brick Theme: Uniform Cream/Red
            return "bg-[#FFF8F0] border-[#8B3A3A]/30 text-[#934139]";
        }
        return "";
    };

    return (
        <div className="p-4 space-y-8 pb-44 animate-in slide-in-from-bottom-4 duration-700">

            {/* Fun Header */}
            <div className="text-center space-y-2 mt-4 relative">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 ${currentTheme.HERO} rounded-full blur-3xl opacity-20 animate-pulse`}></div>
                <div className="relative inline-block">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg inline-block mb-2 animate-bounce-gentle">
                        <Smile className={`${currentTheme.TEXT_ACCENT} w-10 h-10 fill-[#EDE8F8] dark:fill-slate-700`} />
                    </div>
                    <h2 className={`text-4xl font-fredoka font-bold ${currentTheme.TEXT_PRIMARY} dark:text-gray-100 leading-tight`}>
                        Let's Make <br />
                        <span className={`text-transparent bg-clip-text bg-gradient-to-r ${colorTheme === 'pastel' ? 'from-purple-400 to-pink-400' : 'from-[#8B3A3A] to-[#B85C5C]'}`}>Magic Happen!</span>
                    </h2>
                </div>
                <p className={`${currentTheme.TEXT_PRIMARY} font-medium text-sm max-w-xs mx-auto`}>
                    Booking a session is the first step to a happier, healthier life.
                </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 gap-4">
                {/* WhatsApp Button */}
                <button
                    onClick={handleWhatsApp}
                    className={`group relative overflow-hidden p-6 rounded-3xl shadow-xl flex items-center justify-between transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95 border-2
                        ${colorTheme === 'pastel'
                            ? 'bg-[#E0F2F1] border-[#B2DFDB] text-[#00695C] hover:bg-[#B2DFDB]'
                            : 'bg-[#FFF8F0] border-[#8B3A3A] text-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-white'
                        }`}
                >
                    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500 ${colorTheme === 'pastel' ? 'bg-white/40' : 'bg-white/10'}`}></div>
                    <div className="flex items-center gap-4 z-10">
                        <div className={`p-3 rounded-2xl shadow-sm ${colorTheme === 'pastel' ? 'bg-white text-[#00695C]' : 'bg-[#8B3A3A]/10 text-[#8B3A3A] group-hover:bg-white group-hover:text-[#8B3A3A]'}`}>
                            <MessageCircle size={28} fill="currentColor" strokeWidth={1.5} />
                        </div>
                        <div className="text-left">
                            <span className="block font-black text-xl tracking-tight">WhatsApp Us</span>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Instant Reply</span>
                        </div>
                    </div>
                    <div className={`z-10 p-2 rounded-full shadow-sm ${colorTheme === 'pastel' ? 'bg-white text-[#00695C]' : 'bg-[#8B3A3A]/10 text-[#8B3A3A] group-hover:bg-white group-hover:text-[#8B3A3A]'}`}>
                        <ArrowRight size={20} />
                    </div>
                </button>

                {/* Email Button */}
                <button
                    onClick={handleEmail}
                    className={`group relative overflow-hidden p-6 rounded-3xl shadow-lg flex items-center justify-between transition-all border-2 active:scale-95
                         ${colorTheme === 'pastel'
                            ? 'bg-white border-[#E8DFF5] text-[#5B5166] hover:border-[#C3B8D5]'
                            : 'bg-white border-[#8B3A3A]/20 text-[#934139] hover:border-[#8B3A3A]'
                        }`}
                >
                    <div className="flex items-center gap-4 z-10">
                        <div className={`p-3 rounded-2xl transition-colors ${colorTheme === 'pastel' ? 'bg-[#F3E5F5] text-[#9B86BD]' : 'bg-[#FFF8F0] text-[#8B3A3A] group-hover:bg-[#8B3A3A] group-hover:text-white'}`}>
                            <Mail size={28} strokeWidth={2} />
                        </div>
                        <div className="text-left">
                            <span className="block font-black text-xl tracking-tight">Send Email</span>
                            <span className="text-xs font-bold uppercase tracking-wider opacity-70">For Enquiries</span>
                        </div>
                    </div>
                </button>
            </div>

            {/* Offerings Grid */}
            <div>
                <div className="flex items-center gap-2 mb-4 px-2">
                    <Star className={`${currentTheme.TEXT_ACCENT} fill-current animate-spin-slow`} size={18} />
                    <h3 className={`font-bold ${currentTheme.TEXT_PRIMARY} uppercase tracking-widest text-xs`}>What we offer</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 rounded-2xl border ${getCardStyle('primary')}`}>
                        <User className="mb-2 opacity-80" size={24} />
                        <div className="font-bold">1-on-1</div>
                        <div className="text-xs font-medium opacity-70">Personal Coaching</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${getCardStyle('secondary')}`}>
                        <Briefcase className="mb-2 opacity-80" size={24} />
                        <div className="font-bold">Corporate</div>
                        <div className="text-xs font-medium opacity-70">Stress Relief</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${getCardStyle('tertiary')}`}>
                        <Users className="mb-2 opacity-80" size={24} />
                        <div className="font-bold">Groups</div>
                        <div className="text-xs font-medium opacity-70">Workshops</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${getCardStyle('quaternary')}`}>
                        <Heart className="mb-2 opacity-80" size={24} />
                        <div className="font-bold">Retreats</div>
                        <div className="text-xs font-medium opacity-70">Wellness Days</div>
                    </div>
                </div>
            </div>

            {/* Social Links Stack */}
            <div className="space-y-3">
                <a
                    href="https://www.youtube.com/@sumansunejaofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-4 border p-1.5 pr-4 pl-1.5 rounded-full shadow-lg transition-all group hover:-translate-y-0.5
                        ${colorTheme === 'pastel'
                            ? 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'
                            : 'bg-[#FFF8F0] text-[#8B3A3A] border-[#8B3A3A]/30 hover:border-[#8B3A3A]'
                        }`}
                >
                    <div className={`p-3 rounded-full shadow-md ${colorTheme === 'pastel' ? 'bg-white text-[#C62828]' : 'bg-[#8B3A3A] text-white'}`}>
                        <Youtube size={20} fill="currentColor" />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-bold">Watch on YouTube</div>
                    </div>
                    <div className={`text-[10px] font-bold px-3 py-1 rounded-md uppercase transition-colors border
                        ${colorTheme === 'pastel'
                            ? 'bg-white text-[#C62828] border-red-200 group-hover:bg-[#EF5350] group-hover:text-white'
                            : 'bg-white text-[#8B3A3A] border-[#8B3A3A] group-hover:bg-[#8B3A3A] group-hover:text-white'
                        }`}>Subscribe</div>
                </a>

                <a
                    href="https://sumansuneja.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 ${currentTheme.TEXT_PRIMARY} text-sm font-bold hover:opacity-80 transition-colors py-2`}
                >
                    <Globe size={16} /> Visit Official Website
                </a>
            </div>

            {/* Mascot Footer */}
            <div className="flex flex-col items-center justify-center pt-4 opacity-80">
                <div className="w-24 h-24 rounded-full overflow-hidden shadow-md border-4 border-white dark:border-slate-700 animate-[bounce-gentle_4s_infinite] mb-4">
                    <img
                        src="https://sumansuneja.com/wp-content/uploads/2025/03/icon-mascot-suman-suneja.svg"
                        alt="Suman Suneja"
                        className={`w-full h-full object-contain p-2 ${currentTheme.ICON_BG} dark:bg-slate-800`}
                    />
                </div>
                <p className={`text-xs ${currentTheme.TEXT_PRIMARY} dark:text-slate-500 font-bold tracking-wide`}>
                    App Developed by <a href="http://skrmblissai.in/" target="_blank" rel="noopener noreferrer" className={`${currentTheme.TEXT_ACCENT} hover:underline`}>SKRMBliss.ai Studio</a>
                </p>
            </div>
        </div>
    );
};