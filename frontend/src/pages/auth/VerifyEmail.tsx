import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Shield,
  AlertCircle,
  Globe,
  RefreshCw,
  RotateCw,
  Mail
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, getRoleLandingPath } from '../../store/authStore';

export const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail, resendVerification } = useAuthStore();

  const passedMessage = (location.state as any)?.message;
  const passedEmail = (location.state as any)?.email;

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeExpired, setCodeExpired] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(passedMessage || null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus the first input box on load
    inputRefs.current[0]?.focus();
  }, []);

  const triggerVerification = async (codeToVerify: string) => {
    if (isVerifying || codeToVerify.length !== 6) return;
    setIsVerifying(true);
    setError(null);

    try {
      const res = await verifyEmail(codeToVerify, passedEmail);
      const role = res?.user?.role || res?.data?.user?.role || 'user';
      navigate(getRoleLandingPath(role), {
        state: { message: 'Email verified successfully! Welcome to your Sentrix console.' },
      });
    } catch (err: any) {
      const msg = err?.message || 'Verification failed. Code may be invalid or expired.';
      setError(msg);
      if (err?.codeExpired || msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('3 failed')) {
        setCodeExpired(true);
      }
      // Reset boxes on error so user can retype or resend
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDigitChange = (index: number, rawVal: string) => {
    const num = rawVal.replace(/[^0-9]/g, '');

    if (!num) {
      const updated = [...digits];
      updated[index] = '';
      setDigits(updated);
      return;
    }

    // If user pasted multiple characters into a single box
    if (num.length > 1) {
      handlePaste(num);
      return;
    }

    const updated = [...digits];
    updated[index] = num;
    setDigits(updated);
    setError(null);

    // Auto-focus the next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 boxes are completed, automatically trigger verification
    const fullCode = updated.join('');
    if (fullCode.length === 6 && !updated.includes('')) {
      triggerVerification(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const updated = [...digits];
        updated[index - 1] = '';
        setDigits(updated);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (pastedText: string) => {
    const cleanDigits = pastedText.replace(/[^0-9]/g, '').slice(0, 6).split('');
    if (cleanDigits.length === 0) return;

    const updated = ['', '', '', '', '', ''];
    cleanDigits.forEach((digit, i) => {
      updated[i] = digit;
    });
    setDigits(updated);
    setError(null);

    const nextIndex = Math.min(cleanDigits.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (cleanDigits.length === 6) {
      triggerVerification(updated.join(''));
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setResendStatus(null);
    setCodeExpired(false);
    try {
      await resendVerification(passedEmail);
      setResendStatus('A fresh 6-digit verification code has been dispatched to your email.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to resend code. Please sign in or try again later.');
    } finally {
      setResending(false);
    }
  };

  const isComplete = digits.join('').length === 6 && !digits.includes('');

  return (
    <div className="min-h-screen bg-[#060d1a] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-36 w-[520px] h-[520px] orb orb-blue opacity-40 pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-10 -right-36 w-[550px] h-[550px] orb orb-cyan opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-brand-purple/5 blur-[160px] pointer-events-none" aria-hidden="true" />

      {/* Main Centered Container */}
      <div className="w-full max-w-5xl rounded-[2.5rem] bg-[#0b1528]/95 border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.65)] overflow-hidden relative z-10 flex flex-col lg:flex-row backdrop-blur-2xl">

        {/* LEFT SECTION */}
        <div className="w-full lg:w-7/12 p-8 sm:p-12 lg:p-14 flex flex-col justify-between relative bg-[#0b1528]">

          {/* Top Bar */}
          <div className="flex items-center justify-between mb-8 sm:mb-10">
            <Link
              to="/login"
              className="w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 flex items-center justify-center text-text-muted hover:text-white transition-all shadow-sm group cursor-pointer"
              title="Return to Login"
              aria-label="Return to Login"
            >
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            </Link>

            <div className="text-xs sm:text-sm text-text-muted">
              Already verified?{' '}
              <Link
                to="/login"
                className="text-brand-cyan hover:text-brand-cyan/80 font-bold transition-colors underline decoration-brand-cyan/40 hover:decoration-brand-cyan"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Header & Subtitle */}
          <div className="mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold mb-3">
              <Mail size={13} />
              <span>Email Verification</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
              Enter 6-Digit Code
            </h1>
            <p className="text-text-muted text-sm leading-relaxed">
              {passedEmail ? (
                <>We sent a verification code to <span className="text-brand-cyan font-semibold">{passedEmail}</span>. Enter the code below to verify your account.</>
              ) : (
                'Please check your email for the 6-digit confirmation code. Enter each number below.'
              )}
            </p>
          </div>

          {/* Success Alerts */}
          {successMessage && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-relaxed font-medium">{successMessage}</span>
            </div>
          )}

          {resendStatus && (
            <div className="mb-5 p-3.5 bg-brand-cyan/10 border border-brand-cyan/30 rounded-2xl text-brand-cyan text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-brand-cyan" />
              <span className="leading-relaxed font-medium">{resendStatus}</span>
            </div>
          )}

          {/* Error Alert with Remaining Attempts Warning */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-relaxed font-medium flex-1">
                <span>{error}</span>
                {codeExpired && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="mt-2 block font-bold text-white underline hover:text-brand-cyan cursor-pointer text-xs"
                  >
                    Click here to request a new verification code
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 6-Box OTP Input Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-3">
                Security Code (Max 3 Attempts)
              </label>

              {/* 6 Digit Input Boxes */}
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={(e) => {
                      e.preventDefault();
                      handlePaste(e.clipboardData.getData('text'));
                    }}
                    disabled={isVerifying}
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold font-mono rounded-2xl border transition-all outline-none ${
                      digit
                        ? 'border-brand-cyan bg-brand-cyan/10 text-white shadow-lg shadow-brand-cyan/20'
                        : 'border-white/10 bg-white/[0.03] text-white/90 hover:border-white/20 focus:border-brand-cyan focus:bg-white/[0.06]'
                    } ${isVerifying ? 'opacity-60 cursor-wait' : ''}`}
                  />
                ))}
              </div>
            </div>

            {/* Verification Action Bar with Rotating Refresh Icon */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const fullCode = digits.join('');
                  if (fullCode.length === 6) {
                    triggerVerification(fullCode);
                  }
                }}
                disabled={isVerifying || !isComplete}
                className={`w-full sm:w-auto min-w-[200px] py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                  isComplete
                    ? 'bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-purple text-white shadow-lg shadow-brand-cyan/25 hover:opacity-95'
                    : 'bg-white/5 border border-white/10 text-text-muted/60 opacity-60 cursor-not-allowed'
                }`}
              >
                <RefreshCw
                  size={16}
                  className={`${isVerifying ? 'animate-spin text-white' : ''} transition-transform`}
                />
                <span>
                  {isVerifying
                    ? 'Verifying Code…'
                    : isComplete
                    ? 'Verifying…'
                    : 'Enter 6 Digits'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resending || isVerifying}
                className="w-full sm:w-auto py-3 px-5 rounded-2xl border border-white/10 text-text-muted hover:text-white hover:bg-white/5 transition-colors text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RotateCw size={13} className={resending ? 'animate-spin text-brand-cyan' : ''} />
                <span>{resending ? 'Sending Code…' : 'Resend Code'}</span>
              </button>
            </div>
          </div>

          {/* Bottom Security Badges */}
          <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-text-muted/60 font-mono">
            <div className="flex items-center gap-1.5">
              <Globe size={13} className="text-brand-cyan/70" />
              <span>Zero-Trust 2FA</span>
            </div>
            <div className="flex items-center gap-1 text-[11px]">
              <Shield size={12} className="text-emerald-400" />
              <span>3 Attempts Allowed</span>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: Promotional Panel */}
        <div className="w-full lg:w-5/12 bg-gradient-to-br from-[#122247] via-[#101b38] to-[#1a1236] p-8 sm:p-10 lg:p-12 relative overflow-hidden flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10">
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full bg-brand-cyan/15 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-brand-purple/20 blur-[70px] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.15),transparent_60%)] pointer-events-none" />

          {/* Badge */}
          <div className="relative z-10 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-brand-cyan text-xs font-semibold">
              <ShieldCheck size={14} className="text-brand-cyan" />
              <span>Identity Verification</span>
            </div>
          </div>

          {/* Main Message */}
          <div className="relative z-10 space-y-4 mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Protecting Your Security Operations
            </h2>
            <p className="text-text-muted text-sm leading-relaxed">
              Sentrix requires two-factor email verification for all new workspace registrations. Each verification code expires after 3 unsuccessful attempts or 24 hours.
            </p>
          </div>

          {/* Feature List */}
          <div className="relative z-10 space-y-3 font-mono text-xs text-text-muted/80">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
              <span>6-Digit Security Token Protection</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Strict 3-Attempt Rate Limit</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
              <span>Instant Workspace Authorization</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
