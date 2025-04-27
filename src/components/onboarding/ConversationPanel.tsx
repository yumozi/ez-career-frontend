import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaRobot, FaUser, FaInfo, FaCheckCircle } from 'react-icons/fa';
import { useOnboarding, Message } from './OnboardingContext';
import { format } from 'date-fns';

export default function ConversationPanel() {
    const navigate = useNavigate();
    const {
        messages,
        saveOnboardingData
    } = useOnboarding();

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleComplete = async () => {
        const success = await saveOnboardingData();
        if (success) {
            navigate('/');
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Chat header */}
            <div className="border-b py-3 px-6">
                <h2 className="text-xl font-semibold">Conversation</h2>
                <p className="text-sm text-muted-foreground">Chat with your EZ Career AI assistant</p>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-4 mb-4">
                    <AnimatePresence initial={false}>
                        {messages.map((message, index) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex items-start gap-3"
                            >
                                {/* Avatar */}
                                {message.sender === 'agent' && (
                                    <Avatar className="h-8 w-8 mt-0.5 bg-primary/10">
                                        <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
                                        <AvatarImage src="/agent-avatar.png" />
                                    </Avatar>
                                )}

                                {message.sender === 'user' && (
                                    <Avatar className="h-8 w-8 mt-0.5">
                                        <AvatarFallback className="bg-blue-100 text-blue-600">
                                            <FaUser className="h-4 w-4" />
                                        </AvatarFallback>
                                    </Avatar>
                                )}

                                {message.sender === 'system' && (
                                    <div className="h-8 w-8 mt-0.5 rounded-full bg-muted flex items-center justify-center">
                                        <FaInfo className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                )}

                                {/* Message content */}
                                <div className={`
                                    flex-1 px-4 py-2 rounded-lg 
                                    ${message.sender === 'agent' ? 'bg-primary/5 text-foreground' : ''}
                                    ${message.sender === 'user' ? 'bg-blue-50 dark:bg-blue-900/20 text-foreground' : ''}
                                    ${message.sender === 'system' ? 'bg-muted text-muted-foreground text-sm' : ''}
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

                                    {/* Timestamp */}
                                    <div className="text-[10px] text-muted-foreground mt-1">
                                        {format(new Date(message.timestamp), 'h:mm a')}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* Invisible element to scroll to */}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Input area with prompt */}
            <div className="border-t p-4 bg-muted/20">
                <p className="text-xs text-center text-muted-foreground mb-2">
                    Use the interaction panel on the left to respond to questions and complete your profile setup
                </p>
            </div>
        </div>
    );
} 