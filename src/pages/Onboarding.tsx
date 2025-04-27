import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import InteractionPanel from "@/components/onboarding/InteractionPanel";
import ConversationPanel from "@/components/onboarding/ConversationPanel";
import { OnboardingProvider } from "@/components/onboarding/OnboardingContext";
import { Button } from "@/components/ui/button";
import { FaArrowRight } from "react-icons/fa";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

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

export default function Onboarding() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSkipping, setIsSkipping] = useState(false);

    const handleSkipOnboarding = () => {
        if (isSkipping) return; // Prevent multiple clicks
        setIsSkipping(true);

        // Show immediate visual feedback
        toast({
            title: "Skipping onboarding...",
            description: "Redirecting to dashboard...",
            duration: 2000,
        });

        // Mark onboarding as skipped in both localStorage and cookies for redundancy
        localStorage.setItem('onboarding_skipped', 'true');
        setCookie('onboarding_skipped', 'true', 30); // 30 days

        // Force a reload instead of using navigate
        // This ensures a clean state and proper reading of the new cookie/localStorage values
        setTimeout(() => {
            window.location.href = "/";
        }, 500); // Small delay to ensure storage is updated
    };

    // Check if user has already completed onboarding
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (!user) return;

            try {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                const { data: preferencesData } = await supabase
                    .from('job_preferences')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                // If user has both profile and preferences data, redirect to dashboard
                if (profileData && preferencesData) {
                    navigate('/');
                }
            } catch (error) {
                console.error('Error checking onboarding status:', error);
            }
        };

        checkOnboardingStatus();
    }, [user, navigate]);

    return (
        <OnboardingProvider>
            {/* Skip button with high visibility */}
            <div className="fixed top-6 right-6 z-50">
                <Button
                    onClick={handleSkipOnboarding}
                    disabled={isSkipping}
                    className="bg-primary text-white hover:bg-primary/90 shadow-lg px-4 py-2 font-medium"
                    size="lg"
                >
                    {isSkipping ? "Skipping..." : "Skip Onboarding"} {!isSkipping && <FaArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </div>

            <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-background to-background/95">
                <div className="flex w-full flex-col md:flex-row">
                    {/* Interaction Panel (Left side) - Where user takes actions */}
                    <div className="md:w-5/12 w-full h-1/3 md:h-full bg-background border-r border-border/50">
                        <InteractionPanel />
                    </div>

                    {/* Conversation Panel (Right side) - Shows conversation history */}
                    <div className="md:w-7/12 w-full h-2/3 md:h-full bg-background">
                        <ConversationPanel />
                    </div>
                </div>
            </div>
            <Toaster />
        </OnboardingProvider>
    );
} 