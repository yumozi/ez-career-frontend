import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    success: boolean;
  }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Profile creation is now strictly limited to new sign-ups only
// This function will only be called once after a new user signs up
const createUserProfile = async (userId: string) => {
  try {
    // Check if profile exists with a direct count query
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (countError) {
      console.error('Error checking for existing profile:', countError);
      return;
    }
    
    // Only create a profile if the count is zero (no profile exists)
    if (count === 0) {
      console.log('No profile found, creating new profile for user:', userId);
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          first_name: null,
          last_name: null,
          email: null,
          phone: null,
          resume_url: null,
          resume_text: null,
          created_at: new Date(),
          updated_at: new Date()
        });
      
      if (insertError) {
        console.error('Error creating user profile:', insertError);
      } else {
        console.log('Successfully created profile for user:', userId);
      }
    } else {
      console.log('Profile already exists for user:', userId);
    }
  } catch (error) {
    console.error('Error in createUserProfile:', error);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCreatedProfile, setHasCreatedProfile] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // One-time check for profile only on initial load
      // and only if we haven't already created one
      if (session?.user && !hasCreatedProfile) {
        createUserProfile(session.user.id);
        setHasCreatedProfile(true);
      }
      
      setLoading(false);
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Only create profile on sign-up event, not on every auth change
      if (event === 'SIGNED_UP' && session?.user) {
        createUserProfile(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hasCreatedProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      // No profile creation on regular sign-in
      
      return { 
        error, 
        success: !error 
      };
    } catch (error) {
      return { 
        error: error as Error, 
        success: false 
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 