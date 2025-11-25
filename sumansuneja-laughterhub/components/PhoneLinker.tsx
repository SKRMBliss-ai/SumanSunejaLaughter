import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Phone, Check, ChevronDown, LogOut, Shield } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'UK', name: 'UK', flag: '🇬🇧', dialCode: '+44' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', dialCode: '+971' },
  { code: 'US', name: 'USA', flag: '🇺🇸', dialCode: '+1' },
];

interface PhoneLinkerProps {
  user: User;
  onLinkSuccess: () => void;
}

export const PhoneLinker: React.FC<PhoneLinkerProps> = ({ user, onLinkSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhoneNumber = (number: string) => {
    let clean = number.replace(/[^\d]/g, '');
    const dialCodeDigits = selectedCountry.dialCode.replace('+', '');
    
    // Remove accidental country code typing
    if (clean.startsWith(dialCodeDigits)) {
       clean = clean.substring(dialCodeDigits.length);
    }
    
    // Remove leading zero (critical for UK/EU)
    if (clean.startsWith('0')) {
        clean = clean.substring(1);
    }
    
    return selectedCountry.dialCode + clean;
  };

  const handleSave = () => {
    if (!phoneNumber.trim() || phoneNumber.replace(/\D/g, '').length < 5) {
      setError("Please enter a valid mobile number.");
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    // Since we are bypassing OTP as requested for this specific flow,
    // we save the phone number locally to mark the profile as "complete".
    localStorage.setItem(`user_phone_${user.uid}`, formattedPhone);
    
    onLinkSuccess();
  };

  const selectCountry = (c: Country) => {
    setSelectedCountry(c);
    setShowCountryDropdown(false);
  };

  const handleSignOut = () => {
      auth.signOut();
      window.location.reload();
  };

  const isPhoneValid = phoneNumber.replace(/\D/g, '').length >= 5;

  return (
    <div className="fixed inset-0 z-[60] bg-[#EDE8F8] flex items-center justify-center p-4">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#ABCEC9] to-[#C3B8D5]"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#ABCEC9] rounded-full blur-3xl opacity-20 -mr-16 -mb-16"></div>
      
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden border-4 border-white">
        
        <div className="text-center mb-6">
           <div className="w-20 h-20 bg-[#EDE8F8] rounded-full mx-auto flex items-center justify-center mb-4 border-4 border-white shadow-lg relative">
              <Shield className="text-[#ABCEC9] w-10 h-10" />
              <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md">
                 <Phone size={14} className="text-[#C3B8D5]" />
              </div>
           </div>
           <h2 className="text-2xl font-fredoka font-bold text-gray-800">Complete Profile</h2>
           <p className="text-gray-500 font-bold text-sm">Phone number required to proceed</p>
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-4 flex items-start gap-2 border border-red-100">
                <span>{error}</span>
            </div>
        )}

        <div className="space-y-4 animate-in slide-in-from-right">
             <div className="group relative flex gap-2">
                {/* Country Selector */}
                <div className="relative">
                   <button 
                     onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                     className="h-full bg-[#F5F3FA] border-2 border-transparent rounded-2xl px-3 flex items-center gap-1 hover:border-[#ABCEC9] transition-colors"
                   >
                      <span className="text-2xl mr-1">{selectedCountry.flag}</span>
                      <span className="text-sm font-extrabold text-gray-800">{selectedCountry.code}</span>
                      <ChevronDown size={16} className="text-gray-800 ml-1 font-bold" />
                   </button>
                   
                   {showCountryDropdown && (
                     <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-50 w-48 animate-in zoom-in-95 origin-top-left max-h-60 overflow-y-auto">
                        {COUNTRIES.map(c => (
                          <button
                            key={c.code}
                            onClick={() => selectCountry(c)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-[#EDE8F8] transition-colors ${selectedCountry.code === c.code ? 'bg-[#EDE8F8]' : ''}`}
                          >
                             <span className="text-xl">{c.flag}</span>
                             <div className="flex flex-col leading-none">
                                <span className="text-sm font-bold text-gray-800">{c.name}</span>
                                <span className="text-xs text-gray-500 font-mono">{c.dialCode}</span>
                             </div>
                          </button>
                        ))}
                     </div>
                   )}
                </div>

                <div className="relative flex-1">
                  <input 
                    type="tel"
                    placeholder="Mobile Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#F5F3FA] border-2 border-transparent text-gray-800 text-lg font-bold py-4 px-4 rounded-2xl focus:outline-none focus:border-[#ABCEC9] focus:bg-white transition-all placeholder:text-gray-400"
                    onKeyDown={(e) => e.key === 'Enter' && isPhoneValid && handleSave()}
                  />
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={!isPhoneValid}
                className="w-full bg-[#ABCEC9] hover:bg-[#9BBDB8] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#ABCEC9]/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
                <Check size={20} strokeWidth={3} /> Save & Link
            </button>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-100">
            <button 
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-500 text-xs font-bold transition-colors"
            >
                <LogOut size={14} /> Cancel & Sign Out
            </button>
        </div>
        
      </div>
    </div>
  );
};