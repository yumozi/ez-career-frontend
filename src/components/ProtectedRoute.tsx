import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

// Set cookie with expiration
function setCookie(name: string, value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

// Get cookie value
function getCookie(name: string) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboardingRequired, setOnboardingRequired] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check if the user has completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        // Skip onboarding check if already on the onboarding page
        if (location.pathname === '/onboarding') {
          setOnboardingRequired(false);
          setCheckingOnboarding(false);
          return;
        }

        // Check if onboarding has been skipped via cookie (preferred) or localStorage (fallback)
        const onboardingSkippedCookie = getCookie('onboarding_skipped');
        const onboardingSkippedStorage = localStorage.getItem('onboarding_skipped');

        if (onboardingSkippedCookie === 'true' || onboardingSkippedStorage === 'true') {
          // Ensure both storage mechanisms are in sync
          setCookie('onboarding_skipped', 'true', 30); // 30 days
          localStorage.setItem('onboarding_skipped', 'true');

          setOnboardingRequired(false);
          setCheckingOnboarding(false);
          return;
        }

        // Check for profile data - wrap in try/catch to handle potential errors
        let hasProfile = false;
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          hasProfile = !!profileData;
        } catch (e) {
          console.log('Profile check error, assuming no profile exists');
        }

        // Check for job preferences - wrap in try/catch to handle potential errors
        let hasPreferences = false;
        try {
          const { data: preferencesData } = await supabase
            .from('job_preferences')
            .select('id')
            .eq('user_id', user.id)
            .single();

          hasPreferences = !!preferencesData;
        } catch (e) {
          console.log('Preferences check error, assuming no preferences exist');
        }

        // If either profile or preferences are missing and no skip flag is set, onboarding is required
        const needsOnboarding = !hasProfile || !hasPreferences;

        if (needsOnboarding) {
          console.log('Onboarding required: Missing profile or preferences data');
          toast({
            title: "Profile setup required",
            description: "You can either complete the profile setup or skip it for now."
          });
        }

        setOnboardingRequired(needsOnboarding);
        setCheckingOnboarding(false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If there's an error in the database checks, don't force onboarding
        setOnboardingRequired(false);
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [user, location.pathname]);

  // Show loading state while checking authentication or onboarding
  if (loading || checkingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if required
  if (onboardingRequired && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Render child routes if authenticated
  return <Outlet />;
} 