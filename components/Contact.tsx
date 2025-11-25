import React from 'react';
import { Mail, MessageCircle, Youtube, Globe, Calendar, Users, Heart, Briefcase, Star, ArrowRight } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const Contact: React.FC = () => {
  const { t } = useSettings();

  const handleWhatsApp = () => {
    window.open('https://wa.me/919810059593', '_blank');
  };

  const handleEmail = () => {
    window.location.href = 'mailto:sumansuneja@gmail.com';
  };

  return (
    <div className="space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="text-center space-y-4 py-8">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 animate-pulse">
          {t('contact.header_title')}
        </h2>
        <p className="text-gray-600 max-w-md mx-auto text-lg leading-relaxed">
          {t('contact.header_subtitle')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto px-4">
        <button
          onClick={handleWhatsApp}
          className="group relative overflow-hidden bg-[#25D366] hover:bg-[#20bd5a] text-white p-6 rounded-3xl shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <MessageCircle size={32} />
            </div>
            <div className="text-left">
              <div className="font-bold text-xl">{t('contact.whatsapp_btn')}</div>
              <div className="text-green-100 text-sm font-medium">{t('contact.instant_reply')}</div>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 bg-white/10 w-32 h-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
        </button>

        <button
          onClick={handleEmail}
          className="group relative overflow-hidden bg-white hover:bg-gray-50 text-gray-800 p-6 rounded-3xl shadow-xl border-2 border-gray-100 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 z-10">
            <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
              <Mail size={32} />
            </div>
            <div className="text-left">
              <div className="font-bold text-xl">{t('contact.email_btn')}</div>
              <div className="text-gray-500 text-sm font-medium">{t('contact.for_enquiries')}</div>
            </div>
          </div>
        </button>
      </div>

      {/* Offerings Grid */}
      <div className="max-w-4xl mx-auto px-4">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Star className="text-yellow-400 fill-yellow-400" />
          {t('contact.offerings_title')}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Heart, title: t('contact.offering_1_title'), desc: t('contact.offering_1_desc'), color: 'bg-rose-100 text-rose-600' },
            { icon: Briefcase, title: t('contact.offering_2_title'), desc: t('contact.offering_2_desc'), color: 'bg-blue-100 text-blue-600' },
            { icon: Users, title: t('contact.offering_3_title'), desc: t('contact.offering_3_desc'), color: 'bg-purple-100 text-purple-600' },
            { icon: Calendar, title: t('contact.offering_4_title'), desc: t('contact.offering_4_desc'), color: 'bg-emerald-100 text-emerald-600' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group cursor-default">
              <div className={`${item.color} w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <item.icon size={24} />
              </div>
              <div className="font-bold text-gray-800">{item.title}</div>
              <div className="text-xs text-gray-500">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Links */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 pt-8 border-t border-gray-100">
        <a
          href="https://youtube.com/@sumansunejalaughterqueen"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-6 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-medium"
        >
          <Youtube size={20} />
          <span>{t('contact.youtube_btn')}</span>
          <span className="bg-red-200 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{t('contact.subscribe')}</span>
        </a>

        <a
          href="https://sumansuneja.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-6 py-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-medium"
        >
          <Globe size={20} />
          <span>{t('contact.website_btn')}</span>
          <ArrowRight size={16} className="opacity-50" />
        </a>
      </div>

      {/* Footer Branding */}
      <div className="text-center pt-8 pb-4">
        <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">
          {t('app.developed_by')}
        </p>
        <a
          href="https://skrmblissai.systeme.io/homepage"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 hover:opacity-80 transition-opacity"
        >
          SKRMBliss.ai Studio
        </a>
      </div>
    </div>
  );
};