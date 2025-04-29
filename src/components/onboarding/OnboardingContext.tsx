import { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

// Define types for our context
type OnboardingStep =
    | 'welcome'
    | 'job_titles'
    | 'experience_level'
    | 'salary_expectations'
    | 'job_search_status'
    | 'resume_upload'
    | 'resume_analysis'
    | 'skills_verification'
    | 'location_preferences'
    | 'remote_preferences'
    | 'industry_preferences'
    | 'completion';

type AgentStatus =
    | 'idle'
    | 'thinking'
    | 'waiting_for_input'
    | 'processing_resume'
    | 'analyzing_data';

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

interface OnboardingData {
    jobPreference: JobPreference;
    resume: {
        url?: string;
        parsedText?: string;
        fileName?: string;
    };
    userSkills: UserSkill[];
}

export interface Message {
    id: string;
    sender: 'agent' | 'user' | 'system';
    content: string;
    timestamp: Date;
    type?: 'text' | 'option_selected' | 'file_upload' | 'skill_update';
    metadata?: unknown;
}

interface OnboardingContextType {
    currentStep: OnboardingStep;
    agentStatus: AgentStatus;
    onboardingData: OnboardingData;
    agentMessage: string;
    progressPercentage: number;
    isUploading: boolean;
    messages: Message[];
    currentInteraction: ReactNode | null;

    // Methods
    goToNextStep: () => void;
    goToPreviousStep: () => void;
    setAgentStatus: (status: AgentStatus) => void;
    setAgentMessage: (message: string) => void;
    addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
    updateJobPreference: (data: Partial<JobPreference>, recordInChat?: boolean) => void;
    addSkill: (skill: UserSkill, recordInChat?: boolean) => void;
    removeSkill: (skillName: string, recordInChat?: boolean) => void;
    uploadResume: (file: File, resumeUrl?: string, parsedText?: string) => Promise<void>;
    saveOnboardingData: () => Promise<boolean>;
    setCurrentInteraction: (interaction: ReactNode) => void;
    cleanupDuplicateMessages: () => void;
    setCurrentStep: (step: OnboardingStep) => void;
    setProgressPercentage: (percentage: number) => void;
    setMessages: (setter: (prev: Message[]) => Message[]) => void;
}

// Create the context with a default value
const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Initial state
const initialOnboardingData: OnboardingData = {
    jobPreference: {
        job_titles: [],
        experience_level: '',
        salary_range: '',
        job_search_status: '',
        preferred_locations: [],
        remote_preference: false,
        preferred_industries: [],
    },
    resume: {},
    userSkills: [],
};

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
    const [agentStatus, setAgentStatus] = useState<AgentStatus>('waiting_for_input');
    const [onboardingData, setOnboardingData] = useState<OnboardingData>(initialOnboardingData);
    const [agentMessage, setAgentMessage] = useState<string>("Welcome to EZ Career! I'll help you set up your profile step by step. Let's start by uploading your resume. Please use the upload button below.");
    const [progressPercentage, setProgressPercentage] = useState<number>(0);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: generateId(),
            sender: 'agent',
            content: "Welcome to EZ Career! I'll help you set up your profile step by step. Let's start by uploading your resume. Please use the upload button below.",
            timestamp: new Date(),
            type: 'text'
        }
    ]);
    const [currentInteraction, setCurrentInteraction] = useState<ReactNode | null>(null);

    // Add a message to the chat history
    const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
        const newMessage: Message = {
            ...message,
            id: generateId(),
            timestamp: new Date()
        };

        // Check for recent duplicate messages to avoid adding them
        if (message.sender === 'agent') {
            // Get the last few messages
            setMessages(prev => {
                const recentMessages = prev.slice(-10); // Check more recent messages (increased from 5)

                // Enhanced duplicate detection - check for similar content, not just exact matches
                const isDuplicate = recentMessages.some(m => {
                    if (m.sender !== 'agent') return false;

                    // Exact match check
                    if (m.content.trim() === message.content.trim()) return true;

                    // Semantic similarity check for common phrases
                    const commonKeyPhrases = [
                        "uploading your resume",
                        "analyzing your resume",
                        "processing your resume",
                        "successfully processed",
                        "continue with setting",
                        "already uploaded"
                    ];

                    // If both messages contain the same key phrase, consider as potential duplicate
                    for (const phrase of commonKeyPhrases) {
                        if (m.content.includes(phrase) && message.content.includes(phrase)) {
                            // If messages are about the same action, consider them duplicates
                            return true;
                        }
                    }

                    return false;
                });

                // If it's a duplicate, don't add it
                if (isDuplicate) {
                    console.log('Prevented adding duplicate/similar message:', message.content);
                    return prev;
                }

                return [...prev, newMessage];
            });
        } else {
            // For non-agent messages, always add them
            setMessages(prev => [...prev, newMessage]);
        }
    };

    // Add a method to clean up duplicate messages
    const cleanupDuplicateMessages = () => {
        setMessages(prev => {
            // Group messages by content
            const groups: Record<string, Message[]> = {};

            prev.filter(m => m.sender === 'agent').forEach(message => {
                // Create a normalized version of the content for comparison
                const normalizedContent = message.content
                    .replace(/\d+:\d+ [AP]M/g, '') // Remove times
                    .replace(/\s+/g, ' ')          // Normalize whitespace
                    .trim();

                if (!groups[normalizedContent]) {
                    groups[normalizedContent] = [];
                }
                groups[normalizedContent].push(message);
            });

            // Find duplicate groups
            const duplicateGroups = Object.values(groups).filter(group => group.length > 1);

            // If no duplicates, return the original array
            if (duplicateGroups.length === 0) {
                return prev;
            }

            // Get all message IDs to remove (keeping first and last of each group)
            const idsToRemove = new Set<string>();
            duplicateGroups.forEach(group => {
                // Keep the first and last message in each group
                const toRemove = group.slice(1, -1);
                toRemove.forEach(msg => idsToRemove.add(msg.id));
            });

            // Also check for conflicting messages about resume upload/processing
            // These key phrases should not appear together in the final messages
            const conflictGroups = [
                ["I'm processing your resume", "successfully processed", "detected that your resume has already been analyzed"],
                ["Let's start by uploading your resume", "I've detected that your resume has already", "successfully processed"],
                ["continue with setting up your profile", "Let's start by uploading", "upload your resume"]
            ];

            // For each conflict group, keep only the most recent message mentioning any phrase from that group
            conflictGroups.forEach(phraseGroup => {
                const conflictingMessages = prev
                    .filter(msg => msg.sender === 'agent' && phraseGroup.some(phrase => msg.content.includes(phrase)))
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort newest first

                // Keep only the most recent message in the conflict group
                if (conflictingMessages.length > 1) {
                    const [keep, ...remove] = conflictingMessages;
                    remove.forEach(msg => idsToRemove.add(msg.id));
                }
            });

            // If we found duplicates to remove
            if (idsToRemove.size > 0) {
                console.log(`Removing ${idsToRemove.size} duplicate/conflicting messages`);
                return prev.filter(msg => !idsToRemove.has(msg.id));
            }

            return prev;
        });
    };

    // Order of steps
    const stepOrder: OnboardingStep[] = [
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

    // Step progression map to calculate progress percentage
    const stepProgressMap: Record<OnboardingStep, number> = {
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

    const goToNextStep = () => {
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < stepOrder.length - 1) {
            const nextStep = stepOrder[currentIndex + 1];
            setCurrentStep(nextStep);
            setProgressPercentage(stepProgressMap[nextStep]);

            // Set appropriate agent messages based on next step
            let nextMessage = '';

            switch (nextStep) {
                case 'resume_upload':
                    nextMessage = 'Let\'s start by uploading your resume so I can help personalize your profile. Please use the upload button below.';
                    break;
                case 'resume_analysis':
                    nextMessage = 'Thank you! I\'m analyzing your resume now...';
                    setAgentStatus('processing_resume');
                    break;
                case 'job_titles':
                    nextMessage = 'Based on your resume, here are some suggested job titles. You can select from these or add your own using the input field below.';
                    break;
                case 'experience_level':
                    nextMessage = 'What is your current experience level? Please select one of the options below.';
                    break;
                case 'salary_expectations':
                    nextMessage = 'What are your salary expectations? Please select an option below.';
                    break;
                case 'job_search_status':
                    nextMessage = 'What is your current job search status? Select the option that best describes your situation below.';
                    break;
                case 'skills_verification':
                    nextMessage = 'Based on your resume, I\'ve identified these skills. Please confirm them, add any missing ones, or highlight important skills using the star icon.';
                    break;
                case 'location_preferences':
                    nextMessage = 'Where would you prefer to work? Add your preferred locations using the input field below.';
                    break;
                case 'remote_preferences':
                    nextMessage = 'Are you open to remote work? Please toggle the switch below to indicate your preference.';
                    break;
                case 'industry_preferences':
                    nextMessage = 'What industries are you interested in? Add them using the input field below.';
                    break;
                case 'completion':
                    nextMessage = 'Great! I\'ve collected all the information needed for your profile. Please review everything in the left panel and click "Looks Good" below if you\'re ready to finish.';
                    break;
            }

            if (nextMessage) {
                setAgentMessage(nextMessage);
                addMessage({
                    sender: 'agent',
                    content: nextMessage,
                    type: 'text'
                });
            }
        }
    };

    const goToPreviousStep = () => {
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex > 0) {
            // Special case: If we're on job_titles and going back, but no resume was uploaded,
            // jump back to resume_upload instead of resume_analysis
            if (currentStep === 'job_titles') {
                const hasResume = onboardingData.resume && onboardingData.resume.url && onboardingData.resume.url.length > 0;

                if (!hasResume) {
                    // No resume was uploaded, go directly to resume_upload step
                    const resumeUploadIndex = stepOrder.indexOf('resume_upload');
                    setCurrentStep('resume_upload');
                    setProgressPercentage(stepProgressMap['resume_upload']);

                    // Add a system message about going back
                    addMessage({
                        sender: 'system',
                        content: 'Going back to resume upload...',
                        type: 'text'
                    });
                    return;
                }
            }

            // Normal case: go to the previous step
            const prevStep = stepOrder[currentIndex - 1];
            setCurrentStep(prevStep);
            setProgressPercentage(stepProgressMap[prevStep]);

            // Add a system message about going back
            addMessage({
                sender: 'system',
                content: 'Going back to previous step...',
                type: 'text'
            });
        }
    };

    const updateJobPreference = (data: Partial<JobPreference>, recordInChat = true) => {
        setOnboardingData(prev => ({
            ...prev,
            jobPreference: {
                ...prev.jobPreference,
                ...data
            }
        }));

        // Record the selection in chat history if needed
        if (recordInChat) {
            let content = '';

            // Generate appropriate message based on what was updated
            if (data.job_titles && data.job_titles.length > 0) {
                content = `Selected job titles: ${data.job_titles.join(', ')}`;
            } else if (data.experience_level) {
                const level = data.experience_level;
                const labelMap: Record<string, string> = {
                    'entry_level': 'Entry Level (0-2 years)',
                    'mid_level': 'Mid Level (3-5 years)',
                    'senior': 'Senior (5-8 years)',
                    'lead': 'Lead / Principal (8+ years)',
                    'executive': 'Executive / Director'
                };
                content = `Experience level: ${labelMap[level] || level}`;
            } else if (data.salary_range) {
                const range = data.salary_range;
                const labelMap: Record<string, string> = {
                    'under_50k': 'Under $50K/year',
                    '50k_75k': '$50K - $75K/year',
                    '75k_100k': '$75K - $100K/year',
                    '100k_150k': '$100K - $150K/year',
                    '150k_200k': '$150K - $200K/year',
                    'over_200k': 'Over $200K/year'
                };
                content = `Salary expectation: ${labelMap[range] || range}`;
            } else if (data.job_search_status) {
                const status = data.job_search_status;
                const labelMap: Record<string, string> = {
                    'actively_looking': 'Actively looking',
                    'passively_looking': 'Passively looking',
                    'not_looking': 'Not currently looking',
                    'urgent': 'Urgently seeking opportunities'
                };
                content = `Job search status: ${labelMap[status] || status}`;
            } else if (data.preferred_locations && data.preferred_locations.length > 0) {
                content = `Preferred locations: ${data.preferred_locations.join(', ')}`;
            } else if (data.remote_preference !== undefined) {
                content = `Remote work preference: ${data.remote_preference ? 'Yes' : 'No'}`;
            } else if (data.preferred_industries && data.preferred_industries.length > 0) {
                content = `Preferred industries: ${data.preferred_industries.join(', ')}`;
            }

            if (content) {
                addMessage({
                    sender: 'user',
                    content,
                    type: 'option_selected',
                    metadata: data
                });
            }
        }
    };

    const addSkill = (skill: UserSkill, recordInChat = true) => {
        setOnboardingData(prev => {
            // Check if skill already exists
            const exists = prev.userSkills.some(s => s.skill_name === skill.skill_name);

            if (exists) {
                // Update the existing skill
                const updatedSkills = prev.userSkills.map(s =>
                    s.skill_name === skill.skill_name ? { ...s, ...skill } : s
                );

                // Add a message about updating the skill (if requested)
                if (recordInChat) {
                    addMessage({
                        sender: 'user',
                        content: `Updated skill: ${skill.skill_name}`,
                        type: 'skill_update',
                        metadata: skill
                    });
                }

                return {
                    ...prev,
                    userSkills: updatedSkills
                };
            } else {
                // Add new skill
                // Add a message about adding a new skill (if requested)
                if (recordInChat) {
                    addMessage({
                        sender: 'user',
                        content: `Added skill: ${skill.skill_name}`,
                        type: 'skill_update',
                        metadata: skill
                    });
                }

                return {
                    ...prev,
                    userSkills: [...prev.userSkills, skill]
                };
            }
        });
    };

    const removeSkill = (skillName: string, recordInChat = true) => {
        setOnboardingData(prev => {
            // Add a message about removing the skill (if requested)
            if (recordInChat) {
                addMessage({
                    sender: 'user',
                    content: `Removed skill: ${skillName}`,
                    type: 'skill_update',
                    metadata: { skillName, removed: true }
                });
            }

            return {
                ...prev,
                userSkills: prev.userSkills.filter(s => s.skill_name !== skillName)
            };
        });
    };

    const uploadResume = async (file: File, resumeUrl?: string, parsedText?: string) => {
        if (!user) return;

        try {
            setIsUploading(true);

            // Validate file type
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                throw new Error(`Invalid file type: ${file.type}. Please upload a PDF or Word document.`);
            }

            // Check file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB in bytes
            if (file.size > maxSize) {
                throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 10MB.`);
            }

            // Record the upload action in chat
            addMessage({
                sender: 'user',
                content: `Uploaded resume: ${file.name}`,
                type: 'file_upload',
                metadata: { fileName: file.name, fileSize: file.size, fileType: file.type }
            });

            let publicUrl = resumeUrl;
            const resumeParsedText = parsedText; // Use const instead of let since it's never reassigned

            // If no URL is provided, upload the file to storage
            if (!publicUrl) {
                // Upload file to Supabase storage
                // IMPORTANT: Follow the path structure defined in the existing storage policy
                // The policy expects: 'resumes' as the first folder segment
                const filePath = `resumes/${user.id}/${Date.now()}-${file.name}`;
                console.log(`Uploading file to path: ${filePath}`);

                const { error: uploadError, data } = await supabase.storage
                    .from('user-uploads')
                    .upload(filePath, file, {
                        upsert: true,
                        contentType: file.type,
                    });

                if (uploadError) {
                    console.error('Storage upload error:', uploadError);
                    throw new Error(`Error uploading file: ${uploadError.message}`);
                }

                console.log('File upload successful:', data);

                // Get the public URL
                const { data: urlData } = supabase.storage
                    .from('user-uploads')
                    .getPublicUrl(filePath);

                publicUrl = urlData.publicUrl;
                console.log('Resume URL generated:', publicUrl);
            }

            // Add a system message about processing
            addMessage({
                sender: 'system',
                content: 'Processing your resume...',
                type: 'text',
            });

            // Update onboardingData with resume info
            setOnboardingData(prev => ({
                ...prev,
                resume: {
                    url: publicUrl,
                    parsedText: resumeParsedText,
                    fileName: file.name
                }
            }));

            // Update the profile with resume_url and resume_text
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    resume_url: publicUrl,
                    resume_text: resumeParsedText,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (profileError) {
                console.error('Error updating profile with resume data:', profileError);
                // Continue anyway - we'll rely on the onboarding data
            }

            // Add an agent message about successful upload
            addMessage({
                sender: 'agent',
                content: resumeParsedText
                    ? 'I\'ve successfully processed your resume and I\'m now analyzing it to extract your skills and experience. Please wait while I prepare your profile suggestions...'
                    : 'Your resume has been uploaded successfully. I\'ll now guide you through the next steps to set up your profile.',
                type: 'text',
            });

            // Set agent status for the next step
            setAgentStatus('waiting_for_input');
            goToNextStep();

        } catch (error) {
            console.error('Error uploading resume:', error);

            // Add an error message
            addMessage({
                sender: 'system',
                content: `There was an error uploading your resume: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
                type: 'text',
            });

            setAgentMessage('There was an error uploading your resume. Please try again.');
            // Reset status so user can try again
            setAgentStatus('waiting_for_input');
        } finally {
            setIsUploading(false);
        }
    };

    const saveOnboardingData = async (): Promise<boolean> => {
        if (!user) return false;

        try {
            // Add a system message about saving
            addMessage({
                sender: 'system',
                content: 'Saving your profile information...',
                type: 'text',
            });

            // First, check if job preferences already exist for this user
            const { data: existingPreferences, error: checkError } = await supabase
                .from('job_preferences')
                .select('user_id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (checkError) {
                console.error('Error checking existing job preferences:', checkError);
                // Continue anyway - we'll try the upsert
            }

            // If preferences exist, update them; otherwise, insert new ones
            let preferencesError;
            if (existingPreferences) {
                // Update existing preferences
                const { error } = await supabase
                    .from('job_preferences')
                    .update({
                        ...onboardingData.jobPreference,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);

                preferencesError = error;
            } else {
                // Insert new preferences
                const { error } = await supabase
                    .from('job_preferences')
                    .insert({
                        user_id: user.id,
                        ...onboardingData.jobPreference,
                        updated_at: new Date().toISOString()
                    });

                preferencesError = error;
            }

            if (preferencesError) {
                throw new Error(`Error saving preferences: ${preferencesError.message}`);
            }

            // Save profile update with resume info and set done_onboarding to true
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    resume_url: onboardingData.resume.url,
                    resume_text: onboardingData.resume.parsedText,
                    done_onboarding: true, // Set done_onboarding to true
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (profileError) {
                throw new Error(`Error updating profile: ${profileError.message}`);
            }

            // Save skills
            for (const skill of onboardingData.userSkills) {
                const { error: skillError } = await supabase
                    .from('user_skills')
                    .upsert({
                        user_id: user.id,
                        skill_name: skill.skill_name,
                        proficiency_level: skill.proficiency_level || 'intermediate',
                        is_highlighted: skill.is_highlighted,
                        source: skill.source
                    });

                if (skillError) {
                    console.error(`Error saving skill ${skill.skill_name}:`, skillError);
                }
            }

            // Add a success message
            addMessage({
                sender: 'agent',
                content: 'Your profile has been successfully set up! You can now start exploring job opportunities.',
                type: 'text',
            });

            return true;
        } catch (error) {
            console.error('Error saving onboarding data:', error);

            // Add an error message
            addMessage({
                sender: 'system',
                content: 'There was an error saving your profile. Please try again.',
                type: 'text',
            });

            return false;
        }
    };

    const value = {
        currentStep,
        agentStatus,
        onboardingData,
        agentMessage,
        progressPercentage,
        isUploading,
        messages,
        currentInteraction,
        goToNextStep,
        goToPreviousStep,
        setAgentStatus,
        setAgentMessage,
        addMessage,
        updateJobPreference,
        addSkill,
        removeSkill,
        uploadResume,
        saveOnboardingData,
        setCurrentInteraction,
        cleanupDuplicateMessages,
        setCurrentStep,
        setProgressPercentage,
        setMessages
    };

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    );
}

// Custom hook to use the onboarding context
export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (context === undefined) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
} 