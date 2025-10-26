import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { gmailService } from '../lib/gmail';

interface GmailAuthState {
  isGmailConnected: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  userEmail: string | null;
}

export function useGmailAuth() {
  const [state, setState] = useState<GmailAuthState>({
    isGmailConnected: false,
    isLoading: true,
    error: null,
    accessToken: null,
    userEmail: null,
  });

  useEffect(() => {
    console.log('📧 useGmailAuth: Initializing Gmail auth state');
    checkGmailConnection();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('📧 useGmailAuth: Auth state change', { 
          event, 
          hasProviderToken: !!session?.provider_token 
        });
        
        if (event === 'SIGNED_IN' && session?.provider_token) {
          console.log('📧 useGmailAuth: User signed in with provider token, verifying Gmail connection');
          await verifyGmailConnection(session.provider_token, session.user?.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('📧 useGmailAuth: User signed out, clearing Gmail state');
          setState({
            isGmailConnected: false,
            isLoading: false,
            error: null,
            accessToken: null,
            userEmail: null,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const checkGmailConnection = async () => {
    try {
      console.log('📧 useGmailAuth: Checking Gmail connection');
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📧 useGmailAuth: Current session', { 
        hasSession: !!session, 
        hasProviderToken: !!session?.provider_token 
      });
      
      if (session?.provider_token && session?.user?.email) {
        console.log('📧 useGmailAuth: Session has provider token, verifying connection');
        await verifyGmailConnection(session.provider_token, session.user.email);
      } else {
        console.log('📧 useGmailAuth: No provider token, setting disconnected state');
        setState(prev => ({
          ...prev,
          isGmailConnected: false,
          isLoading: false,
        }));
      }
    } catch (error) {
      console.error('📧 useGmailAuth: Error checking Gmail connection:', error);
      setState(prev => ({
        ...prev,
        isGmailConnected: false,
        isLoading: false,
        error: 'Failed to check Gmail connection',
      }));
    }
  };

  const verifyGmailConnection = async (accessToken: string, email: string) => {
    try {
      console.log('📧 useGmailAuth: Verifying Gmail connection for email:', email);
      
      // Set the access token in Gmail service
      gmailService.setAccessToken(accessToken);
      
      // Test the connection by making a simple API call
      const isConnected = await gmailService.testConnection();
      console.log('📧 useGmailAuth: Gmail connection test result:', isConnected);
      
      setState({
        isGmailConnected: isConnected,
        isLoading: false,
        error: isConnected 
          ? null 
          : 'Gmail API connection failed - ensure scopes are configured in Supabase',
        accessToken: isConnected ? accessToken : null,
        userEmail: isConnected ? email : null,
      });
    } catch (error) {
      console.error('📧 useGmailAuth: Error verifying Gmail connection:', error);
      setState({
        isGmailConnected: false,
        isLoading: false,
        error: 'Failed to verify Gmail connection - check scopes configuration',
        accessToken: null,
        userEmail: null,
      });
    }
  };

const connectGmail = async () => {
  try {
    console.log('📧 useGmailAuth: Initiating Gmail connection');
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    // Use Supabase's Google OAuth with Gmail scopes
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send email profile',
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      },
    });

    if (error) throw error;
    console.log('📧 useGmailAuth: OAuth initiated successfully');
  } catch (error) {
    console.error('📧 useGmailAuth: Error connecting Gmail:', error);
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: 'Failed to connect Gmail account',
    }));
  }
};

  const disconnectGmail = async () => {
    try {
      console.log('📧 useGmailAuth: Disconnecting Gmail');
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Sign out to remove the OAuth tokens
      await supabase.auth.signOut();
      console.log('📧 useGmailAuth: Gmail disconnected successfully');
      
      setState({
        isGmailConnected: false,
        isLoading: false,
        error: null,
        accessToken: null,
        userEmail: null,
      });
    } catch (error) {
      console.error('📧 useGmailAuth: Error disconnecting Gmail:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to disconnect Gmail account',
      }));
    }
  };

  const refreshConnection = async () => {
    console.log('📧 useGmailAuth: Refreshing Gmail connection');
    await checkGmailConnection();
  };

  return {
    ...state,
    connectGmail,
    disconnectGmail,
    refreshConnection,
  };
}
