import React, { useState } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { Phone, Check, ChevronDown, LogOut, Shield, User as UserIcon } from 'lucide-react';

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
  const [name, setName] = useState(user.displayName || '');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  // Fetch existing profile if available
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user.uid) return;
      try {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.phoneNumber) {
            // Remove country code for display if possible, or just show as is
            // For simplicity in this fix, we just set it
            // Ideally we'd parse it, but let's just use what we have
            // setPhoneNumber(data.phoneNumber); 
            // Logic: If phone exists in DB, we shouldn't even seem this screen right? 
            // The parent component checks localStorage or user.phoneNumber.
            // We need to update parent or localStorage if DB has it.
            localStorage.setItem(`user_phone_${user.uid}`, data.phoneNumber);
            onLinkSuccess(); // Auto-dismiss if found
          }
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };
    fetchUserProfile();
  }, [user.uid, onLinkSuccess]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    // Phone Validation: Must be exactly 10 digits
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length !== 10) {
      setError("Mobile number must be exactly 10 digits.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Update Display Name in Firebase Auth
      await updateProfile(user, { displayName: name });

      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Save to Firestore
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        phoneNumber: formattedPhone,
        displayName: name,
        email: user.email, // Good to have
        lastUpdated: new Date()
      }, { merge: true });

      // Save locally to satisfy the check in App.tsx
      localStorage.setItem(`user_phone_${user.uid}`, formattedPhone);

      onLinkSuccess();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectCountry = (c: Country) => {
    setSelectedCountry(c);
    setShowCountryDropdown(false);
  };

  const handleSignOut = () => {
    auth.signOut();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#FFF8F0] flex items-center justify-center p-4">

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#8B3A3A] to-[#E57373]"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#E57373] rounded-full blur-3xl opacity-20 -mr-16 -mb-16"></div>

      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 relative overflow-hidden border-4 border-white">

        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-[#FFF8F0] rounded-full mx-auto flex items-center justify-center mb-4 border-4 border-white shadow-lg relative">
            <Shield className="text-[#8B3A3A] w-10 h-10" />
            <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md">
              <Phone size={14} className="text-[#E57373]" />
            </div>
          </div>
          <h2 className="text-2xl font-fredoka font-bold text-gray-800">Complete Profile</h2>
          <p className="text-gray-500 font-bold text-sm">Name and phone number required</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-4 flex items-start gap-2 border border-red-100">
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 animate-in slide-in-from-right">

          {/* Name Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border-2 border-[#8B3A3A]/30 text-[#8B3A3A] text-lg font-bold py-4 px-4 rounded-2xl focus:outline-none focus:border-[#8B3A3A] transition-all placeholder:text-[#8B3A3A]/40 pl-12"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8B3A3A]/50">
              <UserIcon size={20} />
            </div>
          </div>

          {/* Phone Input */}
          <div className="group relative flex gap-2">
            {/* Country Selector */}
            <div className="relative">
              <button
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className="h-full bg-white border-2 border-[#8B3A3A]/30 rounded-2xl px-3 flex items-center gap-1 hover:border-[#8B3A3A] transition-colors"
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
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-[#FFF8F0] transition-colors ${selectedCountry.code === c.code ? 'bg-[#FFF8F0]' : ''}`}
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
                className="w-full bg-white border-2 border-[#8B3A3A]/30 text-[#8B3A3A] text-lg font-bold py-4 px-4 rounded-2xl focus:outline-none focus:border-[#8B3A3A] transition-all placeholder:text-[#8B3A3A]/40"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] font-bold py-4 rounded-2xl shadow-lg shadow-[#8B3A3A]/10 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {isSaving ? "Saving..." : <><Check size={20} strokeWidth={3} /> Save & Link</>}
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