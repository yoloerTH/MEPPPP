import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UserProfile {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  job_title: string;
  website?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true
  });

  useEffect(() => {
    console.log('🔐 useAuth: Initializing authentication state');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔐 useAuth: Initial session fetched', { 
        hasSession: !!session, 
        hasUser: !!session?.user,
        userEmail: session?.user?.email 
      });
      
      setState(prev => ({
        ...prev,
        session,
        user: session?.user || null,
        loading: false
      }));

      if (session?.user) {
        console.log('🔐 useAuth: Loading user profile for user:', session.user.id);
        loadUserProfile(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 useAuth: Auth state change event:', event, { 
          hasSession: !!session, 
          hasUser: !!session?.user 
        });
        
        setState(prev => ({
          ...prev,
          session,
          user: session?.user || null,
          loading: false
        }));

        if (session?.user) {
          console.log('🔐 useAuth: Loading profile after auth change for user:', session.user.id);
          await loadUserProfile(session.user.id);
        } else {
          console.log('🔐 useAuth: No session, clearing profile');
          setState(prev => ({ ...prev, profile: null }));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Auto-create profile for new users (only once)
  useEffect(() => {
    if (state.user && !state.profile && !state.loading) {
      console.log('🔐 useAuth: Auto-creating profile for new user:', state.user.id);
      createInitialProfile(state.user);
    }
  }, [state.user?.id, state.profile, state.loading]); // ✅ More specific dependency

  const createInitialProfile = async (user: User) => {
    try {
      console.log('🔐 useAuth: Creating initial profile for user:', user.id);
      
      // Check if profile already exists (prevents 409 conflict)
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*') 
        .eq('user_id', user.id)
        .maybeSingle(); // ✅ Returns single object or null, not array

      if (existingProfile) {
        console.log('🔐 useAuth: Found existing profile, setting state');
        setState(prev => ({ ...prev, profile: existingProfile }));
        return;
      }

      console.log('🔐 useAuth: No existing profile found, creating new one');
      
      // Create initial profile from Google OAuth data
      const initialProfile = {
        user_id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        email: user.email || '',
        company_name: '',
        phone: '',
        address: '',
        job_title: 'MEP Professional',
        website: ''
      };

      const { data: newProfile, error } = await supabase
        .from('user_profiles')
        .insert(initialProfile)
        .select()
        .single();

      if (error) {
        console.error('🔐 useAuth: Error creating initial profile:', error);
        return;
      }

      console.log('🔐 useAuth: Successfully created new profile');
      // ✅ Update state immediately after creation
      setState(prev => ({ ...prev, profile: newProfile }));
      
    } catch (error) {
      console.error('🔐 useAuth: Error in createInitialProfile:', error);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('🔐 useAuth: Loading user profile for ID:', userId);
      
      // ✅ Use maybeSingle() for consistency - returns object or null, not array
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('🔐 useAuth: Error loading profile:', error);
        return;
      }

      if (profile) {
        console.log('🔐 useAuth: Profile loaded successfully');
        setState(prev => ({ ...prev, profile }));
      } else {
        console.log('🔐 useAuth: No profile found for user, auto-create will trigger');
        // Profile doesn't exist, createInitialProfile useEffect will handle it
      }
      
    } catch (error) {
      console.error('🔐 useAuth: Error loading user profile:', error);
    }
  };

  const refreshProfile = () => {
    console.log('🔐 useAuth: Refreshing profile');
    if (state.user) {
      loadUserProfile(state.user.id);
    }
  };

  return {
    ...state,
    refreshProfile
  };
}
