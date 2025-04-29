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
        cleanupDuplicateMessages
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

    // Scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle dynamic progress percentage
    useEffect(() => {
        // Start or reset progress tracking when status changes
        if (agentStatus === 'processing_resume' || agentStatus === 'analyzing_data') {
            // Clear any existing interval
            if (progressIntervalRef.current) {
                window.clearInterval(progressIntervalRef.current);
            }

            // Start with appropriate initial value
            const initialProgress = agentStatus === 'processing_resume' ? 10 : 40;
            setProcessProgress(initialProgress);

            // Set up interval to increment progress
            const maxProgress = agentStatus === 'processing_resume' ? 40 : 90;
            const interval = window.setInterval(() => {
                setProcessProgress(prev => {
                    // Increment but don't exceed max
                    const next = Math.min(prev + Math.floor(Math.random() * 3) + 1, maxProgress);
                    return next;
                });
            }, 1000 + Math.random() * 2000); // Random interval between 1-3 seconds

            progressIntervalRef.current = interval;
        } else {
            // Clear interval when status changes to something else
            if (progressIntervalRef.current) {
                window.clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
            }
        }

        // Cleanup on unmount
        return () => {
            if (progressIntervalRef.current) {
                window.clearInterval(progressIntervalRef.current);
            }
        };
    }, [agentStatus]);

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

    // Create a helper function for resume processing
    const processResumeWithBackend = async (file: File) => {
        if (!user) {
            console.error("No user found");
            return { success: false, error: "No authenticated user" };
        }

        try {
            // Update the profile with resume information first to make sure it's available for the suggestions API
            const { data: urlData } = supabase.storage
                .from('user-uploads')
                .getPublicUrl(`resumes/${user.id}/${Date.now()}-${file.name}`);

            console.log("DEBUG: Resume URL:", urlData.publicUrl);

            // Show getting suggestions message
            addMessage({
                sender: 'agent',
                content: "I'm analyzing your resume to provide personalized suggestions for your profile...",
                type: 'text'
            });

            // Make the API call to get suggestions - this will process the resume
            // This endpoint already exists in api.py
            console.log("DEBUG: Calling suggestions API...");
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

            // Store the information internally without showing messages yet
            // These will be displayed at the appropriate steps in the conversation
            if (data.suggested_job_titles && data.suggested_job_titles.length > 0) {
                // Silently populate job titles without recording in chat
                updateJobPreference({
                    job_titles: data.suggested_job_titles
                }, false);
            }

            // Silently store skills without showing in chat, they'll be revealed during the skills step
            if (data.skills && data.skills.length > 0) {
                // Clear existing skills silently
                onboardingData.userSkills.forEach(skill => {
                    removeSkill(skill.skill_name, false); // Add a boolean param to prevent adding chat message
                });

                // Silently store skills from API without recording chat messages
                data.skills.forEach(skill => {
                    // Silently add skills
                    addSkill({
                        skill_name: skill,
                        is_highlighted: false,
                        source: 'resume'
                    }, false); // Add a boolean param to prevent showing in chat
                });
            }

            // Set experience level if suggested (silently)
            if (data.recommended_experience_level) {
                updateJobPreference({
                    experience_level: data.recommended_experience_level
                }, false);
            }

            // Set salary range if suggested (silently)
            if (data.recommended_salary_range) {
                updateJobPreference({
                    salary_range: data.recommended_salary_range
                }, false);
            }

            // Add recommended locations (silently)
            if (data.recommended_locations && data.recommended_locations.length > 0) {
                updateJobPreference({
                    preferred_locations: data.recommended_locations
                }, false);
            }

            // Add recommended industries (silently)
            if (data.recommended_industries && data.recommended_industries.length > 0) {
                updateJobPreference({
                    preferred_industries: data.recommended_industries
                }, false);
            }

            return { success: true, data };
        } catch (error) {
            console.error("Resume processing API error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error during resume processing"
            };
        }
    };

    // Helper function to build a message showing all the suggestions
    const buildSuggestionsMessage = (data: {
        suggested_job_titles?: string[];
        recommended_experience_level?: string;
        recommended_salary_range?: string;
        skills?: string[];
        recommended_locations?: string[];
        other_locations?: string[];
        recommended_industries?: string[];
        other_industries?: string[];
    }) => {
        const sections = [];

        // Job Titles
        if (data.suggested_job_titles && data.suggested_job_titles.length > 0) {
            sections.push(`**Suggested Job Titles**: ${data.suggested_job_titles.join(', ')}`);
        }

        // Experience Level
        if (data.recommended_experience_level) {
            const levelMap: Record<string, string> = {
                'entry_level': 'Entry Level (0-2 years)',
                'mid_level': 'Mid Level (3-5 years)',
                'senior': 'Senior (5-8 years)',
                'lead': 'Lead / Principal (8+ years)',
                'executive': 'Executive / Director'
            };
            const levelLabel = levelMap[data.recommended_experience_level] || data.recommended_experience_level;
            sections.push(`**Recommended Experience Level**: ${levelLabel}`);
        }

        // Salary Range
        if (data.recommended_salary_range) {
            const rangeMap: Record<string, string> = {
                'under_50k': 'Under $50K/year',
                '50k_75k': '$50K - $75K/year',
                '75k_100k': '$75K - $100K/year',
                '100k_150k': '$100K - $150K/year',
                '150k_200k': '$150K - $200K/year',
                'over_200k': 'Over $200K/year'
            };
            const rangeLabel = rangeMap[data.recommended_salary_range] || data.recommended_salary_range;
            sections.push(`**Recommended Salary Range**: ${rangeLabel}`);
        }

        // Skills
        if (data.skills && data.skills.length > 0) {
            sections.push(`**Identified Skills**: ${data.skills.join(', ')}`);
        }

        // Locations
        if (data.recommended_locations && data.recommended_locations.length > 0) {
            sections.push(`**Recommended Locations**: ${data.recommended_locations.join(', ')}`);
        }

        // Industries
        if (data.recommended_industries && data.recommended_industries.length > 0) {
            sections.push(`**Recommended Industries**: ${data.recommended_industries.join(', ')}`);
        }

        // Build the complete message
        if (sections.length > 0) {
            return `Based on your resume, I've identified the following information:\n\n${sections.join('\n\n')}\n\nI've pre-populated your profile with these suggestions. You can modify them as needed as we go through the onboarding process.`;
        } else {
            return "I've analyzed your resume but couldn't extract specific suggestions. We'll set up your profile step by step.";
        }
    };

    // Update the file upload handler to call the backend
    const handleFileUpload = async (file: File) => {
        if (!file) {
            console.error("No file selected");
            addMessage({
                sender: 'system',
                content: 'No file was selected. Please try again by clicking the upload button.',
                type: 'text'
            });
            return;
        }

        console.log('File selected:', file.name, 'Type:', file.type, 'Size:', file.size);

        // Show feedback that upload is starting
        addMessage({
            sender: 'system',
            content: `Starting upload of: ${file.name}`,
            type: 'text'
        });

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            toast({
                title: "Invalid file type",
                description: "Please upload a PDF or Word document (.doc, .docx)",
                variant: "destructive",
            });
            return;
        }

        try {
            // Start the process
            setAgentStatus('processing_resume');

            // Show a loading message
            addMessage({
                sender: 'system',
                content: 'Processing your resume, please wait...',
                type: 'text'
            });

            // Use the uploadResume function from context to upload to storage
            await uploadResume(file);

            // Add message about starting analysis
            addMessage({
                sender: 'agent',
                content: 'Thank you! I\'m analyzing your resume now...',
                type: 'text'
            });

            // Process the resume with the backend
            const result = await processResumeWithBackend(file);

            if (result.success) {
                // Update the agent status and add a success message
                setAgentStatus('waiting_for_input');

                // Add a success message
                addMessage({
                    sender: 'agent',
                    content: 'Great! Your resume has been successfully processed. Let\'s continue with setting up your profile.',
                    type: 'text'
                });

                // Force step transition 
                if (currentStep === 'welcome' || currentStep === 'resume_upload') {
                    setTimeout(() => goToNextStep(), 1000);
                }
            } else {
                // Handle processing error
                console.error("Resume processing failed:", result.error);
                setAgentStatus('waiting_for_input');

                // Show error message but continue
                addMessage({
                    sender: 'agent',
                    content: "I encountered an issue while processing your resume, but we can continue with your profile setup.",
                    type: 'text'
                });

                // Move to next step anyway
                if (currentStep === 'welcome' || currentStep === 'resume_upload') {
                    setTimeout(() => goToNextStep(), 1000);
                }
            }
        } catch (error) {
            console.error("Resume upload failed:", error);
            toast({
                title: "Upload failed",
                description: "There was an error uploading your resume. Please try again.",
                variant: "destructive",
            });
            setAgentStatus('waiting_for_input');

            // Show a recovery message
            addMessage({
                sender: 'agent',
                content: "I'm sorry, there was a problem uploading your resume. Please try again by clicking the upload button below.",
                type: 'text'
            });
        }
    };

    // Handle experience level selection
    const handleExperienceLevelSelect = (value: string) => {
        updateJobPreference({ experience_level: value });

        // Add a system message about automatic advancement
        addMessage({
            sender: 'system',
            content: 'Selection saved. Moving to next step automatically...',
            type: 'text'
        });

        // Use a slight delay so the user sees their selection and the message
        setTimeout(() => goToNextStep(), 1200);
    };

    // Handle salary range selection
    const handleSalaryRangeSelect = (value: string) => {
        updateJobPreference({ salary_range: value });

        // Add a system message about automatic advancement
        addMessage({
            sender: 'system',
            content: 'Selection saved. Moving to next step automatically...',
            type: 'text'
        });

        setTimeout(() => goToNextStep(), 1200);
    };

    // Handle job search status selection
    const handleJobSearchStatusSelect = (value: string) => {
        updateJobPreference({ job_search_status: value });

        // Add a system message about automatic advancement
        addMessage({
            sender: 'system',
            content: 'Selection saved. Moving to next step automatically...',
            type: 'text'
        });

        setTimeout(() => goToNextStep(), 1200);
    };

    // Handle remote preference toggle
    const handleRemotePreferenceToggle = (value: boolean) => {
        updateJobPreference({ remote_preference: value });
        // Don't auto-advance for toggle as user may want to change their mind
    };

    // Helper to toggle skill highlighting
    const toggleSkillHighlight = (skillName: string) => {
        const existingSkill = onboardingData.userSkills.find(s => s.skill_name === skillName);
        if (existingSkill) {
            addSkill({
                ...existingSkill,
                is_highlighted: !existingSkill.is_highlighted
            });
        }
    };

    // Display a processing indicator in the message area
    const renderProcessingIndicator = () => {
        if (agentStatus !== 'processing_resume' && agentStatus !== 'analyzing_data') {
            return null;
        }

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start"
            >
                <Avatar className="h-8 w-8 mt-0.5 mr-3 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                    <AvatarImage src="/agent-avatar.png" />
                </Avatar>
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl">
                    <div className="flex items-center gap-2">
                        <FaSpinner className="h-4 w-4 animate-spin text-primary" />
                        <span>
                            {agentStatus === 'processing_resume'
                                ? `Processing your resume (${processProgress}%)...`
                                : `Analyzing your data (${processProgress}%)...`}
                        </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${processProgress}%` }}
                        ></div>
                    </div>
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

    // Render interactive elements based on the current step
    const renderInteractiveElements = () => {
        // For welcome step or resume_upload step, check if a resume is already uploaded
        if (currentStep === 'welcome' || currentStep === 'resume_upload') {
            // Check if user already has a resume uploaded
            const hasResume = onboardingData.resume && onboardingData.resume.url && onboardingData.resume.url.length > 0;

            if (hasResume) {
                // If resume is already uploaded, show a success message and continue button instead
                return (
                    <div className="flex flex-col items-center w-full">
                        <div className="bg-green-50 p-4 mb-4 rounded-lg text-green-700 w-full">
                            <div className="flex items-center justify-center mb-2">
                                <FaCheckCircle className="h-5 w-5 mr-2 text-green-600" />
                                <p className="font-medium">Resume successfully uploaded</p>
                            </div>
                            <p className="text-sm text-green-600 text-center">
                                {onboardingData.resume.fileName || "Your resume"} has been processed
                            </p>
                        </div>
                        <Button
                            onClick={goToNextStep}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Continue
                        </Button>
                    </div>
                );
            }

            // If no resume yet, show the uploader as normal
            return (
                <div className="flex flex-col items-center w-full">
                    <div className="bg-blue-50 p-4 mb-4 rounded-lg text-blue-700 w-full text-center">
                        <p className="font-medium">Please upload your resume to get started</p>
                        <p className="text-sm text-blue-600">We'll use it to personalize your profile</p>
                    </div>
                    <ResumeUploader onFileSelect={handleFileUpload} />
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
                </>
            );
        }

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
                </>
            );
        }

        // For job titles step
        if (currentStep === 'job_titles') {
            return (
                <div className="space-y-4 mt-2">
                    <TextInputWithAdd
                        placeholder="Add a job title"
                        onAdd={(value) => updateJobPreference({
                            job_titles: [...onboardingData.jobPreference.job_titles, value]
                        })}
                    />

                    {onboardingData.jobPreference.job_titles.length > 0 && (
                        <div className="mt-4">
                            <SelectedItemsDisplay
                                items={onboardingData.jobPreference.job_titles}
                                onRemove={(item) => updateJobPreference({
                                    job_titles: onboardingData.jobPreference.job_titles.filter(t => t !== item)
                                })}
                            />
                        </div>
                    )}

                    {/* Display suggested job titles if available */}
                    {suggestions?.suggested_job_titles && suggestions.suggested_job_titles.length > 0 && (
                        <div className="mt-6">
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                                <h3 className="text-sm font-semibold text-blue-700 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Recommended Job Titles
                                </h3>
                                <p className="text-xs text-blue-600 mt-1">These suggestions are based on your resume</p>
                            </div>
                            <SuggestedItems
                                items={suggestions.suggested_job_titles}
                                onAdd={(item) => updateJobPreference({
                                    job_titles: [...onboardingData.jobPreference.job_titles, item]
                                })}
                                currentItems={onboardingData.jobPreference.job_titles}
                            />
                        </div>
                    )}

                    {onboardingData.jobPreference.job_titles.length > 0 && (
                        <div className="flex justify-end mt-6">
                            <Button
                                onClick={goToNextStep}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Continue
                            </Button>
                        </div>
                    )}
                </div>
            );
        }

        // For all other steps, use switch case
        switch (currentStep) {
            case 'job_search_status':
                return (
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
                );

            case 'skills_verification':
                return (
                    <div className="space-y-4">
                        <TextInputWithAdd
                            placeholder="Add a skill"
                            onAdd={(value) => addSkill({
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

                        {onboardingData.userSkills.length > 0 && (
                            <div className="flex justify-end mt-4">
                                <Button
                                    onClick={goToNextStep}
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
                            onAdd={(value) => updateJobPreference({
                                preferred_locations: [...onboardingData.jobPreference.preferred_locations, value]
                            })}
                        />

                        {onboardingData.jobPreference.preferred_locations.length > 0 && (
                            <SelectedItemsDisplay
                                items={onboardingData.jobPreference.preferred_locations}
                                onRemove={(item) => updateJobPreference({
                                    preferred_locations: onboardingData.jobPreference.preferred_locations.filter(l => l !== item)
                                })}
                            />
                        )}

                        {/* Display suggested locations if available */}
                        {suggestions?.recommended_locations && suggestions.recommended_locations.length > 0 && (
                            <div className="mt-4">
                                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                                    <h3 className="text-sm font-semibold text-blue-700 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Recommended Locations
                                    </h3>
                                    <p className="text-xs text-blue-600 mt-1">These suggestions are based on your resume</p>
                                </div>
                                <SuggestedItems
                                    items={suggestions.recommended_locations}
                                    onAdd={(item) => updateJobPreference({
                                        preferred_locations: [...onboardingData.jobPreference.preferred_locations, item]
                                    })}
                                    currentItems={onboardingData.jobPreference.preferred_locations}
                                />
                            </div>
                        )}

                        {onboardingData.jobPreference.preferred_locations.length > 0 && (
                            <div className="flex justify-end mt-4">
                                <Button
                                    onClick={goToNextStep}
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
                                onClick={goToNextStep}
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
                            onAdd={(value) => updateJobPreference({
                                preferred_industries: [...onboardingData.jobPreference.preferred_industries, value]
                            })}
                        />

                        {onboardingData.jobPreference.preferred_industries.length > 0 && (
                            <SelectedItemsDisplay
                                items={onboardingData.jobPreference.preferred_industries}
                                onRemove={(item) => updateJobPreference({
                                    preferred_industries: onboardingData.jobPreference.preferred_industries.filter(i => i !== item)
                                })}
                            />
                        )}

                        {/* Display suggested industries if available */}
                        {suggestions?.recommended_industries && suggestions.recommended_industries.length > 0 && (
                            <div className="mt-4">
                                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                                    <h3 className="text-sm font-semibold text-blue-700 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Recommended Industries
                                    </h3>
                                    <p className="text-xs text-blue-600 mt-1">These suggestions are based on your resume</p>
                                </div>
                                <SuggestedItems
                                    items={suggestions.recommended_industries}
                                    onAdd={(item) => updateJobPreference({
                                        preferred_industries: [...onboardingData.jobPreference.preferred_industries, item]
                                    })}
                                    currentItems={onboardingData.jobPreference.preferred_industries}
                                />
                            </div>
                        )}

                        {onboardingData.jobPreference.preferred_industries.length > 0 && (
                            <div className="flex justify-end mt-4">
                                <Button
                                    onClick={goToNextStep}
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
                        onConfirm={handleComplete}
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

    // Update the useEffect for fetching suggestions to trigger when step changes
    useEffect(() => {
        // If we're on the resume_analysis or job_titles step, fetch suggestions if they don't exist
        if ((currentStep === 'resume_analysis' || currentStep === 'job_titles')
            && !suggestions && !isFetchingSuggestions
            && onboardingData.resume.parsedText) {

            console.log('Fetching suggestions after resume processing');
            fetchSuggestions();
        }
    }, [currentStep, suggestions, isFetchingSuggestions, onboardingData.resume.parsedText]);

    // Add effect to auto-advance to next step when a minimum number of items are added
    useEffect(() => {
        // Check if we have adequate data to auto-advance for certain steps
        if (agentStatus === 'waiting_for_input') {
            // For job titles step, if we have at least one title, show the continue button
            if (currentStep === 'job_titles' && onboardingData.jobPreference.job_titles.length > 0 &&
                !document.querySelector('[data-auto-advance-shown="true"]')) {

                // Add a message suggesting the user can continue when ready
                addMessage({
                    sender: 'agent',
                    content: "Great! You've added a job title. Click 'Continue' when you're ready to move to the next step.",
                    type: 'text'
                });

                // Mark that we've shown this message
                const messageDivs = document.querySelectorAll('[data-auto-advance-shown]');
                messageDivs.forEach(div => {
                    div.setAttribute('data-auto-advance-shown', 'true');
                });
            }

            // Similar logic for skills, locations, and industries
            if (currentStep === 'skills_verification' && onboardingData.userSkills.length > 0 &&
                !document.querySelector('[data-auto-advance-shown="true"]')) {

                addMessage({
                    sender: 'agent',
                    content: "Great! You've added skills to your profile. Click 'Continue' when you're ready to move to the next step.",
                    type: 'text'
                });

                const messageDivs = document.querySelectorAll('[data-auto-advance-shown]');
                messageDivs.forEach(div => {
                    div.setAttribute('data-auto-advance-shown', 'true');
                });
            }
        }
    }, [currentStep, onboardingData, agentStatus, addMessage]);

    // Replace the useEffect for the welcome message to ensure clear guidance is shown
    useEffect(() => {
        // Only add if no agent messages exist yet and we're at the first step
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
                    content: "Welcome to EZ Career! I'll help you set up your profile step by step. Let's start by uploading your resume. Please use the upload button below.",
                    type: 'text'
                });
                setAgentStatus('waiting_for_input');
            }, 500);

            return () => clearTimeout(welcomeTimeout);
        }
    }, [currentStep, addMessage, setAgentStatus]);

    // Add a force reset function and button for when the UI gets stuck
    const forceResetConversation = () => {
        // Add a system message about resetting
        addMessage({
            sender: 'system',
            content: 'Resetting conversation...',
            type: 'text'
        });

        // Clear any processing state
        setAgentStatus('waiting_for_input');

        // Add a new agent message with clear instructions based on current step
        let instructionMessage = '';

        if (currentStep === 'welcome' || currentStep === 'resume_upload') {
            instructionMessage = "Let's start by uploading your resume. Please use the upload button below.";
        } else if (currentStep === 'job_titles') {
            instructionMessage = "Please add job titles you're interested in using the input field below.";
        } else {
            instructionMessage = "Please follow the instructions below to continue with your profile setup.";
        }

        addMessage({
            sender: 'agent',
            content: instructionMessage,
            type: 'text'
        });
    };

    // Add effect to check if we need to skip the resume upload step
    useEffect(() => {
        // If we're on the welcome or resume_upload step but already have a resume
        const hasResume = onboardingData.resume && onboardingData.resume.url && onboardingData.resume.url.length > 0;

        if ((currentStep === 'welcome' || currentStep === 'resume_upload') && hasResume) {
            // Check if we already have an "already uploaded" message
            const messageExists = messages.some(m =>
                m.content.includes("already uploaded") ||
                m.content.includes("resume has been processed")
            );

            if (!messageExists) {
                // Remove any pending "upload your resume" messages
                messages.filter(m =>
                    m.sender === 'agent' &&
                    m.content.includes("upload your resume")
                ).forEach(m => {
                    // In a real implementation we would remove these messages
                    console.log(`Would remove message: ${m.id}`);
                });

                // Add a clear message about the resume being already uploaded
                addMessage({
                    sender: 'agent',
                    content: 'I see you\'ve already uploaded your resume. You can either continue with your current resume or upload a new one.',
                    type: 'text'
                });
            }
        }
    }, [currentStep, onboardingData.resume, messages, addMessage]);

    // Add effect to auto-detect when resume is already processed and move forward
    useEffect(() => {
        // If we're on the resume_upload or resume_analysis step but already have processed data
        const hasResume = onboardingData.resume && onboardingData.resume.url && onboardingData.resume.url.length > 0;
        const hasProcessedData = onboardingData.jobPreference.job_titles.length > 0 || onboardingData.userSkills.length > 0;

        // Check if we're in a processing state that's been running too long
        const isStuckInProcessing = agentStatus === 'processing_resume' && processProgress >= 40;

        if ((currentStep === 'resume_upload' || currentStep === 'resume_analysis') &&
            (hasResume && hasProcessedData)) {
            // Clear any processing state and force advance to job_titles step
            console.log("Detected resume already processed. Forcing advance to next step.");

            // Clear processing state
            setAgentStatus('waiting_for_input');

            // Add a message about detected resume data
            const messageExists = messages.some(m => m.content.includes("I've detected") || m.content.includes("already analyzed"));

            if (!messageExists) {
                addMessage({
                    sender: 'agent',
                    content: "I've detected that your resume has already been analyzed. Let's continue with setting up your profile.",
                    type: 'text'
                });

                // Force move to job_titles step after a short delay
                setTimeout(() => {
                    if (currentStep === 'resume_upload' || currentStep === 'resume_analysis') {
                        // Find the index right after resume_analysis
                        const resumeAnalysisIndex = stepOrder.indexOf('resume_analysis');
                        if (resumeAnalysisIndex >= 0 && resumeAnalysisIndex + 1 < stepOrder.length) {
                            // Just call goToNextStep instead of directly manipulating state
                            goToNextStep();
                        }
                    }
                }, 1000);
            }
        } else if (isStuckInProcessing) {
            // Handle case where processing is stuck
            console.log("Resume processing appears stuck. Moving forward anyway.");
            setAgentStatus('waiting_for_input');

            // Add a message about processing completion
            addMessage({
                sender: 'agent',
                content: "I've finished analyzing your resume. Let's continue with setting up your profile.",
                type: 'text'
            });

            // Force move forward
            if (currentStep === 'resume_upload' || currentStep === 'resume_analysis') {
                setTimeout(() => goToNextStep(), 1000);
            }
        }
    }, [currentStep, agentStatus, processProgress, onboardingData.resume, onboardingData.jobPreference.job_titles, onboardingData.userSkills.length, goToNextStep, addMessage, setAgentStatus]);

    // Add a function to force reset progress and move forward when stuck
    const forceAdvanceProgress = () => {
        console.log("Forcing advance from current step:", currentStep);

        // Clear processing state
        setAgentStatus('waiting_for_input');

        // Add a message about forced advance
        addMessage({
            sender: 'system',
            content: 'Resuming onboarding flow...',
            type: 'text'
        });

        // Just use goToNextStep instead of manually setting step
        goToNextStep();
    };

    // Add attributes to message elements to track auto-advance messages
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
                                data-auto-advance-shown={message.content.includes("Click 'Continue'") ? 'false' : undefined}
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

                    {/* Show active processing indicator if needed */}
                    {renderProcessingIndicator()}

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

                    {/* Add this near the end, right before the messagesEndRef */}
                    {messages.length > 0 && !renderInteractiveElements() && (
                        <div className="flex justify-center mt-4 mb-4 gap-2">
                            <Button
                                onClick={forceResetConversation}
                                variant="outline"
                                size="sm"
                                className="text-xs text-muted-foreground"
                            >
                                Restart instructions
                            </Button>

                            {(currentStep === 'resume_upload' || currentStep === 'resume_analysis') && (
                                <Button
                                    onClick={forceAdvanceProgress}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                                >
                                    Continue to next step
                                </Button>
                            )}
                        </div>
                    )}

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