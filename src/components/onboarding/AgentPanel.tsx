import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from './OnboardingContext';
import { Progress } from '@/components/ui/progress';
import { FaPen, FaSearch, FaRobot, FaUser, FaBrain, FaFileAlt } from 'react-icons/fa';

export default function AgentPanel() {
    const {
        agentStatus,
        agentMessage,
        progressPercentage,
        isUploading,
        currentStep,
    } = useOnboarding();

    const [typedMessage, setTypedMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Typing animation effect
    useEffect(() => {
        setIsTyping(true);
        setTypedMessage('');

        const text = agentMessage;
        let i = 0;
        const typeSpeed = 20; // ms per character

        const typer = setInterval(() => {
            if (i < text.length) {
                setTypedMessage(prev => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(typer);
                setIsTyping(false);
            }
        }, typeSpeed);

        return () => clearInterval(typer);
    }, [agentMessage]);

    // Get the appropriate icon based on the current step
    const getStepIcon = () => {
        switch (currentStep) {
            case 'job_titles':
            case 'experience_level':
            case 'salary_expectations':
            case 'job_search_status':
                return <FaUser className="h-5 w-5 text-primary" />;
            case 'resume_upload':
            case 'resume_analysis':
                return <FaFileAlt className="h-5 w-5 text-primary" />;
            case 'skills_verification':
                return <FaBrain className="h-5 w-5 text-primary" />;
            case 'location_preferences':
            case 'remote_preferences':
            case 'industry_preferences':
                return <FaSearch className="h-5 w-5 text-primary" />;
            default:
                return <FaRobot className="h-5 w-5 text-primary" />;
        }
    };

    // Get status text
    const getStatusText = () => {
        switch (agentStatus) {
            case 'processing_resume':
                return 'Processing resume...';
            case 'analyzing_data':
                return 'Analyzing data...';
            case 'thinking':
                return 'Thinking...';
            case 'waiting_for_input':
                return 'Waiting for input...';
            default:
                return 'Listening...';
        }
    };

    return (
        <div className="flex flex-col h-full p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">EZ Career Assistant</h2>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">Setting up your profile ({progressPercentage}% complete)</p>
            </div>

            {/* Agent Status */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        {getStepIcon()}
                    </div>
                    <div>
                        <p className="text-sm font-medium">Agent Status</p>
                        <p className="text-xs text-muted-foreground">{getStatusText()}</p>
                    </div>
                </div>
            </div>

            {/* Visual representation of what the agent is doing */}
            <div className="flex-1 relative overflow-hidden border rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 backdrop-blur-sm">
                <div className="absolute inset-0 z-10 p-4 overflow-auto">
                    {/* Agent messages */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="prose prose-sm max-w-none"
                        >
                            {typedMessage}
                            {isTyping && <span className="blink">|</span>}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Loading animations */}
                <div className="absolute inset-0 pointer-events-none">
                    {agentStatus === 'processing_resume' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                className="h-32 w-32 rounded-full bg-primary/5 flex items-center justify-center"
                                animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            >
                                <motion.div
                                    className="absolute inset-0 border-2 border-primary/30 rounded-full"
                                    animate={{ scale: [1, 1.5], opacity: [1, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                                <FaFileAlt className="h-12 w-12 text-primary/60" />
                            </motion.div>
                        </div>
                    )}

                    {agentStatus === 'analyzing_data' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <motion.div
                                className="h-32 w-32 rounded-full bg-primary/5 flex items-center justify-center"
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            >
                                <motion.div
                                    className="absolute inset-0 border-2 border-dashed border-primary/40 rounded-full"
                                    animate={{ rotate: [360, 0] }}
                                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                />
                                <FaBrain className="h-12 w-12 text-primary/60" />
                            </motion.div>
                        </div>
                    )}

                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                            <motion.div
                                className="text-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <motion.div
                                    className="h-20 w-20 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                />
                                <p className="text-sm font-medium">Uploading your resume...</p>
                            </motion.div>
                        </div>
                    )}
                </div>

                {/* Decorative elements */}
                <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-background/10 to-transparent pointer-events-none" />

                <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            </div>

            {/* Notes being taken - small visual element */}
            <div className="mt-6 relative">
                <div className="relative rounded-lg border border-border/50 bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-sm">
                        <FaPen className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground font-medium">We are taking notes for your job preferences</span>
                    </div>
                    <motion.div
                        className="absolute bottom-0 left-0 h-0.5 bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progressPercentage}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>
        </div>
    );
}

// Add blink animation to CSS
const style = document.createElement('style');
style.textContent = `
  .blink {
    animation: blink 1s step-end infinite;
  }
  
  @keyframes blink {
    from, to { opacity: 1; }
    50% { opacity: 0; }
  }
`;
document.head.appendChild(style); 