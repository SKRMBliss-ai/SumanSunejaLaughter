import React from 'react';
import { Phone, Mail, Globe, Youtube, MessageCircle, Briefcase, Users, User, MapPin, Smile, Star, Heart, ArrowRight } from 'lucide-react';

export const Contact: React.FC = () => {
  const handleWhatsApp = () => {
    const text = encodeURIComponent("Hi Suman! I'm interested in Laughter Yoga and want to know more.");
    window.open(`https://wa.me/918217581238?text=${text}`, '_blank');
  };

  const handleEmail = () => {
    window.location.href = "mailto:Enquiry@sumansuneja.com?subject=Laughter%20Yoga%20Enquiry&body=Hi%20Suman%2C%20I%20would%20love%20to%20book%20a%20session.";
  };

  return (
    <div className="p-4 space-y-8 pb-44 animate-in slide-in-from-bottom-4 duration-700">
      
      {/* Fun Header */}
      <div className="text-center space-y-2 mt-4 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#C3B8D5] rounded-full blur-3xl opacity-20 animate-pulse"></div>
        <div className="relative inline-block">
           <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg inline-block mb-2 animate-bounce-gentle">
              <Smile className="text-[#ABCEC9] w-10 h-10 fill-[#EDE8F8] dark:fill-slate-700" />
           </div>
           <h2 className="text-4xl font-fredoka font-bold text-gray-700 dark:text-gray-100 leading-tight">
             Let's Make <br/>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ABCEC9] to-[#C3B8D5]">Magic Happen!</span>
           </h2>
        </div>
        <p className="text-[#AABBCC] font-medium text-sm max-w-xs mx-auto">
          Booking a session is the first step to a happier, healthier life.
        </p>
      </div>

      {/* Primary Action Buttons (Big & Tappable) */}
      <div className="grid grid-cols-1 gap-4">
        {/* Pastel WhatsApp Button - Softer Green */}
        <button 
          onClick={handleWhatsApp}
          className="group relative overflow-hidden bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-2 border-green-200 dark:border-green-800 p-6 rounded-3xl shadow-xl shadow-green-100/50 dark:shadow-none flex items-center justify-between transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95 hover:bg-green-200 dark:hover:bg-green-900/60"
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/40 dark:bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center gap-4 z-10">
            <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm text-green-700 dark:text-green-400">
               <MessageCircle size={28} fill="currentColor" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <span className="block font-black text-xl tracking-tight">WhatsApp Us</span>
              <span className="text-green-800/80 dark:text-green-400/80 text-xs font-bold uppercase tracking-wider">Instant Reply</span>
            </div>
          </div>
          <div className="z-10 bg-white dark:bg-slate-800 p-2 rounded-full text-green-700 dark:text-green-400 shadow-sm">
            <ArrowRight size={20} />
          </div>
        </button>

        <button 
          onClick={handleEmail}
          className="group relative overflow-hidden bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-2 border-[#EDE8F8] dark:border-slate-700 p-6 rounded-3xl shadow-lg flex items-center justify-between transition-all hover:border-[#ABCEC9] hover:shadow-[#ABCEC9]/20 active:scale-95"
        >
          <div className="flex items-center gap-4 z-10">
            <div className="bg-[#EDE8F8] dark:bg-slate-700 p-3 rounded-2xl text-[#C3B8D5] group-hover:bg-[#C3B8D5] group-hover:text-white transition-colors">
               <Mail size={28} strokeWidth={2} />
            </div>
            <div className="text-left">
              <span className="block font-black text-xl tracking-tight">Send Email</span>
              <span className="text-[#AABBCC] text-xs font-bold uppercase tracking-wider">For Enquiries</span>
            </div>
          </div>
        </button>
      </div>

      {/* Offerings Carousel Look */}
      <div>
        <div className="flex items-center gap-2 mb-4 px-2">
           <Star className="text-[#C3B8D5] fill-current animate-spin-slow" size={18} />
           <h3 className="font-bold text-[#AABBCC] uppercase tracking-widest text-xs">What we offer</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#ABCEC9]/10 dark:bg-slate-800/50 p-4 rounded-2xl border border-[#ABCEC9]/20 dark:border-slate-700">
               <User className="text-[#ABCEC9] mb-2" size={24} />
               <div className="font-bold text-gray-700 dark:text-gray-200">1-on-1</div>
               <div className="text-xs text-[#ABCEC9] font-medium">Personal Coaching</div>
            </div>
            <div className="bg-[#C3B8D5]/10 dark:bg-slate-800/50 p-4 rounded-2xl border border-[#C3B8D5]/20 dark:border-slate-700">
               <Briefcase className="text-[#C3B8D5] mb-2" size={24} />
               <div className="font-bold text-gray-700 dark:text-gray-200">Corporate</div>
               <div className="text-xs text-[#C3B8D5] font-medium">Stress Relief</div>
            </div>
            <div className="bg-[#AABBCC]/10 dark:bg-slate-800/50 p-4 rounded-2xl border border-[#AABBCC]/20 dark:border-slate-700">
               <Users className="text-[#AABBCC] mb-2" size={24} />
               <div className="font-bold text-gray-700 dark:text-gray-200">Groups</div>
               <div className="text-xs text-[#AABBCC] font-medium">Workshops</div>
            </div>
            <div className="bg-yellow-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-yellow-100 dark:border-slate-700">
               <Heart className="text-yellow-400 mb-2" size={24} />
               <div className="font-bold text-gray-700 dark:text-gray-200">Retreats</div>
               <div className="text-xs text-yellow-500 font-medium">Wellness Days</div>
            </div>
        </div>
      </div>

      {/* Social Links Stack */}
      <div className="space-y-3">
        {/* Pastel YouTube Button - Softer Red */}
        <a 
          href="https://www.youtube.com/@sumansunejaofficial"
          target="_blank"
          rel="noopener noreferrer" 
          className="flex items-center gap-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/30 p-1.5 pr-4 pl-1.5 rounded-full shadow-lg shadow-red-50 dark:shadow-none hover:shadow-red-100 hover:bg-red-100 dark:hover:bg-red-900/30 hover:-translate-y-0.5 transition-all group"
        >
          <div className="bg-white dark:bg-slate-800 text-[#C62828] p-3 rounded-full shadow-md">
            <Youtube size={20} fill="currentColor" />
          </div>
          <div className="flex-1">
             <div className="text-sm font-bold">Watch on YouTube</div>
          </div>
          <div className="text-[10px] font-bold bg-white dark:bg-slate-800 text-[#C62828] border border-red-200 dark:border-red-900 px-3 py-1 rounded-md uppercase group-hover:bg-[#EF5350] group-hover:text-white transition-colors">Subscribe</div>
        </a>
        
        <a 
          href="https://sumansuneja.com/"
          target="_blank"
          rel="noopener noreferrer" 
          className="flex items-center justify-center gap-2 text-[#AABBCC] text-sm font-bold hover:text-[#ABCEC9] transition-colors py-2"
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
                className="w-full h-full object-contain p-2 bg-[#EDE8F8] dark:bg-slate-800"
             />
         </div>
         <p className="text-[10px] text-[#AABBCC] dark:text-slate-500 font-bold tracking-wide">
            App Developed by <span className="text-[#ABCEC9]">SKRMBliss.ai Studio</span>
         </p>
      </div>
    </div>
  );
};