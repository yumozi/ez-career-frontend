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

export default function Onboarding() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSkipping, setIsSkipping] = useState(false);

    const handleSkipOnboarding = async () => {
        if (isSkipping || !user) return; // Prevent multiple clicks or if no user
        setIsSkipping(true);

        // Show immediate visual feedback
        toast({
            title: "Skipping onboarding...",
            description: "Redirecting to dashboard...",
            duration: 2000,
        });

        try {
            // Update the profile to mark onboarding as done
            await supabase
                .from('profiles')
                .update({ done_onboarding: true })
                .eq('user_id', user.id);
                
            // Force a reload instead of using navigate
            // This ensures a clean state
            setTimeout(() => {
                window.location.href = "/";
            }, 500); // Small delay to ensure storage is updated
        } catch (error) {
            console.error('Error updating onboarding status:', error);
            setIsSkipping(false);
            toast({
                title: "Error",
                description: "Failed to skip onboarding. Please try again.",
                duration: 3000,
            });
        }
    };

    // Check if user has already completed onboarding
    useEffect(() => {
        const checkOnboardingStatus = async () => {
            if (!user) return;

            try {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('done_onboarding')
                    .eq('user_id', user.id)
                    .single();

                // If user has already completed onboarding, redirect to dashboard
                if (profileData?.done_onboarding === true) {
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