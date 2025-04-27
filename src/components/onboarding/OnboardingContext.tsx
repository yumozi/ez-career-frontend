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
    metadata?: any;
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
    addSkill: (skill: UserSkill) => void;
    removeSkill: (skillName: string) => void;
    uploadResume: (file: File) => Promise<void>;
    saveOnboardingData: () => Promise<boolean>;
    setCurrentInteraction: (interaction: ReactNode) => void;
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
    const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
    const [onboardingData, setOnboardingData] = useState<OnboardingData>(initialOnboardingData);
    const [agentMessage, setAgentMessage] = useState<string>('Hello! I\'m your EZ Career assistant. I\'ll help you set up your profile and job preferences.');
    const [progressPercentage, setProgressPercentage] = useState<number>(0);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: generateId(),
            sender: 'agent',
            content: 'Hello! I\'m your EZ Career assistant. I\'ll help you set up your profile and job preferences.',
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

        setMessages(prev => [...prev, newMessage]);
    };

    // Step progression map to calculate progress percentage
    const stepProgressMap: Record<OnboardingStep, number> = {
        welcome: 0,
        job_titles: 10,
        experience_level: 20,
        salary_expectations: 30,
        job_search_status: 40,
        resume_upload: 50,
        resume_analysis: 60,
        skills_verification: 70,
        location_preferences: 80,
        remote_preferences: 85,
        industry_preferences: 90,
        completion: 100
    };

    // Order of steps
    const stepOrder: OnboardingStep[] = [
        'welcome',
        'job_titles',
        'experience_level',
        'salary_expectations',
        'job_search_status',
        'resume_upload',
        'resume_analysis',
        'skills_verification',
        'location_preferences',
        'remote_preferences',
        'industry_preferences',
        'completion'
    ];

    const goToNextStep = () => {
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < stepOrder.length - 1) {
            const nextStep = stepOrder[currentIndex + 1];
            setCurrentStep(nextStep);
            setProgressPercentage(stepProgressMap[nextStep]);

            // Set appropriate agent messages based on next step
            let nextMessage = '';

            switch (nextStep) {
                case 'job_titles':
                    nextMessage = 'What job titles or roles are you interested in?';
                    break;
                case 'experience_level':
                    nextMessage = 'What is your current experience level?';
                    break;
                case 'salary_expectations':
                    nextMessage = 'What are your salary expectations?';
                    break;
                case 'job_search_status':
                    nextMessage = 'What is your current job search status?';
                    break;
                case 'resume_upload':
                    nextMessage = 'Please upload your resume so I can help you better. I accept PDF formats.';
                    break;
                case 'resume_analysis':
                    nextMessage = 'Thank you! I\'m analyzing your resume now...';
                    setAgentStatus('processing_resume');
                    break;
                case 'skills_verification':
                    nextMessage = 'Based on your resume, I\'ve identified these skills. Please confirm them and add any missing ones.';
                    break;
                case 'location_preferences':
                    nextMessage = 'What locations would you prefer to work in?';
                    break;
                case 'remote_preferences':
                    nextMessage = 'Are you open to remote work?';
                    break;
                case 'industry_preferences':
                    nextMessage = 'What industries are you interested in working in?';
                    break;
                case 'completion':
                    nextMessage = 'Great! Your profile is now set up. You can now start exploring job opportunities.';
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

    const addSkill = (skill: UserSkill) => {
        setOnboardingData(prev => {
            // Check if skill already exists
            const exists = prev.userSkills.some(s => s.skill_name === skill.skill_name);

            if (exists) {
                // Update the existing skill
                const updatedSkills = prev.userSkills.map(s =>
                    s.skill_name === skill.skill_name ? { ...s, ...skill } : s
                );

                // Add a message about updating the skill
                addMessage({
                    sender: 'user',
                    content: `Updated skill: ${skill.skill_name}`,
                    type: 'skill_update',
                    metadata: skill
                });

                return {
                    ...prev,
                    userSkills: updatedSkills
                };
            } else {
                // Add new skill
                // Add a message about adding a new skill
                addMessage({
                    sender: 'user',
                    content: `Added skill: ${skill.skill_name}`,
                    type: 'skill_update',
                    metadata: skill
                });

                return {
                    ...prev,
                    userSkills: [...prev.userSkills, skill]
                };
            }
        });
    };

    const removeSkill = (skillName: string) => {
        setOnboardingData(prev => {
            // Add a message about removing the skill
            addMessage({
                sender: 'user',
                content: `Removed skill: ${skillName}`,
                type: 'skill_update',
                metadata: { skillName, removed: true }
            });

            return {
                ...prev,
                userSkills: prev.userSkills.filter(s => s.skill_name !== skillName)
            };
        });
    };

    const uploadResume = async (file: File) => {
        if (!user) return;

        try {
            setIsUploading(true);

            // Record the upload action in chat
            addMessage({
                sender: 'user',
                content: `Uploaded resume: ${file.name}`,
                type: 'file_upload',
                metadata: { fileName: file.name, fileSize: file.size }
            });

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

            const publicUrl = urlData.publicUrl;
            console.log('Public URL:', publicUrl);

            // Add a system message about processing
            addMessage({
                sender: 'system',
                content: 'Processing your resume...',
                type: 'text',
            });

            // For the demo, we'll simulate PDF parsing instead of calling the backend
            // Update onboarding data with resume info immediately 
            // (don't wait for the timeout which might be failing)
            const simulatedParsedText = `# Resume for ${user.email}\n\n## Skills\n- React\n- TypeScript\n- JavaScript\n- Node.js\n\n## Experience\n- Software Engineer, Example Company (2020-Present)\n- Junior Developer, Another Company (2018-2020)`;

            setOnboardingData(prev => ({
                ...prev,
                resume: {
                    url: publicUrl,
                    parsedText: simulatedParsedText,
                    fileName: file.name
                }
            }));

            // Add an agent message about successful parsing
            addMessage({
                sender: 'agent',
                content: 'I\'ve successfully processed your resume and I\'m now analyzing it to extract your skills and experience.',
                type: 'text',
            });

            // Extract skills from resume using AI (simulated)
            setAgentStatus('analyzing_data');
            console.log('Starting resume analysis...');

            // Simulate extracting skills immediately instead of with timeouts
            const mockSkills = [
                { skill_name: 'React', is_highlighted: true, source: 'resume' as const },
                { skill_name: 'TypeScript', is_highlighted: true, source: 'resume' as const },
                { skill_name: 'JavaScript', is_highlighted: false, source: 'resume' as const },
                { skill_name: 'Node.js', is_highlighted: false, source: 'resume' as const },
            ];

            // Update the user skills
            setOnboardingData(prev => ({
                ...prev,
                userSkills: mockSkills
            }));

            // Add a message about found skills
            addMessage({
                sender: 'agent',
                content: `I found ${mockSkills.length} skills in your resume: ${mockSkills.map(s => s.skill_name).join(', ')}`,
                type: 'text',
            });

            console.log('Analysis complete, moving to next step...');
            setAgentStatus('waiting_for_input');
            goToNextStep();

            // Add a safety timeout to force continue if something went wrong
            setTimeout(() => {
                // If we're still on resume_analysis step after 5 seconds, force continue
                if (currentStep === 'resume_analysis') {
                    console.log('Safety timeout: Forcing step advancement');
                    setAgentStatus('waiting_for_input');
                    setCurrentStep('skills_verification');
                    setProgressPercentage(stepProgressMap['skills_verification']);

                    // Add a message about the forced continuation
                    addMessage({
                        sender: 'system',
                        content: 'Continuing to next step...',
                        type: 'text',
                    });
                }
            }, 5000);

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

            // Save job preferences
            const { error: preferencesError } = await supabase
                .from('job_preferences')
                .upsert({
                    user_id: user.id,
                    ...onboardingData.jobPreference,
                    updated_at: new Date().toISOString()
                });

            if (preferencesError) {
                throw new Error(`Error saving preferences: ${preferencesError.message}`);
            }

            // Save profile update with resume info
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    user_id: user.id,
                    resume_url: onboardingData.resume.url,
                    resume_text: onboardingData.resume.parsedText,
                    updated_at: new Date().toISOString()
                });

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
        setCurrentInteraction
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