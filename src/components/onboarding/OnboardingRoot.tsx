import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from '../ui/toaster';
import { OnboardingProvider } from './OnboardingContext';
import { supabase } from '@/lib/supabase';
import { verifyStorageBucket } from '@/lib/storage-utils';
import { toast } from '../ui/use-toast';
import InteractionPanel from './InteractionPanel';
import ConversationPanel from './ConversationPanel';
import { Button } from '../ui/button';
import { FaArrowRight } from 'react-icons/fa';

// Set cookie with expiration
function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

export default function OnboardingRoot() {
    const navigate = useNavigate();

    const handleSkipOnboarding = () => {
        // Mark onboarding as skipped in both localStorage and cookies for redundancy
        localStorage.setItem('onboarding_skipped', 'true');
        setCookie('onboarding_skipped', 'true', 30); // 30 days

        // Show toast notification
        toast({
            title: "Onboarding skipped",
            description: "You can always complete your profile later in the settings.",
            duration: 3000,
        });

        // Navigate to the dashboard
        navigate('/');
    };

    useEffect(() => {
        // Verify user is authenticated
        const checkAuth = async () => {
            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                navigate('/login');
            }
        };

        checkAuth();

        // Verify storage bucket is set up
        const verifyStorage = async () => {
            const { success, message } = await verifyStorageBucket();
            if (!success) {
                console.error('Storage verification failed:', message);
                toast({
                    title: "Storage Configuration Issue",
                    description: "There might be an issue with the storage configuration. Your resume uploads may not work properly.",
                    variant: "destructive",
                    duration: 6000,
                });
            } else {
                console.log('Storage verification successful:', message);
            }
        };

        verifyStorage();
    }, [navigate]);

    return (
        <OnboardingProvider>
            <div className="fixed top-6 right-6 z-50">
                <Button
                    onClick={handleSkipOnboarding}
                    className="bg-primary text-white hover:bg-primary/90 shadow-lg px-4 py-2 font-medium"
                    size="lg"
                >
                    Skip Onboarding <FaArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
            <div className="flex h-screen overflow-hidden">
                <div className="flex-1 overflow-auto border-r">
                    <InteractionPanel />
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                    <ConversationPanel />
                </div>
            </div>
            <Toaster />
        </OnboardingProvider>
    );
} 