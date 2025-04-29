import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import InteractionPanel from "@/components/onboarding/InteractionPanel";
import ConversationPanel from "@/components/onboarding/ConversationPanel";
import { OnboardingProvider } from "@/components/onboarding/OnboardingContext";
import { Button } from "@/components/ui/button";
import { FaArrowRight, FaNotesMedical } from "react-icons/fa";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

function OnboardingContent() {
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
        <>
            {/* Skip button with high visibility */}
            <div className="fixed top-6 right-6 z-50">
                <Button
                    onClick={handleSkipOnboarding}
                    disabled={isSkipping}
                    className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg px-4 py-2 font-medium"
                    size="lg"
                >
                    {isSkipping ? "Skipping..." : "Skip Onboarding"} {!isSkipping && <FaArrowRight className="ml-2 h-4 w-4" />}
                </Button>
            </div>

            <div className="flex h-screen w-full overflow-hidden">
                <div className="flex w-full h-full">
                    {/* AI Notebook Panel (Left side) */}
                    <div className="w-5/12 h-full relative">
                        {/* Shadow element */}
                        <div className="absolute inset-0 bg-blue-50 rounded-tr-3xl rounded-br-3xl right-[-15px] z-0" style={{
                            boxShadow: "10px 0 25px rgba(0, 0, 100, 0.1)"
                        }}></div>

                        {/* Content container */}
                        <div className="absolute inset-0 bg-blue-50 rounded-tr-3xl rounded-br-3xl z-10 flex flex-col">
                            {/* Header with title */}
                            <div className="py-8 px-10 flex-shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="flex-shrink-0 bg-blue-100 p-3.5 rounded-full shadow-sm">
                                        <FaNotesMedical className="h-7 w-7 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-medium text-gray-800 mb-1">We are taking notes for your job preference</h2>
                                    </div>
                                </div>
                            </div>

                            {/* The InteractionPanel (now shows a summary of user data) */}
                            <div className="flex-1 px-10 pb-8 overflow-hidden">
                                <div className="bg-white h-full rounded-2xl overflow-auto shadow-sm">
                                    <InteractionPanel showHeader={false} showNavigation={false} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Conversation & Interactive Panel (Right side) */}
                    <div className="w-7/12 h-full bg-white overflow-hidden">
                        <ConversationPanel />
                    </div>
                </div>
            </div>
            <Toaster />
        </>
    );
}

export default function Onboarding() {
    return (
        <OnboardingProvider>
            <OnboardingContent />
        </OnboardingProvider>
    );
} 