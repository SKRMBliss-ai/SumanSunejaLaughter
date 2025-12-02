import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Phone, Check, Loader2, AlertCircle, Sparkles, Music, Zap, Key, ExternalLink, Wrench, Globe, Copy, CreditCard, ChevronDown, Mail } from 'lucide-react';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

// Strictly enforcing the requested countries
const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91' },
  { code: 'UK', name: 'UK', flag: '🇬🇧', dialCode: '+44' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', dialCode: '+971' },
  { code: 'US', name: 'USA', flag: '🇺🇸', dialCode: '+1' },
];

export const Login: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailedError, setDetailedError] = useState<string | null>(null);
  const [errorActionLink, setErrorActionLink] = useState<string | null>(null);
  const [domainToAuthorize, setDomainToAuthorize] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Use a ref for the container to ensure it exists before Recaptcha attaches
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        } catch (e) {
          console.error("Cleanup error", e);
        }
      }
    };
  }, []);

  const formatPhoneNumber = (number: string) => {
    // 1. Remove all non-digit characters (spaces, dashes, parentheses)
    let clean = number.replace(/[^\d]/g, '');

    // 2. Check if the user accidentally typed the country code at the start
    // e.g., user typed 919876543210 while India (+91) is selected
    const dialCodeDigits = selectedCountry.dialCode.replace('+', '');
    if (clean.startsWith(dialCodeDigits)) {
      clean = clean.substring(dialCodeDigits.length);
    }

    // 3. CRITICAL FIX: Remove leading zero if present
    // e.g. UK number 07123456789 -> 7123456789
    // This is required for E.164 formatting on many carriers
    if (clean.startsWith('0')) {
      clean = clean.substring(1);
    }

    return selectedCountry.dialCode + clean;
  };

  const initRecaptcha = () => {
    if (!recaptchaContainerRef.current) {
      console.error("Recaptcha container not found");
      return;
    }

    if (!window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          'size': 'invisible',
          'callback': () => console.log("Captcha Verified"),
          'expired-callback': () => {
            setError("Captcha expired. Please try again.");
            setIsLoading(false);
          }
        });
      } catch (err) {
        console.error("Recaptcha Init Error:", err);
      }
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Basic validation length check (differs by country, but > 8 is safe min)
    if (formattedPhone.length < 8) {
      setError("Please enter a valid mobile number.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDetailedError(null);
    setErrorActionLink(null);
    setDomainToAuthorize(null);

    initRecaptcha();

    try {
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) throw new Error("Security check failed to initialize. Refresh page.");

      console.log("Sending OTP to:", formattedPhone); // Debug log
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(result);
      setStep('OTP');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (err: any) {
      console.error("Auth Error Full Object:", err);

      let msg = "Login failed.";
      let detail = err.message;
      let actionLink = null;
      const currentDomain = window.location.hostname;
      // @ts-ignore - accessing internal options to help the user debug
      const projectId = auth.app.options.projectId || "sumansunejalaughter-178eb";

      // Handle specific error codes with actionable solutions
      if (err.code === 'auth/internal-error' && !err.message.includes('API key')) {
        // This is almost always a domain authorization issue on new deployments
        msg = "Domain Not Allowed 🔒";
        detail = `Firebase is blocking login from "${currentDomain}" for security. You must add this domain to your Authorized Domains list.`;
        actionLink = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
        setDomainToAuthorize(currentDomain);
      } else if (err.code === 'auth/invalid-api-key') {
        msg = "Missing API Key";
        detail = "The 'apiKey' in services/firebase.ts is invalid or deleted. You must create a new API Key in Google Cloud Console.";
        actionLink = `https://console.cloud.google.com/apis/credentials?project=${projectId}`;
      } else if (err.code === 'auth/invalid-phone-number') {
        msg = "Invalid phone number.";
        detail = `The format ${formattedPhone} is not recognized by the provider. Please check the number.`;
      } else if (err.code === 'auth/captcha-check-failed') {
        msg = "Captcha check failed.";
        detail = "Please refresh the page and try again.";
      } else if (err.code === 'auth/billing-not-enabled') {
        msg = "Billing Issue 💳";
        detail = `Project "${projectId}" needs billing enabled to send SMS.`;
        actionLink = `https://console.cloud.google.com/billing/linkedaccount?project=${projectId}`;
      } else if (err.code === 'auth/network-request-failed') {
        msg = "Network Error";
        detail = "Check your internet connection. If you are on a new domain, check Authorized Domains.";
      } else if (err.code === 'auth/quota-exceeded' || err.code === 'auth/too-many-requests') {
        msg = "Limit Reached";
        detail = "Too many SMS sent today or for this number. Try again later.";
      }

      setError(msg);
      setDetailedError(detail);
      setErrorActionLink(actionLink);

      // Reset captcha
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setIsLoading(true);
    try {
      if (confirmationResult) await confirmationResult.confirm(otp);
    } catch (err: any) {
      console.error(err);
      setError("Incorrect Code. Try again!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Login cancelled.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Google Login not enabled in Firebase Console.");
      } else {
        setError("Google Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyDomain = () => {
    if (domainToAuthorize) {
      navigator.clipboard.writeText(domainToAuthorize);
      alert("Domain copied! Now paste it in Firebase Console.");
    }
  };

  const selectCountry = (c: Country) => {
    setSelectedCountry(c);
    setShowCountryDropdown(false);
  };

  const isPhoneValid = phoneNumber.replace(/\D/g, '').length >= 5;

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Fun Animated Background */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#8B3A3A] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-[bounce-gentle_6s_infinite]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#E57373] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-[bounce-gentle_5s_infinite_reverse]"></div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute animate-[fall_3s_ease-out_forwards]" style={{
              left: `${Math.random() * 100}%`,
              top: `-10%`,
              animationDelay: `${Math.random() * 2}s`,
              backgroundColor: ['#8B3A3A', '#E57373', '#FFF8F0', '#934139'][Math.floor(Math.random() * 4)],
              width: '10px',
              height: '10px',
              borderRadius: '50%'
            }}></div>
          ))}
        </div>
      )}

      <div className="max-w-md w-full relative z-10">

        {/* Mascot & Branding */}
        <div className="flex flex-col items-center mb-8 relative animate-pop-in">
          <div className="relative group cursor-pointer" onClick={() => setShowConfetti(true)}>
            <div className="w-36 h-36 bg-white rounded-full flex items-center justify-center shadow-2xl border-[6px] border-[#8B3A3A] animate-float overflow-hidden">
              <img
                src="https://sumansuneja.com/wp-content/uploads/2025/03/icon-mascot-suman-suneja.svg"
                alt="Suman Suneja Mascot"
                className="w-full h-full object-contain p-2 hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div className="absolute -bottom-2 -right-4 bg-[#8B3A3A] text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg transform rotate-6 group-hover:rotate-12 transition-transform animate-wiggle">
              Ha Ha Ha!
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-fredoka font-bold text-gray-800 tracking-tight">Laughter Hub</h1>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/60 animate-fade-in-up delay-200">

          <div className="p-8">

            {/* Error Display Card */}
            {error && (
              <div className="bg-red-50 text-red-800 text-sm p-5 rounded-2xl border-2 border-red-100 mb-6 animate-[shake_0.4s_ease-in-out] shadow-md">
                <div className="flex items-start gap-3">
                  <div className="bg-red-100 p-2 rounded-full shrink-0">
                    {error.includes("Key") ? <Key size={20} className="text-red-600" /> :
                      error.includes("Domain") ? <Globe size={20} className="text-red-600" /> :
                        error.includes("Billing") ? <CreditCard size={20} className="text-red-600" /> :
                          <AlertCircle size={20} className="text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <span className="font-bold block text-lg text-red-700 mb-1">{error}</span>
                    {detailedError && (
                      <div className="text-xs text-red-600/80 font-medium leading-relaxed mb-3 break-words">
                        {detailedError}
                      </div>
                    )}

                    {domainToAuthorize && (
                      <button
                        onClick={copyDomain}
                        className="w-full mb-3 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
                      >
                        <Copy size={12} /> Copy Domain: {domainToAuthorize}
                      </button>
                    )}

                    {errorActionLink && (
                      <a
                        href={errorActionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm w-full justify-center"
                      >
                        <Wrench size={12} /> {error.includes("Domain") ? "Fix in Firebase" : error.includes("Billing") ? "Enable Billing" : "Fix Issue"} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 'PHONE' ? (
              <div className="space-y-6 animate-fade-in-up">
                {!error && (
                  <div className="text-center mb-2">
                    <h2 className="text-xl font-bold text-gray-700">Let's Get Started!</h2>
                    <p className="text-gray-500 text-sm">Join the global laughter movement.</p>
                  </div>
                )}

                <div className="group relative flex gap-2">
                  {/* Country Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="h-full bg-white border-2 border-[#8B3A3A]/30 rounded-2xl px-3 flex items-center gap-1 hover:border-[#8B3A3A] transition-colors"
                      title="Select Country"
                    >
                      <span className="text-2xl">{selectedCountry.flag}</span>
                      <span className="text-xs font-bold text-gray-800 hidden sm:block">{selectedCountry.dialCode}</span>
                      <ChevronDown size={14} className="text-gray-600" />
                    </button>

                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-1 z-50 w-48 animate-pop-in origin-top-left">
                        {COUNTRIES.map(c => (
                          <button
                            key={c.code}
                            onClick={() => selectCountry(c)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-[#FFF8F0] transition-colors ${selectedCountry.code === c.code ? 'bg-[#FFF8F0]' : ''}`}
                          >
                            <span className="text-xl">{c.flag}</span>
                            <div className="flex flex-col leading-none">
                              <span className="text-sm font-bold text-gray-800">{c.name}</span>
                              <span className="text-xs text-gray-400 font-mono">{c.dialCode}</span>
                            </div>
                            {selectedCountry.code === c.code && <Check size={14} className="ml-auto text-[#8B3A3A]" />}
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
                      className="w-full bg-white border-2 border-[#8B3A3A]/30 text-[#8B3A3A] text-xl font-bold py-5 px-4 rounded-2xl focus:outline-none focus:border-[#8B3A3A] focus:bg-white transition-all placeholder:text-[#8B3A3A]/40"
                      onKeyDown={(e) => e.key === 'Enter' && isPhoneValid && handleSendOtp()}
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8B3A3A]/50">
                      <Phone size={20} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSendOtp}
                  disabled={isLoading || !isPhoneValid}
                  className={`w-full bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] font-bold py-5 rounded-2xl shadow-xl shadow-[#8B3A3A]/10 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 text-lg ${(isLoading || !isPhoneValid) ? 'opacity-50 cursor-not-allowed scale-100' : ''
                    }`}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <span>Send OTP</span>
                      <Zap size={20} className="fill-current" />
                    </>
                  )}
                </button>

                {/* Google Login Link Fallback */}
                <div className="mt-4 pt-2 text-center">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="text-gray-500 hover:text-[#8B3A3A] text-xs font-bold transition-colors inline-flex items-center gap-1 group"
                  >
                    <Mail size={12} className="group-hover:text-red-400 transition-colors" />
                    <span className="underline decoration-dotted decoration-gray-400 underline-offset-4 group-hover:decoration-red-300">
                      Not receiving OTP? Login via Gmail
                    </span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="space-y-6 animate-pop-in">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-[#8B3A3A]/10 text-[#8B3A3A] px-5 py-2 rounded-full text-xs font-bold mb-6 border border-[#8B3A3A]/20">
                    <span className="w-2 h-2 rounded-full bg-[#8B3A3A] animate-pulse"></span>
                    Code sent to {formatPhoneNumber(phoneNumber)}
                  </div>

                  <div className="relative mb-2">
                    <input
                      type="text"
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full bg-white border-b-4 border-gray-200 focus:border-[#8B3A3A] rounded-xl p-4 text-center text-4xl font-bold tracking-[0.5em] text-[#8B3A3A] focus:outline-none transition-all placeholder:text-gray-300 placeholder:tracking-widest"
                      maxLength={6}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                    />
                  </div>
                </div>

                <button
                  onClick={handleVerifyOtp}
                  disabled={isLoading}
                  className="w-full bg-[#FFF8F0] text-[#8B3A3A] border-2 border-[#8B3A3A] hover:bg-[#8B3A3A] hover:text-[#FFF8F0] font-bold py-5 rounded-2xl shadow-xl shadow-[#8B3A3A]/10 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3 text-lg"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <span>Verify & Enter</span>
                      <Check size={24} strokeWidth={3} />
                    </>
                  )}
                </button>

                <div className="space-y-4 pt-2">
                  <button
                    onClick={() => {
                      setStep('PHONE');
                      setError(null);
                    }}
                    className="w-full text-gray-500 text-sm font-bold hover:text-[#8B3A3A] transition-colors underline decoration-dashed underline-offset-4"
                  >
                    Wrong number? Go back
                  </button>

                  <div className="text-center">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="text-gray-400 hover:text-red-400 text-xs font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <Mail size={12} /> Still no code? Login via Gmail
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Hidden Recaptcha Container attached to Ref */}
            <div ref={recaptchaContainerRef}></div>

          </div>

          {/* Footer Bar */}
          <div className="bg-[#FFF8F0] p-4 flex justify-between items-center text-[10px] text-[#8B3A3A] font-bold uppercase tracking-widest border-t border-[#8B3A3A]/20">
            <div className="flex items-center gap-1">
              <Music size={12} /> Laughter Yoga
            </div>
            <div className="flex items-center gap-1">
              <Sparkles size={12} /> Daily Joy
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};