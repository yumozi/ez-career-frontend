import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

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

        // Check profile data and done_onboarding status
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('done_onboarding')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // If no profile exists or error occurs, onboarding is required
          setOnboardingRequired(true);
          setCheckingOnboarding(false);
          return;
        }

        // Check if onboarding is done based on the done_onboarding field
        // If done_onboarding is false or null, onboarding is required
        const needsOnboarding = profileData.done_onboarding !== true;

        if (needsOnboarding) {
          console.log('Onboarding required: done_onboarding is false');
          toast({
            title: "Profile setup required",
            description: "You can either complete the profile setup or skip it for now."
          });
        }

        setOnboardingRequired(needsOnboarding);
        setCheckingOnboarding(false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If there's an error in the database checks, default to requiring onboarding
        setOnboardingRequired(true);
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