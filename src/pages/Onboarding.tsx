import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import InteractionPanel from "@/components/onboarding/InteractionPanel";
import ConversationPanel from "@/components/onboarding/ConversationPanel";
import { OnboardingProvider, useOnboarding } from "@/components/onboarding/OnboardingContext";
import { Button } from "@/components/ui/button";
import { FaArrowRight, FaNotesMedical, FaCheck } from "react-icons/fa";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

function OnboardingContent() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSkipping, setIsSkipping] = useState(false);
    const {
        progressPercentage,
        currentStep,
        agentStatus,
        isUploading,
        goToNextStep,
        goToPreviousStep,
        saveOnboardingData,
        onboardingData
    } = useOnboarding();

    // Local function to determine if next button should be shown
    const shouldShowNextButton = () => {
        if (agentStatus === 'processing_resume' || agentStatus === 'analyzing_data' || isUploading) {
            return false;
        }

        switch (currentStep) {
            case 'job_titles':
                return onboardingData.jobPreference.job_titles.length > 0;
            case 'experience_level':
                return !!onboardingData.jobPreference.experience_level;
            case 'salary_expectations':
                return !!onboardingData.jobPreference.salary_range;
            case 'job_search_status':
                return !!onboardingData.jobPreference.job_search_status;
            case 'resume_upload':
                return false; // This advances automatically after upload
            case 'skills_verification':
                return onboardingData.userSkills.length > 0;
            case 'location_preferences':
                return onboardingData.jobPreference.preferred_locations.length > 0;
            case 'remote_preferences':
                return true; // This is just a boolean switch, so always allow next
            case 'industry_preferences':
                return onboardingData.jobPreference.preferred_industries.length > 0;
            default:
                return true;
        }
    };

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
                    {/* Interaction Panel with dramatic shadow */}
                    <div className="w-5/12 h-full relative">
                        {/* Shadow element */}
                        <div className="absolute inset-0 bg-blue-50 rounded-tr-3xl rounded-br-3xl right-[-15px] z-0" style={{
                            boxShadow: "10px 0 25px rgba(0, 0, 100, 0.1)"
                        }}></div>

                        {/* Content container */}
                        <div className="absolute inset-0 bg-blue-50 rounded-tr-3xl rounded-br-3xl z-10 flex flex-col">
                            {/* Header moved to blue background */}
                            <div className="py-6 px-8">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full">
                                        <FaNotesMedical className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-medium">We are taking notes for your job preference</h2>
                                        <p className="text-sm text-slate-500">Please complete all sections</p>
                                    </div>
                                </div>

                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${progressPercentage}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-right mt-1 text-slate-500">
                                    {Math.round(progressPercentage)}% Complete
                                </p>
                            </div>

                            {/* The InteractionPanel without its header and navigation buttons */}
                            <div className="flex-1 p-6 pl-8 pr-8 pb-0">
                                <div className="bg-white h-full rounded-2xl overflow-hidden">
                                    <InteractionPanel showHeader={false} showNavigation={false} />
                                </div>
                            </div>

                            {/* Navigation buttons moved to blue padding */}
                            <div className="px-8 pt-4 pb-6 flex justify-between">
                                <Button
                                    variant="ghost"
                                    onClick={goToPreviousStep}
                                    disabled={currentStep === 'welcome' || agentStatus === 'processing_resume' || agentStatus === 'analyzing_data' || isUploading}
                                    className="text-slate-700 hover:text-slate-900 hover:bg-blue-100"
                                >
                                    Back
                                </Button>

                                {shouldShowNextButton() && currentStep !== 'completion' && (
                                    <Button
                                        onClick={goToNextStep}
                                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                    >
                                        Next <FaArrowRight className="ml-1 h-3.5 w-3.5" />
                                    </Button>
                                )}

                                {currentStep === 'completion' && (
                                    <Button
                                        onClick={saveOnboardingData}
                                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                                    >
                                        Complete <FaCheck className="ml-1 h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Conversation Panel (Right side) */}
                    <div className="w-7/12 h-full bg-white">
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