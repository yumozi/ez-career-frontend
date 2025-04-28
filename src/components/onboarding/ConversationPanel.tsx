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
        setAgentStatus
    } = useOnboarding();

    const [userInput, setUserInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [lastProcessingStatus, setLastProcessingStatus] = useState<string | null>(null);
    const [processProgress, setProcessProgress] = useState(10);
    const progressIntervalRef = useRef<number | null>(null);

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
            // Add agent response
            let responseMessage = "I'm here to help you with your onboarding process. ";

            switch (currentStep) {
                case 'welcome':
                    responseMessage += "Let's get started by uploading your resume.";
                    break;
                case 'resume_upload':
                    responseMessage += "Please upload your resume so I can help personalize your profile.";
                    break;
                case 'job_titles':
                    responseMessage += "You can select job titles or add your own on the left panel.";
                    break;
                case 'experience_level':
                    responseMessage += "Please select your experience level from the options.";
                    break;
                case 'salary_expectations':
                    responseMessage += "What are your salary expectations?";
                    break;
                case 'skills_verification':
                    responseMessage += "Please confirm your skills in the left panel.";
                    break;
                default:
                    responseMessage += "Please continue with the steps in the left panel to complete your profile.";
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

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Messages area - adding more top padding */}
            <ScrollArea className="flex-1 px-6 pb-6 pt-12">
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

                    {/* Invisible element to scroll to */}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Complete button (only show on completion step) */}
            {currentStep === 'completion' && (
                <div className="px-6 py-3 border-t">
                    <Button
                        onClick={handleComplete}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                        <FaCheckCircle className="mr-2 h-4 w-4" />
                        Complete Onboarding & Go to Dashboard
                    </Button>
                </div>
            )}

            {/* Input area with prompt */}
            <div className="border-t p-4">
                <div className="flex gap-2 max-w-3xl mx-auto">
                    <Input
                        ref={inputRef}
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type a message to the assistant..."
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-primary"
                        disabled={isSending || agentStatus === 'processing_resume' || agentStatus === 'analyzing_data'}
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!userInput.trim() || isSending || agentStatus === 'processing_resume' || agentStatus === 'analyzing_data'}
                        className="bg-primary hover:bg-primary/90"
                    >
                        {isSending ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <FaPaperPlane className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
} 