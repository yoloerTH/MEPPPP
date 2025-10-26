import React, { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Building2, Mail, Chrome, Shield, Zap, CheckCircle } from 'lucide-react';

// Get the correct redirect URL based on environment
const getRedirectUrl = () => {
  const currentUrl = window.location.origin;
  return `${currentUrl}/`;
};

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<'sign_in' | 'sign_up'>('sign_in');

  useEffect(() => {
    console.log('🔐 AuthWrapper: Initializing auth state');
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 AuthWrapper: Initial session check', { hasSession: !!session, hasUser: !!session?.user });
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔐 AuthWrapper: Auth state changed', { event: _event, hasSession: !!session });
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check and refresh session on app load to prevent issues after inactivity
  useEffect(() => {
    const checkAndRefreshSession = async () => {
      try {
        console.log('🔐 AuthWrapper: Checking session health');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn('🔐 AuthWrapper: Session check error:', error);
          // If session is invalid, try to refresh
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.warn('🔐 AuthWrapper: Session refresh failed:', refreshError);
          } else {
            console.log('🔐 AuthWrapper: Session refreshed successfully');
          }
        } else {
          console.log('🔐 AuthWrapper: Session is healthy', { hasSession: !!session });
        }
      } catch (error) {
        console.error('🔐 AuthWrapper: Error during session check:', error);
      }
    };

    // Check session immediately and then periodically
    checkAndRefreshSession();
    const interval = setInterval(checkAndRefreshSession, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="w-48 h-2 bg-slate-200 rounded-full mx-auto overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse"></div>
            </div>
            <h3 className="text-xl font-semibold text-slate-800">Loading MEP Dashboard</h3>
            <p className="text-slate-600">Initializing professional environment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <Building2 className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
              MEP Dashboard
            </h1>
            <div className="space-y-2">
              <p className="text-xl font-semibold text-slate-700">Professional Quotation System</p>
              <p className="text-sm font-medium text-blue-600 bg-blue-100 px-4 py-2 rounded-full inline-block">
                Enterprise-Grade MEP Solutions
              </p>
            </div>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed">
              {authView === 'sign_in' 
                ? 'Access your professional dashboard to manage quotations and streamline your MEP workflow' 
                : 'Join the professional MEP community and start generating intelligent quotations today'
              }
            </p>
          </div>
          
          {/* Auth Mode Toggle */}
          <div className="relative">
            <div className="bg-slate-100 p-1.5 rounded-xl flex shadow-inner">
              <button
                onClick={() => setAuthView('sign_in')}
                className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  authView === 'sign_in'
                    ? 'bg-white text-slate-900 shadow-lg shadow-slate-200/50 transform scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthView('sign_up')}
                className={`flex-1 py-3 px-4 text-sm font-semibold rounded-lg transition-all duration-300 ${
                  authView === 'sign_up'
                    ? 'bg-white text-slate-900 shadow-lg shadow-slate-200/50 transform scale-[1.02]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Auth Form */}
          <div className="bg-white/80 backdrop-blur-xl py-8 px-8 shadow-2xl rounded-2xl border border-white/20">
            <Auth
              supabaseClient={supabase}
              appearance={{ 
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#2563eb',
                      brandAccent: '#1d4ed8',
                      brandButtonText: 'white',
                      defaultButtonBackground: '#f8fafc',
                      defaultButtonBackgroundHover: '#f1f5f9',
                      inputBackground: 'white',
                      inputBorder: '#e2e8f0',
                      inputBorderHover: '#2563eb',
                      inputBorderFocus: '#2563eb',
                    },
                    space: {
                      inputPadding: '14px 18px',
                      buttonPadding: '14px 28px',
                    },
                    borderWidths: {
                      buttonBorderWidth: '1px',
                      inputBorderWidth: '1px',
                    },
                    radii: {
                      borderRadiusButton: '12px',
                      buttonBorderRadius: '12px',
                      inputBorderRadius: '12px',
                    },
                    fonts: {
                      bodyFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                      buttonFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                      inputFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`,
                    },
                  }
                },
                className: {
                  container: 'space-y-6',
                  button: 'w-full flex justify-center py-3.5 px-6 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02]',
                  input: 'appearance-none relative block w-full px-4 py-3.5 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 focus:z-10 text-sm transition-all duration-200 bg-white shadow-sm',
                  label: 'block text-sm font-semibold text-slate-700 mb-3',
                  message: 'text-sm text-red-600 mt-3 bg-red-50 p-3 rounded-lg border border-red-200',
                }
              }}
              providers={['google']}
              socialLayout="horizontal"
              redirectTo={getRedirectUrl()}
              options={{
                redirectTo: getRedirectUrl(),
                queryParams: {
                  access_type: 'offline',
                  prompt: 'consent',
                  scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send email profile',
                  client_id: '97032845059-016f0bcun31cmdcbklarfci9mu3n0hmk.apps.googleusercontent.com'
                }
              }}
              showLinks={false}
              view={authView}
              onlyThirdPartyProviders={false}
            />
            
            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-6 bg-white text-slate-500 font-medium">
                    Choose your preferred authentication method
                  </span>
                </div>
              </div>
              
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="flex items-center justify-center px-6 py-4 border border-slate-200 rounded-xl bg-gradient-to-r from-white to-slate-50 hover:from-slate-50 hover:to-slate-100 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md">
                  <Chrome className="w-5 h-5 text-blue-600 mr-3 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-sm font-semibold text-slate-700">Google OAuth</span>
                </div>
                <div className="flex items-center justify-center px-6 py-4 border border-slate-200 rounded-xl bg-gradient-to-r from-white to-slate-50 hover:from-slate-50 hover:to-slate-100 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md">
                  <Mail className="w-5 h-5 text-emerald-600 mr-3 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-sm font-semibold text-slate-700">Email & Password</span>
                </div>
              </div>
              
              <div className="mt-8 text-center space-y-4">
                <div className="flex items-center justify-center space-x-6 text-xs text-slate-500">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span>SSL Secured</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span>AI-Powered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Professional</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  By {authView === 'sign_in' ? 'signing in' : 'signing up'}, you gain access to the<br />
                  <span className="font-semibold text-slate-700">Professional MEP Quotation Dashboard</span>
                </p>
                <p className="text-xs text-slate-400">
                  {authView === 'sign_in' ? "New to our platform? " : "Already have an account? "}
                  <button 
                    onClick={() => setAuthView(authView === 'sign_in' ? 'sign_up' : 'sign_in')} 
                    className="text-blue-600 hover:text-blue-500 font-semibold transition-colors duration-200 hover:underline"
                  >
                    {authView === 'sign_in' ? 'Create your account here' : 'Sign in here'}
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Professional Footer */}
          <div className="text-center">
            <div className="text-xs text-slate-500 space-y-2">
              <div className="flex items-center justify-center space-x-4">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="font-medium">Enterprise-Grade Security</span>
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              </div>
              <p>Need assistance? Contact our support team</p>
              <p className="font-medium text-slate-600">Professional MEP Solutions Platform</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}