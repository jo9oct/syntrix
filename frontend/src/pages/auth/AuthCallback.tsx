import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore, getRoleLandingPath } from '../../store/authStore';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthToken } = useAuthStore();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const processOAuth = async () => {
      const error = searchParams.get('error');
      if (error) {
        setErrorMessage(error);
        setTimeout(() => {
          navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true });
        }, 1500);
        return;
      }

      const token = searchParams.get('token') || searchParams.get('refreshToken');
      if (!token) {
        setErrorMessage('No authentication token received from identity provider.');
        setTimeout(() => {
          navigate('/login?error=No+authentication+token+received', { replace: true });
        }, 1500);
        return;
      }

      const isNewUser = searchParams.get('isNew') === '1' || searchParams.get('isNewUser') === 'true';

      try {
        const user = await handleOAuthToken(token);
        if (user) {
          // If the email is not registered before (brand-new user) or organization is not onboarded, view the onboard organization page
          if (isNewUser || (!user.organizationOnboarded && !user.organization)) {
            navigate('/onboarding', { replace: true });
            return;
          }
          const destination = getRoleLandingPath(user.role);
          navigate(destination, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        const msg = err.message || 'Authentication verification failed';
        setErrorMessage(msg);
        setTimeout(() => {
          navigate(`/login?error=${encodeURIComponent(msg)}`, { replace: true });
        }, 2000);
      }
    };

    processOAuth();
  }, [searchParams, handleOAuthToken, navigate]);

  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-brand-cyan/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-[#0d1527]/90 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan mx-auto">
          {errorMessage ? (
            <AlertCircle size={32} className="text-rose-400 animate-shake" />
          ) : (
            <ShieldCheck size={32} className="animate-pulse" />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            {errorMessage ? 'Authentication Failed' : 'Completing Sign-In'}
          </h2>
          <p className="text-sm text-text-muted">
            {errorMessage
              ? errorMessage
              : 'Verifying cryptographic security token with Sentrix Zero-Trust...'}
          </p>
        </div>

        {!errorMessage && (
          <div className="flex justify-center items-center gap-3 pt-2 text-brand-cyan text-sm font-mono">
            <Loader2 className="animate-spin" size={20} />
            <span>Establishing authorized session</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

