import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaRobot, FaUser, FaInfo, FaCheckCircle, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import { useOnboarding, Message } from './OnboardingContext';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import {
    ResumeUploader,
    OptionSelector,
    TextInputWithAdd,
    SelectedItemsDisplay,
    BooleanToggle,
    SuggestedItems,
    ConfirmationButtons
} from './InteractionComponents';

// Define the types locally
interface JobPreference {
    job_titles: string[];
    experience_level: string;
    salary_range: string;
    job_search_status: string;
    preferred_locations: string[];
    remote_preference: boolean;
    preferred_industries: string[];
}

interface UserSkill {
    skill_name: string;
    proficiency_level?: string;
    is_highlighted: boolean;
    source: 'resume' | 'user_input' | 'agent_suggestion';
}

export default function ConversationPanel() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        messages,
        saveOnboardingData,
        currentStep,
        agentStatus,
        addMessage,
        setAgentMessage,
        setAgentStatus,
        onboardingData,
        updateJobPreference,
        uploadResume,
        addSkill,
        removeSkill,
        goToNextStep,
        cleanupDuplicateMessages,
        setCurrentStep,
        setProgressPercentage,
        setMessages
    } = useOnboarding();

    // Get the step order and progress map from useOnboarding - we'll define these here since they're not exported
    const stepOrder: string[] = [
        'welcome',
        'resume_upload',
        'resume_analysis',
        'job_titles',
        'experience_level',
        'salary_expectations',
        'job_search_status',
        'skills_verification',
        'location_preferences',
        'remote_preferences',
        'industry_preferences',
        'completion'
    ];

    const stepProgressMap: Record<string, number> = {
        welcome: 0,
        resume_upload: 10,
        resume_analysis: 20,
        job_titles: 30,
        experience_level: 40,
        salary_expectations: 50,
        job_search_status: 60,
        skills_verification: 70,
        location_preferences: 80,
        remote_preferences: 90,
        industry_preferences: 95,
        completion: 100
    };

    const [userInput, setUserInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [lastProcessingStatus, setLastProcessingStatus] = useState<string | null>(null);
    const [processProgress, setProcessProgress] = useState(10);
    const progressIntervalRef = useRef<number | null>(null);
    const [newLocationInput, setNewLocationInput] = useState('');
    const [newIndustryInput, setNewIndustryInput] = useState('');
    const [newJobTitleInput, setNewJobTitleInput] = useState('');
    const [newSkillInput, setNewSkillInput] = useState('');
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<{
        suggested_job_titles: string[];
        recommended_experience_level: string;
        recommended_salary_range: string;
        skills: string[];
        recommended_locations: string[];
        other_locations: string[];
        recommended_industries: string[];
        other_industries: string[];
    } | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [processingComplete, setProcessingComplete] = useState(false);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle status changes for processing/analyzing
    useEffect(() => {
        // When status changes to processing or analyzing, add a message if we haven't already
        if ((agentStatus === 'processing_resume' || agentStatus === 'analyzing_data') &&
            lastProcessingStatus !== agentStatus) {

            const statusMessage = agentStatus === 'processing_resume'
                ? "I'm processing your resume... This may take a moment."
                : "I'm analyzing your information to personalize your experience...";

            addMessage({
                sender: 'agent',
                content: statusMessage,
                type: 'text'
            });

            setLastProcessingStatus(agentStatus);
        }

        // Reset tracking when status changes to something else
        if (agentStatus !== 'processing_resume' && agentStatus !== 'analyzing_data') {
            setLastProcessingStatus(null);
        }
    }, [agentStatus, addMessage, lastProcessingStatus]);

    // If current step is 'completion', ensure done_onboarding is set to true
    useEffect(() => {
        const markOnboardingComplete = async () => {
            if (currentStep === 'completion' && user) {
                try {
                    // Update profile to mark onboarding as done
                    const { error } = await supabase
                        .from('profiles')
                        .update({ done_onboarding: true })
                        .eq('user_id', user.id);

                    if (error) {
                        console.error('Error marking onboarding as complete:', error);
                    }
                } catch (err) {
                    console.error('Failed to mark onboarding as complete:', err);
                }
            }
        };

        markOnboardingComplete();
    }, [currentStep, user]);

    // Function to fetch suggestions from the backend
    const fetchSuggestions = async () => {
        try {
            setIsFetchingSuggestions(true);

            const auth = await supabase.auth.getSession();
            const user = auth.data.session?.user;

            if (!user) {
                throw new Error('User not authenticated');
            }

            // Call the suggestions endpoint
            const response = await fetch('http://localhost:8000/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.id,
                }),
            });

            if (!response.ok) {
                throw new Error(`Suggestions API failed with status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Suggestions received:', data);

            // Set the suggestions
            setSuggestions(data);

        } catch (error) {
            console.error('Error fetching suggestions:', error);
            toast({
                title: "Suggestion Generation Failed",
                description: "We couldn't generate personalized suggestions from your resume.",
                variant: "destructive",
            });

            // Set suggestions to null
            setSuggestions(null);
        } finally {
            setIsFetchingSuggestions(false);
        }
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || isSending) return;

        setIsSending(true);

        // Add user message to chat
        addMessage({
            sender: 'user',
            content: userInput.trim(),
            type: 'text'
        });

        // Clear input field
        setUserInput('');

        // Show agent is thinking
        setAgentStatus('thinking');

        // Simulate agent thinking (in a real app, this would be an API call)
        setTimeout(() => {
            // Add agent response with clearer instructions for each step
            let responseMessage = "I'm here to help you set up your profile. ";

            switch (currentStep) {
                case 'welcome':
                    responseMessage += "Let's get started by uploading your resume. Please use the upload button below.";
                    break;
                case 'resume_upload':
                    responseMessage += "Please upload your resume using the button below so I can help personalize your profile.";
                    break;
                case 'job_titles':
                    responseMessage += "Please add job titles you're interested in using the input field below. You can add multiple titles.";
                    break;
                case 'experience_level':
                    responseMessage += "Please select your experience level from the options below.";
                    break;
                case 'salary_expectations':
                    responseMessage += "What are your salary expectations? Please select an option below.";
                    break;
                case 'job_search_status':
                    responseMessage += "What is your current job search status? Select the option that best describes your situation.";
                    break;
                case 'skills_verification':
                    responseMessage += "I've identified these skills from your resume. Please confirm them, add any missing ones, or highlight important skills using the star icon.";
                    break;
                case 'location_preferences':
                    responseMessage += "Where would you prefer to work? Add your preferred locations using the input field below.";
                    break;
                case 'remote_preferences':
                    responseMessage += "Are you open to remote work? Please toggle the switch below to indicate your preference.";
                    break;
                case 'industry_preferences':
                    responseMessage += "What industries are you interested in? Add them using the input field below.";
                    break;
                case 'completion':
                    responseMessage += "Great! We've completed your profile setup. Please review your information in the left panel and click 'Looks Good' if everything is correct.";
                    break;
                default:
                    responseMessage += "Please follow the instructions below to continue with your profile setup.";
            }

            addMessage({
                sender: 'agent',
                content: responseMessage,
                type: 'text'
            });

            setAgentStatus('waiting_for_input');
            setIsSending(false);

            // Focus back on input
            inputRef.current?.focus();
        }, 1500);
    };

    const handleComplete = async () => {
        try {
            // Try to save all onboarding data first
            const success = await saveOnboardingData();

            // Even if data saving fails, ensure done_onboarding is set to true
            if (!success && user) {
                try {
                    await supabase
                        .from('profiles')
                        .update({ done_onboarding: true })
                        .eq('user_id', user.id);

                    toast({
                        title: "Onboarding completed",
                        description: "Some data may not have been saved, but your onboarding is marked as complete."
                    });
                } catch (error) {
                    console.error('Error marking onboarding as complete:', error);
                }
            }

            // Navigate to dashboard regardless of saving status
            navigate('/');

        } catch (error) {
            console.error('Error during onboarding completion:', error);

            // Still try to navigate away even if there was an error
            navigate('/');
        }
    };

    // Add useEffect to clean up duplicate messages when component mounts and after new messages are added
    useEffect(() => {
        // Clean up duplicates whenever messages change
        cleanupDuplicateMessages();

        // Set a timer to clean up duplicates periodically
        const timer = setInterval(() => {
            cleanupDuplicateMessages();
        }, 5000); // Clean every 5 seconds

        return () => clearInterval(timer);
    }, [messages, cleanupDuplicateMessages]);

    // Update useEffect to better filter duplicate resume-processing messages
    useEffect(() => {
        // When the step changes, clean up duplicate and conflicting messages
        cleanupDuplicateMessages();

        // If we're in the resume processing step, do a more aggressive cleanup
        // to remove redundant processing messages
        if (currentStep === 'resume_upload' || currentStep === 'resume_analysis') {
            // Additional cleanup for specific resume processing messages
            setMessages(prev => {
                // Find all processing-related messages
                const processingMessages = prev.filter(msg =>
                    msg.sender === 'agent' &&
                    (msg.content.includes("processing your resume") ||
                        msg.content.includes("analyzing your resume") ||
                        msg.content.includes("may take a moment") ||
                        msg.content.includes("Processing your resume"))
                );

                // If there are multiple, keep only the most recent one
                if (processingMessages.length > 1) {
                    const messagesToRemove = processingMessages.slice(0, -1).map(msg => msg.id);
                    console.log(`Removing ${messagesToRemove.length} redundant processing messages`);
                    return prev.filter(msg => !messagesToRemove.includes(msg.id));
                }

                return prev;
            });
        }

        // Short delay and clean again to catch any new messages added during transition
        const timer = setTimeout(() => {
            cleanupDuplicateMessages();
        }, 1000);

        return () => clearTimeout(timer);
    }, [currentStep, cleanupDuplicateMessages]);

    // Replace the animateProgressTo function with a more performant version using requestAnimationFrame
    const animateProgressTo = (targetValue: number, duration: number = 1000) => {
        // Store the start time and progress value
        const startValue = processProgress;
        const startTime = performance.now();
        const changeInValue = targetValue - startValue;

        // Use requestAnimationFrame for smoother animation
        const animate = (currentTime: number) => {
            // Calculate how much time has passed as a percentage of total duration
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);

            // Use easeOutCubic easing function for a more natural animation
            // t: current time, b: start value, c: change in value, d: duration
            const easeOutCubic = (t: number) => {
                t = t - 1;
                return changeInValue * (t * t * t + 1) + startValue;
            };

            // Set the new progress value
            const newValue = easeOutCubic(progress);
            setProcessProgress(newValue);

            // Continue the animation if we're not done
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        // Start the animation
        requestAnimationFrame(animate);
    };

    // Update the renderProcessingIndicator function with more optimized animations
    const renderProcessingIndicator = () => {
        if (agentStatus !== 'processing_resume' && agentStatus !== 'analyzing_data') {
            return null;
        }

        // Get the status description based on progress
        const getStatusDescription = () => {
            if (processProgress < 20) return "Starting resume processing...";
            if (processProgress < 40) return "Extracting text from your resume...";
            if (processProgress < 60) return "Analyzing your resume content...";
            if (processProgress < 80) return "Identifying skills and experience...";
            if (processProgress < 95) return "Generating personalized profile suggestions...";
            return "Finalizing your profile recommendations...";
        };

        // Get a color that gradually shifts from blue to green as progress increases
        const getProgressBarColor = () => {
            const hue = 200 + (processProgress * 0.6); // Gradually shift hue
            return `hsl(${hue}, 80%, 50%)`;
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full p-5 bg-blue-50 border border-blue-100 rounded-lg my-5 shadow-sm"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-blue-700 flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing your resume
                    </div>
                    <div className="text-sm font-medium text-blue-600">{Math.round(processProgress)}%</div>
                </div>
                <div className="h-2.5 w-full bg-blue-100 rounded-full overflow-hidden relative backdrop-blur-0">
                    <motion.div
                        className="h-full rounded-full will-change-transform"
                        style={{
                            width: `${processProgress}%`,
                            backgroundColor: getProgressBarColor(),
                        }}
                        transition={{ ease: "easeOut", duration: 0.2 }}
                    />

                    {/* Use a more subtle, performant animation for the light effect */}
                    <motion.div
                        className="absolute top-0 left-0 h-full w-full overflow-hidden"
                        initial={false}
                    >
                        <motion.div
                            className="absolute top-0 h-full w-10 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
                            animate={{ x: ['-100%', '500%'] }}
                            transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                ease: "linear",
                                repeatType: "loop"
                            }}
                            style={{ willChange: "transform" }}
                        />
                    </motion.div>
                </div>
                <div className="mt-3 text-sm text-blue-600 flex items-center">
                    <motion.div
                        animate={{ opacity: [0.8, 1, 0.8] }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut"
                        }}
                    >
                        {getStatusDescription()}
                    </motion.div>
                </div>
            </motion.div>
        );
    };

    // Helper functions for getting labels
    const getExperienceLevelLabel = (level: string): string => {
        const levelMap: Record<string, string> = {
            'entry_level': 'Entry Level (0-2 years)',
            'mid_level': 'Mid Level (3-5 years)',
            'senior': 'Senior (5-8 years)',
            'lead': 'Lead / Principal (8+ years)',
            'executive': 'Executive / Director'
        };
        return levelMap[level] || level;
    };

    const getSalaryRangeLabel = (range: string): string => {
        const rangeMap: Record<string, string> = {
            'under_50k': 'Under $50K/year',
            '50k_75k': '$50K - $75K/year',
            '75k_100k': '$75K - $100K/year',
            '100k_150k': '$100K - $150K/year',
            '150k_200k': '$150K - $200K/year',
            'over_200k': 'Over $200K/year'
        };
        return rangeMap[range] || range;
    };

    // Create a shared function to handle the continue action with natural messages
    const handleContinueClick = () => {
        // Create a natural-sounding message based on the current step
        let userMessage = "";

        // Helper variables that need to be declared outside of case blocks
        let statusMap: Record<string, string>;
        let status: string;
        let locations: string;
        let industries: string;
        let jobTitles: string;

        switch (currentStep) {
            case 'experience_level':
                userMessage = `My experience level is ${getExperienceLevelLabel(onboardingData.jobPreference.experience_level)}.`;
                break;
            case 'salary_expectations':
                userMessage = `I'm looking for a salary in the range of ${getSalaryRangeLabel(onboardingData.jobPreference.salary_range)}.`;
                break;
            case 'job_search_status':
                statusMap = {
                    'actively_looking': 'actively looking for new opportunities',
                    'passively_looking': 'open to new opportunities, but not actively searching',
                    'not_looking': 'not currently looking for a new position',
                    'urgent': 'urgently seeking new opportunities'
                };
                status = statusMap[onboardingData.jobPreference.job_search_status] || onboardingData.jobPreference.job_search_status;
                userMessage = `I'm ${status}.`;
                break;
            case 'skills_verification':
                userMessage = "These are the skills I'd like to highlight in my profile.";
                break;
            case 'location_preferences':
                locations = onboardingData.jobPreference.preferred_locations.join(', ');
                userMessage = `I'm interested in working in ${locations}.`;
                break;
            case 'remote_preferences':
                userMessage = onboardingData.jobPreference.remote_preference
                    ? "I'm open to remote work opportunities."
                    : "I prefer on-site positions.";
                break;
            case 'industry_preferences':
                industries = onboardingData.jobPreference.preferred_industries.join(', ');
                userMessage = `I'm interested in the following industries: ${industries}.`;
                break;
            case 'job_titles':
                jobTitles = onboardingData.jobPreference.job_titles.join(', ');
                userMessage = `I'm looking for positions like: ${jobTitles}.`;
                break;
            default:
                userMessage = "I'm ready to proceed to the next step.";
        }

        // Add the natural user message
        addMessage({
            sender: 'user',
            content: userMessage,
            type: 'text'
        });

        // Short delay before showing system message and advancing
        setTimeout(() => {
            // Add an acknowledgment message
            addMessage({
                sender: 'agent',
                content: "Thanks for providing that information. Let's continue with the next step.",
                type: 'text'
            });

            // Go to next step
            goToNextStep();
        }, 500);
    };

    // Create "silent" versions of the context functions that set recordInChat to false
    const updateJobPreferenceSilent = (preference: Partial<JobPreference>) => {
        updateJobPreference(preference, false);
    };

    const addSkillSilent = (skill: UserSkill) => {
        addSkill(skill, false);
    };

    // Modify the renderInteractiveElements function to use the custom continue handler
    const renderInteractiveElements = () => {
        // For welcome step or resume_upload step, show the resume uploader UI
        if (currentStep === 'welcome' || currentStep === 'resume_upload') {
            // Check if user already has a resume uploaded
            const hasResume = onboardingData.resume && onboardingData.resume.url && onboardingData.resume.url.length > 0;
            const isProcessing = agentStatus === 'processing_resume' || agentStatus === 'analyzing_data';

            return (
                <div className="flex flex-col items-center w-full">
                    {/* Show upload message ONLY if not processing, not complete, and no resume */}
                    {!isProcessing && !processingComplete && !hasResume && (
                        <div className="bg-blue-50 p-4 mb-4 rounded-lg text-blue-700 w-full text-center">
                            <p className="font-medium">Please upload your resume to get started</p>
                            <p className="text-sm text-blue-600">We'll use it to personalize your profile</p>
                        </div>
                    )}

                    {/* Now handle three separate states:
                        1. No resume yet - show uploader
                        2. Resume uploaded but processing - show progress bar only
                        3. Resume processed completely - show success message and continue button */}
                    {!hasResume ? (
                        /* No resume yet - show uploader */
                        <ResumeUploader onFileSelect={handleFileUpload} />
                    ) : isProcessing ? (
                        /* Processing - show progress bar ONLY */
                        renderProcessingIndicator()
                    ) : processingComplete ? (
                        /* Processing complete - show success and continue button */
                        <div className="mt-4 w-full flex flex-col items-center">
                            <div className="bg-green-50 p-4 mb-4 rounded-lg text-green-700 w-full">
                                <div className="flex items-center justify-center mb-2">
                                    <FaCheckCircle className="h-5 w-5 mr-2 text-green-600" />
                                    <p className="font-medium">Resume successfully processed</p>
                                </div>
                                <p className="text-sm text-green-600 text-center">
                                    {onboardingData.resume.fileName || "Your resume"} is ready
                                </p>
                            </div>
                            <Button
                                onClick={handleContinueAfterProcessing}
                                className="bg-blue-600 hover:bg-blue-700 text-white mt-4 w-40"
                            >
                                Continue
                            </Button>
                        </div>
                    ) : (
                        /* Resume uploaded but not yet processed or failed processing - show uploader again */
                        <ResumeUploader onFileSelect={handleFileUpload} />
                    )}
                </div>
            );
        }

        // For other steps, only render when agent is ready for interaction
        if (!(agentStatus === 'waiting_for_input' || agentStatus === 'idle')) {
            return null;
        }

        // For experience level step
        if (currentStep === 'experience_level') {
            const recommendedExperienceLevel = suggestions?.recommended_experience_level;
            return (
                <>
                    {recommendedExperienceLevel && (
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                            <h3 className="text-sm font-semibold text-blue-700 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Recommended Experience Level
                            </h3>
                            <p className="text-xs text-blue-600 mt-1">Based on your resume, we recommend: {getExperienceLevelLabel(recommendedExperienceLevel)}</p>
                        </div>
                    )}
                    <OptionSelector
                        options={[
                            { value: 'entry_level', label: 'Entry Level (0-2 years)' },
                            { value: 'mid_level', label: 'Mid Level (3-5 years)' },
                            { value: 'senior', label: 'Senior (5-8 years)' },
                            { value: 'lead', label: 'Lead / Principal (8+ years)' },
                            { value: 'executive', label: 'Executive / Director' }
                        ]}
                        onSelect={handleExperienceLevelSelect}
                        selectedValues={onboardingData.jobPreference.experience_level ? [onboardingData.jobPreference.experience_level] : []}
                    />

                    {/* Add Continue button to control when to advance */}
                    {onboardingData.jobPreference.experience_level && (
                        <div className="flex justify-end mt-4">
                            <Button
                                onClick={handleContinueClick}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Continue
                            </Button>
                        </div>
                    )}
                </>
            );
        }

        // Continue with the rest of the existing renderInteractiveElements function...
        // For salary expectations step
        if (currentStep === 'salary_expectations') {
            const recommendedSalaryRange = suggestions?.recommended_salary_range;
            return (
                <>
                    {recommendedSalaryRange && (
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                            <h3 className="text-sm font-semibold text-blue-700 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Recommended Salary Range
                            </h3>
                            <p className="text-xs text-blue-600 mt-1">Based on your experience, we recommend: {getSalaryRangeLabel(recommendedSalaryRange)}</p>
                        </div>
                    )}
                    <OptionSelector
                        options={[
                            { value: 'under_50k', label: 'Under $50K/year' },
                            { value: '50k_75k', label: '$50K - $75K/year' },
                            { value: '75k_100k', label: '$75K - $100K/year' },
                            { value: '100k_150k', label: '$100K - $150K/year' },
                            { value: '150k_200k', label: '$150K - $200K/year' },
                            { value: 'over_200k', label: 'Over $200K/year' }
                        ]}
                        onSelect={handleSalaryRangeSelect}
                        selectedValues={onboardingData.jobPreference.salary_range ? [onboardingData.jobPreference.salary_range] : []}
                    />

                    {/* Add Continue button to control when to advance */}
                    {onboardingData.jobPreference.salary_range && (
                        <div className="flex justify-end mt-4">
                            <Button
                                onClick={handleContinueClick}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Continue
                            </Button>
                        </div>
                    )}
                </>
            );
        }

        // For job titles step
        if (currentStep === 'job_titles') {
            return (
                <div className="space-y-4 mt-2">
                    <TextInputWithAdd
                        placeholder="Add a job title"
                        onAdd={(value) => updateJobPreferenceSilent({
                            job_titles: [...onboardingData.jobPreference.job_titles, value]
                        })}
                    />

                    {onboardingData.jobPreference.job_titles.length > 0 && (
                        <div className="mt-4">
                            <SelectedItemsDisplay
                                items={onboardingData.jobPreference.job_titles}
                                onRemove={(item) => updateJobPreferenceSilent({
                                    job_titles: onboardingData.jobPreference.job_titles.filter(t => t !== item)
                                })}
                            />
                        </div>
                    )}

                    {/* Display suggested job titles if available */}
                    {suggestions?.suggested_job_titles && suggestions.suggested_job_titles.length > 0 && (
                        <div className="mt-6">
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-blue-700 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Recommended Job Titles
                                    </h3>
                                    <button
                                        onClick={() => {
                                            // Get only suggestions that aren't already selected
                                            const newTitles = suggestions.suggested_job_titles.filter(
                                                title => !onboardingData.jobPreference.job_titles.includes(title)
                                            );

                                            if (newTitles.length > 0) {
                                                updateJobPreferenceSilent({
                                                    job_titles: [...onboardingData.jobPreference.job_titles, ...newTitles]
                                                });
                                            }
                                        }}
                                        className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                                    >
                                        Select All
                                    </button>
                                </div>
                                <p className="text-xs text-blue-600 mt-1">These suggestions are based on your resume - click to add</p>
                            </div>
                            <SuggestedItems
                                items={suggestions.suggested_job_titles}
                                onAdd={(item) => updateJobPreferenceSilent({
                                    job_titles: [...onboardingData.jobPreference.job_titles, item]
                                })}
                                currentItems={onboardingData.jobPreference.job_titles}
                            />
                        </div>
                    )}

                    {onboardingData.jobPreference.job_titles.length > 0 && (
                        <div className="flex justify-end mt-6">
                            <Button
                                onClick={handleContinueClick}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Continue
                            </Button>
                        </div>
                    )}
                </div>
            );
        }

        // For all other steps, use the existing switch case
        switch (currentStep) {
            case 'job_search_status':
                return (
                    <div className="space-y-4">
                        <OptionSelector
                            options={[
                                { value: 'actively_looking', label: 'Actively looking' },
                                { value: 'passively_looking', label: 'Passively looking' },
                                { value: 'not_looking', label: 'Not currently looking' },
                                { value: 'urgent', label: 'Urgently seeking opportunities' }
                            ]}
                            onSelect={handleJobSearchStatusSelect}
                            selectedValues={onboardingData.jobPreference.job_search_status ? [onboardingData.jobPreference.job_search_status] : []}
                        />

                        {/* Add Continue button to control when to advance */}
                        {onboardingData.jobPreference.job_search_status && (
                            <div className="flex justify-end mt-4">
                                <Button
                                    onClick={handleContinueClick}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Continue
                                </Button>
                            </div>
                        )}
                    </div>
                );

            case 'skills_verification':
                return (
                    <div className="space-y-4">
                        <TextInputWithAdd
                            placeholder="Add a skill"
                            onAdd={(value) => addSkillSilent({
                                skill_name: value,
                                is_highlighted: false,
                                source: 'user_input'
                            })}
                        />

                        {onboardingData.userSkills.length > 0 && (
                            <div className="mt-2">
                                <p className="text-sm font-medium mb-2">Your skills (highlight important ones with the star):</p>
                                <SelectedItemsDisplay
                                    items={onboardingData.userSkills.map(s => s.skill_name)}
                                    onRemove={removeSkill}
                                    highlightable={true}
                                    onToggleHighlight={toggleSkillHighlight}
                                    highlightedItems={onboardingData.userSkills.filter(s => s.is_highlighted).map(s => s.skill_name)}
                                />
                            </div>
                        )}

                        {/* Display suggested skills if available */}
                        {suggestions?.skills && suggestions.skills.length > 0 && (
                            <div className="mt-4">
                                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-semibold text-blue-700 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Recommended Skills
                                        </h3>
                                        <button
                                            onClick={() => {
                                                // Get only suggestions that aren't already added
                                                const existingSkills = onboardingData.userSkills.map(s => s.skill_name);
                                                const newSkills = suggestions.skills.filter(
                                                    skill => !existingSkills.includes(skill)
                                                );

                                                // Add each new skill
                                                newSkills.forEach(skill => {
                                                    addSkillSilent({
                                                        skill_name: skill,
                                                        is_highlighted: false,
                                                        source: 'resume'
                                                    });
                                                });
                                            }}
                                            className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                                        >
                                            Select All
                                        </button>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-1">These skills were extracted from your resume - click to add</p>
                                </div>
                                <SuggestedItems
                                    items={suggestions.skills}
                                    onAdd={(item) => addSkillSilent({
                                        skill_name: item,
                                        is_highlighted: false,
                                        source: 'resume'
                                    })}
                                    currentItems={onboardingData.userSkills.map(s => s.skill_name)}
                                />
                            </div>
                        )}

                        {onboardingData.userSkills.length > 0 && (
                            <div className="flex justify-end mt-4">
                                <Button
                                    onClick={handleContinueClick}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Continue
                                </Button>
                            </div>
                        )}
                    </div>
                );

            case 'location_preferences':
                return (
                    <div className="space-y-4">
                        <TextInputWithAdd
                            placeholder="Add a location"
                            onAdd={(value) => updateJobPreferenceSilent({
                                preferred_locations: [...onboardingData.jobPreference.preferred_locations, value]
                            })}
                        />

                        {onboardingData.jobPreference.preferred_locations.length > 0 && (
                            <SelectedItemsDisplay
                                items={onboardingData.jobPreference.preferred_locations}
                                onRemove={(item) => updateJobPreferenceSilent({
                                    preferred_locations: onboardingData.jobPreference.preferred_locations.filter(l => l !== item)
                                })}
                            />
                        )}

                        {/* Display suggested locations if available */}
                        {suggestions?.recommended_locations && suggestions.recommended_locations.length > 0 && (
                            <div className="mt-4">
                                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-semibold text-blue-700 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Recommended Locations
                                        </h3>
                                        <button
                                            onClick={() => {
                                                // Get only suggestions that aren't already selected
                                                const newLocations = suggestions.recommended_locations.filter(
                                                    location => !onboardingData.jobPreference.preferred_locations.includes(location)
                                                );

                                                if (newLocations.length > 0) {
                                                    updateJobPreferenceSilent({
                                                        preferred_locations: [...onboardingData.jobPreference.preferred_locations, ...newLocations]
                                                    });
                                                }
                                            }}
                                            className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                                        >
                                            Select All
                                        </button>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-1">These locations are based on your resume - click to add</p>
                                </div>
                                <SuggestedItems
                                    items={suggestions.recommended_locations}
                                    onAdd={(item) => updateJobPreferenceSilent({
                                        preferred_locations: [...onboardingData.jobPreference.preferred_locations, item]
                                    })}
                                    currentItems={onboardingData.jobPreference.preferred_locations}
                                />
                            </div>
                        )}

                        {onboardingData.jobPreference.preferred_locations.length > 0 && (
                            <div className="flex justify-end mt-4">
                                <Button
                                    onClick={handleContinueClick}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Continue
                                </Button>
                            </div>
                        )}
                    </div>
                );

            case 'remote_preferences':
                return (
                    <div className="space-y-4">
                        <BooleanToggle
                            label="Are you open to remote work?"
                            value={onboardingData.jobPreference.remote_preference}
                            onChange={handleRemotePreferenceToggle}
                        />

                        <div className="flex justify-end mt-4">
                            <Button
                                onClick={handleContinueClick}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Continue
                            </Button>
                        </div>
                    </div>
                );

            case 'industry_preferences':
                return (
                    <div className="space-y-4">
                        <TextInputWithAdd
                            placeholder="Add an industry"
                            onAdd={(value) => updateJobPreferenceSilent({
                                preferred_industries: [...onboardingData.jobPreference.preferred_industries, value]
                            })}
                        />

                        {onboardingData.jobPreference.preferred_industries.length > 0 && (
                            <SelectedItemsDisplay
                                items={onboardingData.jobPreference.preferred_industries}
                                onRemove={(item) => updateJobPreferenceSilent({
                                    preferred_industries: onboardingData.jobPreference.preferred_industries.filter(i => i !== item)
                                })}
                            />
                        )}

                        {/* Display suggested industries if available */}
                        {suggestions?.recommended_industries && suggestions.recommended_industries.length > 0 && (
                            <div className="mt-4">
                                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-semibold text-blue-700 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Recommended Industries
                                        </h3>
                                        <button
                                            onClick={() => {
                                                // Get only suggestions that aren't already selected
                                                const newIndustries = suggestions.recommended_industries.filter(
                                                    industry => !onboardingData.jobPreference.preferred_industries.includes(industry)
                                                );

                                                if (newIndustries.length > 0) {
                                                    updateJobPreferenceSilent({
                                                        preferred_industries: [...onboardingData.jobPreference.preferred_industries, ...newIndustries]
                                                    });
                                                }
                                            }}
                                            className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
                                        >
                                            Select All
                                        </button>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-1">These industries are based on your resume - click to add</p>
                                </div>
                                <SuggestedItems
                                    items={suggestions.recommended_industries}
                                    onAdd={(item) => updateJobPreferenceSilent({
                                        preferred_industries: [...onboardingData.jobPreference.preferred_industries, item]
                                    })}
                                    currentItems={onboardingData.jobPreference.preferred_industries}
                                />
                            </div>
                        )}

                        {onboardingData.jobPreference.preferred_industries.length > 0 && (
                            <div className="flex justify-end mt-4">
                                <Button
                                    onClick={handleContinueClick}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    Continue
                                </Button>
                            </div>
                        )}
                    </div>
                );

            case 'completion':
                return (
                    <ConfirmationButtons
                        onConfirm={() => {
                            // First send the natural message
                            addMessage({
                                sender: 'user',
                                content: "My profile looks good! I'm ready to complete the setup.",
                                type: 'text'
                            });

                            // Then handle the completion
                            setTimeout(() => handleComplete(), 500);
                        }}
                        onReject={() => {
                            // Allow user to input final comments
                            setUserInput('');
                            inputRef.current?.focus();
                        }}
                        confirmText="Looks Good"
                        rejectText="No, I want to add comment"
                    />
                );

            default:
                return null;
        }
    };

    // Update the useEffect for fetching suggestions to remove auto-fetching
    useEffect(() => {
        // Clean up duplicates whenever messages change
        cleanupDuplicateMessages();

        // Set a timer to clean up duplicates periodically
        const timer = setInterval(() => {
            cleanupDuplicateMessages();
        }, 5000); // Clean every 5 seconds

        return () => clearInterval(timer);
    }, [messages, cleanupDuplicateMessages]);

    // Add another effect to clean up messages when steps change
    useEffect(() => {
        // When the step changes, clean up duplicate and conflicting messages
        cleanupDuplicateMessages();

        // Short delay and clean again to catch any new messages added during transition
        const timer = setTimeout(() => {
            cleanupDuplicateMessages();
        }, 1000);

        return () => clearTimeout(timer);
    }, [currentStep, cleanupDuplicateMessages]);

    // Remove the auto-detection effect that causes multiple step advances
    // and replace with a simpler effect just for the welcome message
    useEffect(() => {
        // Only add welcome message if no agent messages exist yet and we're at the first step
        const hasInstructions = messages.some(m =>
            m.sender === 'agent' &&
            (m.content.includes("upload") || m.content.includes("resume"))
        );

        if (!hasInstructions && (currentStep === 'welcome' || currentStep === 'resume_upload')) {
            // Clear timeout to prevent double messages
            const welcomeTimeout = setTimeout(() => {
                // Add a welcome message with clear instructions
                addMessage({
                    sender: 'agent',
                    content: "Welcome to EZ Career! I'll help you set up your profile step by step. Let's start by uploading your resume.",
                    type: 'text'
                });
                setAgentStatus('waiting_for_input');
            }, 500);

            return () => clearTimeout(welcomeTimeout);
        }
    }, [currentStep, messages, addMessage, setAgentStatus]);

    // Add a function to handle any cleanup needed
    const resetUIState = () => {
        setAgentStatus('waiting_for_input');
        cleanupDuplicateMessages();
    };

    // Update processResumeWithBackend to maintain continuous progress
    const processResumeWithBackend = async (file: File) => {
        if (!user) {
            console.error("No user found");
            return { success: false, error: "No authenticated user" };
        }

        // Don't reprocess if already complete
        if (processingComplete) {
            console.log("Resume already processed, skipping processing");
            return { success: true, data: suggestions, parsedText: onboardingData.resume.parsedText };
        }

        try {
            // Define progress ranges for each step to maintain continuity
            const progressRanges = {
                start: 0,
                preprocess: 10,
                parsing: 30,
                analysis: 60,
                suggestions: 85,
                completion: 100
            };

            // Initialize progress at the very beginning only
            setProcessProgress(progressRanges.start);

            // Animate to the preprocessing stage - showing initial activity
            animateProgressTo(progressRanges.preprocess, 800);

            // Get public URL for the file (for reference only)
            const { data: urlData } = supabase.storage
                .from('user-uploads')
                .getPublicUrl(`resumes/${user.id}/${Date.now()}-${file.name}`);

            console.log("DEBUG: Resume URL:", urlData.publicUrl);

            // Create a FormData object to send the file to the parse endpoint
            const formData = new FormData();
            formData.append('file', file);

            console.log("DEBUG: Calling parse API...");

            // Animate to parsing stage
            animateProgressTo(progressRanges.parsing, 1500);

            const parseResponse = await fetch('http://localhost:8000/parse', {
                method: 'POST',
                body: formData,
            });

            if (!parseResponse.ok) {
                throw new Error(`Resume parsing API failed with status: ${parseResponse.status}`);
            }

            // Animate to analysis stage after parsing completes
            animateProgressTo(progressRanges.analysis, 1500);

            // Get the parsed text
            const parseData = await parseResponse.json();
            console.log('Resume parsed successfully by backend:', parseData);
            const parsedText = parseData.markdown;

            // Update the Supabase profile with the parsed text
            await supabase
                .from('profiles')
                .update({
                    resume_text: parsedText
                })
                .eq('user_id', user.id);

            // Make the API call to get suggestions
            console.log("DEBUG: Calling suggestions API...");

            // Animate to suggestions stage
            animateProgressTo(progressRanges.suggestions, 1200);

            const response = await fetch('http://localhost:8000/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.id
                }),
            });

            if (!response.ok) {
                throw new Error(`Resume processing API failed with status: ${response.status}`);
            }

            // Get the response data
            const data = await response.json();
            console.log('Resume processed successfully by backend:', data);

            // Store the complete suggestions data for use throughout the onboarding flow
            setSuggestions(data);

            // Process other data...
            // Set experience level if suggested
            if (data.recommended_experience_level) {
                updateJobPreferenceSilent({
                    experience_level: data.recommended_experience_level
                });
            }

            // Set salary range if suggested
            if (data.recommended_salary_range) {
                updateJobPreferenceSilent({
                    salary_range: data.recommended_salary_range
                });
            }

            // Animate to completion
            animateProgressTo(progressRanges.completion, 800);

            // Short delay before returning to ensure animation completes
            await new Promise(resolve => setTimeout(resolve, 500));

            return { success: true, data, parsedText };
        } catch (error) {
            console.error("Resume processing API error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error during resume processing"
            };
        }
    };

    // Update the file upload handler to properly handle processing state
    const handleFileUpload = async (file: File) => {
        if (!file) {
            console.error("No file selected");
            return;
        }

        console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size);

        // Set processing as not complete at the start
        setProcessingComplete(false);

        // Immediately set status to processing_resume
        setAgentStatus('processing_resume');

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            toast({
                title: "Invalid file type",
                description: "Please upload a PDF or Word document (.doc, .docx)",
                variant: "destructive",
            });
            setAgentStatus('waiting_for_input');
            return;
        }

        try {
            // Clear previous messages
            cleanupDuplicateMessages();

            // Show a single status message
            addMessage({
                sender: 'agent',
                content: 'Processing your resume and analyzing your skills...',
                type: 'text'
            });

            // Upload file to storage
            await uploadResume(file);

            // Make sure we're still in processing state
            setAgentStatus('processing_resume');

            // Process the resume with the backend
            const result = await processResumeWithBackend(file);

            if (result.success) {
                // If we have parsed text, update the resume object with it
                if (result.parsedText) {
                    await uploadResume(file, onboardingData.resume.url, result.parsedText);
                }

                // Update the agent status to waiting_for_input to ensure UI is responsive
                setAgentStatus('waiting_for_input');

                // Mark processing as complete AFTER all the processing is done
                setProcessingComplete(true);

                // Add a success message
                addMessage({
                    sender: 'agent',
                    content: 'Your resume has been processed successfully! Click "Continue" to set up your profile.',
                    type: 'text'
                });
            } else {
                // Handle processing error
                console.error("Resume processing failed:", result.error);

                // Always set agent status back to waiting_for_input
                setAgentStatus('waiting_for_input');

                // Mark processing as not complete
                setProcessingComplete(false);

                // Show error message
                addMessage({
                    sender: 'agent',
                    content: "I encountered an issue while processing your resume: " + (result.error || "Unknown error"),
                    type: 'text'
                });
            }
        } catch (error) {
            console.error("Resume upload failed:", error);
            toast({
                title: "Upload failed",
                description: "There was an error uploading your resume. Please try again.",
                variant: "destructive",
            });

            // Always restore agent status to enable interaction
            setAgentStatus('waiting_for_input');

            // Mark processing as not complete
            setProcessingComplete(false);

            // Show a recovery message
            addMessage({
                sender: 'agent',
                content: "I'm sorry, there was a problem uploading your resume. Please try again.",
                type: 'text'
            });
        }
    };

    // Handle experience level selection
    const handleExperienceLevelSelect = (value: string) => {
        // Just update the preference without sending messages
        updateJobPreferenceSilent({ experience_level: value });
    };

    // Handle salary range selection
    const handleSalaryRangeSelect = (value: string) => {
        // Just update the preference without sending messages
        updateJobPreferenceSilent({ salary_range: value });
    };

    // Handle job search status selection
    const handleJobSearchStatusSelect = (value: string) => {
        // Just update the preference without sending messages
        updateJobPreferenceSilent({ job_search_status: value });
    };

    // Handle remote preference toggle
    const handleRemotePreferenceToggle = (value: boolean) => {
        updateJobPreferenceSilent({ remote_preference: value });
    };

    // Helper to toggle skill highlighting
    const toggleSkillHighlight = (skillName: string) => {
        const existingSkill = onboardingData.userSkills.find(s => s.skill_name === skillName);
        if (existingSkill) {
            addSkillSilent({
                ...existingSkill,
                is_highlighted: !existingSkill.is_highlighted
            });
        }
    };

    // Updated function to handle continuing after resume processing
    const handleContinueAfterProcessing = () => {
        // Add a natural user message about completing resume processing
        addMessage({
            sender: 'user',
            content: "I've uploaded my resume and am ready to continue with the job search setup.",
            type: 'text'
        });

        // Short delay before proceeding
        setTimeout(() => {
            // Find the job_titles step index (skip resume_analysis)
            const jobTitlesIndex = stepOrder.indexOf('job_titles');

            if (jobTitlesIndex !== -1) {
                // Add agent response with guidance
                addMessage({
                    sender: 'agent',
                    content: 'Based on your resume, here are some suggested job titles. You can select from these or add your own using the input field below.',
                    type: 'text'
                });

                // Set the step directly to job_titles
                setCurrentStep('job_titles');

                // Update progress percentage
                setProgressPercentage(stepProgressMap['job_titles']);

                // Ensure agent status is ready for input
                setAgentStatus('waiting_for_input');
            } else {
                // Fallback to normal next step if for some reason job_titles isn't found
                goToNextStep();
            }
        }, 500);
    };

    // Update the return function to remove extra buttons and controls
    return (
        <div className="flex flex-col h-full bg-background">
            {/* Messages area - enforce max height and scrolling */}
            <ScrollArea className="flex-1 px-6 pb-6 pt-12 overflow-y-auto" style={{ maxHeight: "calc(100vh - 100px)" }}>
                <div className="space-y-6 mb-4 max-w-3xl mx-auto">
                    <AnimatePresence initial={false}>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} ${message.sender === 'system' ? 'justify-center' : ''}`}
                            >
                                <div className={`flex items-start max-w-[85%] ${message.sender === 'system' ? 'max-w-md' : ''}`}>
                                    {/* Avatar for agent only */}
                                    {message.sender === 'agent' && (
                                        <Avatar className="h-8 w-8 mt-0.5 mr-3 flex-shrink-0">
                                            <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                                            <AvatarImage src="/agent-avatar.png" />
                                        </Avatar>
                                    )}

                                    {/* Message content */}
                                    <div className={`px-4 py-3 rounded-2xl 
                                        ${message.sender === 'agent' ? 'bg-slate-100 dark:bg-slate-800 text-foreground' : ''}
                                        ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : ''}
                                        ${message.sender === 'system' ? 'bg-muted/50 text-muted-foreground text-sm py-2 px-3 rounded-lg' : ''}
                                    `}>
                                        {/* Special formatting for upload messages */}
                                        {message.type === 'file_upload' ? (
                                            <div className="flex items-center gap-2">
                                                <span>📄</span>
                                                <span>{message.content}</span>
                                            </div>
                                        ) : (
                                            <div>{message.content}</div>
                                        )}

                                        {/* Timestamp for non-system messages */}
                                        {message.sender !== 'system' && (
                                            <div className="text-[10px] opacity-70 mt-1 text-right">
                                                {format(new Date(message.timestamp), 'h:mm a')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Show active processing indicator in messages ONLY if it's not shown in the interactive elements */}
                    {(agentStatus === 'processing_resume' || agentStatus === 'analyzing_data') &&
                        currentStep !== 'welcome' && currentStep !== 'resume_upload' &&
                        renderProcessingIndicator()}

                    {/* Agent is typing indicator */}
                    {agentStatus === 'thinking' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-start"
                        >
                            <Avatar className="h-8 w-8 mt-0.5 mr-3">
                                <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                                <AvatarImage src="/agent-avatar.png" />
                            </Avatar>
                            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl">
                                <div className="flex space-x-1">
                                    <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce"></div>
                                    <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Render interactive elements based on current step */}
                    <div className="mt-4 w-full">
                        {renderInteractiveElements()}
                    </div>

                    {/* Invisible element to scroll to */}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Text input area (only show when appropriate) */}
            {(agentStatus === 'waiting_for_input' || agentStatus === 'idle') && currentStep !== 'completion' && (
                <div className="px-40 py-4 w-full flex justify-center relative mb-3 flex-shrink-0">
                    <div className="w-full bg-white shadow-lg rounded-full relative flex items-center overflow-hidden">
                        <Input
                            ref={inputRef}
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Type a message to the assistant..."
                            className="flex-1 h-14 px-6 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                            disabled={isSending}
                        />
                        <Button
                            onClick={handleSendMessage}
                            disabled={!userInput.trim() || isSending}
                            className="mr-2 h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 p-0 flex items-center justify-center"
                        >
                            {isSending ? (
                                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <FaPaperPlane className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
} 