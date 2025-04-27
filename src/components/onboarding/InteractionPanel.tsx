import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from './OnboardingContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { FaUpload, FaPlus, FaTimes, FaSpinner, FaCheck, FaArrowRight } from 'react-icons/fa';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

export default function InteractionPanel() {
    const {
        currentStep,
        agentStatus,
        progressPercentage,
        isUploading,
        onboardingData,
        updateJobPreference,
        addSkill,
        removeSkill,
        uploadResume,
        goToNextStep,
        goToPreviousStep,
        setAgentStatus
    } = useOnboarding();

    const [newSkill, setNewSkill] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newIndustry, setNewIndustry] = useState('');
    const [newJobTitle, setNewJobTitle] = useState('');

    // Common job titles for selection
    const commonJobTitles = [
        'Software Engineer',
        'Frontend Developer',
        'Backend Developer',
        'Full Stack Developer',
        'DevOps Engineer',
        'Data Scientist',
        'UI/UX Designer',
        'Product Manager',
        'Project Manager',
        'Quality Assurance Engineer'
    ];

    // Experience levels
    const experienceLevels = [
        { value: 'entry_level', label: 'Entry Level (0-2 years)' },
        { value: 'mid_level', label: 'Mid Level (3-5 years)' },
        { value: 'senior', label: 'Senior (5-8 years)' },
        { value: 'lead', label: 'Lead / Principal (8+ years)' },
        { value: 'executive', label: 'Executive / Director' }
    ];

    // Salary ranges
    const salaryRanges = [
        { value: 'under_50k', label: 'Under $50K/year' },
        { value: '50k_75k', label: '$50K - $75K/year' },
        { value: '75k_100k', label: '$75K - $100K/year' },
        { value: '100k_150k', label: '$100K - $150K/year' },
        { value: '150k_200k', label: '$150K - $200K/year' },
        { value: 'over_200k', label: 'Over $200K/year' }
    ];

    // Job search statuses
    const jobSearchStatuses = [
        { value: 'actively_looking', label: 'Actively looking' },
        { value: 'passively_looking', label: 'Passively looking' },
        { value: 'not_looking', label: 'Not currently looking' },
        { value: 'urgent', label: 'Urgently seeking opportunities' }
    ];

    // Common industries
    const commonIndustries = [
        'Technology',
        'Finance',
        'Healthcare',
        'Education',
        'E-commerce',
        'Media & Entertainment',
        'Government',
        'Manufacturing',
        'Telecommunications',
        'Retail'
    ];

    // Common locations
    const commonLocations = [
        'San Francisco Bay Area',
        'New York City',
        'Seattle',
        'Austin',
        'Boston',
        'Los Angeles',
        'Chicago',
        'Denver',
        'Remote (US)',
        'Remote (Global)'
    ];

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        console.log('Selected file:', file.name, 'Type:', file.type, 'Size:', file.size);

        if (file.type !== 'application/pdf') {
            // Show feedback for invalid file type
            console.log('Invalid file type:', file.type);
            toast({
                title: "Invalid file type",
                description: "Please upload a PDF file",
                variant: "destructive",
            });
            return;
        }

        // Check file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            console.log('File too large:', file.size);
            toast({
                title: "File too large",
                description: "Please upload a file smaller than 5MB",
                variant: "destructive",
            });
            return;
        }

        // Show visual feedback that upload is starting
        console.log('Starting file upload process...');
        toast({
            title: "Uploading resume",
            description: "Your resume is being uploaded and analyzed...",
        });

        // Call the upload function
        uploadResume(file).catch(error => {
            console.error("Resume upload failed:", error);
            toast({
                title: "Upload failed",
                description: "There was an error uploading your resume. Please try again.",
                variant: "destructive",
            });
        });
    };

    const handleAddSkill = () => {
        if (!newSkill.trim()) return;

        addSkill({
            skill_name: newSkill.trim(),
            is_highlighted: false,
            source: 'user_input'
        });

        setNewSkill('');
    };

    const handleAddJobTitle = () => {
        if (!newJobTitle.trim()) return;

        updateJobPreference({
            job_titles: [...onboardingData.jobPreference.job_titles, newJobTitle.trim()]
        });

        setNewJobTitle('');
    };

    const handleAddLocation = () => {
        if (!newLocation.trim()) return;

        updateJobPreference({
            preferred_locations: [...onboardingData.jobPreference.preferred_locations, newLocation.trim()]
        });

        setNewLocation('');
    };

    const handleAddIndustry = () => {
        if (!newIndustry.trim()) return;

        updateJobPreference({
            preferred_industries: [...onboardingData.jobPreference.preferred_industries, newIndustry.trim()]
        });

        setNewIndustry('');
    };

    // Check if we should show the next button
    const showNextButton = () => {
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

    // Render the current step's UI
    const renderStepContent = () => {
        switch (currentStep) {
            case 'welcome':
                return null; // No interaction needed

            case 'job_titles':
                return (
                    <div className="space-y-6">
                        <div className="grid gap-4">
                            <div className="flex flex-wrap gap-2">
                                {onboardingData.jobPreference.job_titles.map(title => (
                                    <Badge key={title} variant="secondary" className="h-8 gap-1">
                                        {title}
                                        <button
                                            onClick={() => updateJobPreference({
                                                job_titles: onboardingData.jobPreference.job_titles.filter(t => t !== title)
                                            })}
                                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                                        >
                                            <FaTimes className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a job title"
                                    value={newJobTitle}
                                    onChange={e => setNewJobTitle(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddJobTitle()}
                                    className="flex-1"
                                />
                                <Button size="sm" onClick={handleAddJobTitle}>
                                    <FaPlus className="h-3 w-3 mr-1" /> Add
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Common job titles</Label>
                            <div className="flex flex-wrap gap-2">
                                {commonJobTitles.map(title => (
                                    <Button
                                        key={title}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (!onboardingData.jobPreference.job_titles.includes(title)) {
                                                updateJobPreference({
                                                    job_titles: [...onboardingData.jobPreference.job_titles, title]
                                                });
                                            }
                                        }}
                                        className={onboardingData.jobPreference.job_titles.includes(title) ? "bg-primary/10" : ""}
                                    >
                                        {title}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'experience_level':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            {experienceLevels.map(level => (
                                <Card
                                    key={level.value}
                                    className={`cursor-pointer transition-all ${onboardingData.jobPreference.experience_level === level.value
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:border-muted-foreground/20 hover:bg-muted/20'
                                        }`}
                                    onClick={() => updateJobPreference({ experience_level: level.value })}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{level.label}</p>
                                        </div>
                                        {onboardingData.jobPreference.experience_level === level.value && (
                                            <FaCheck className="h-4 w-4 text-primary" />
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                );

            case 'salary_expectations':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            {salaryRanges.map(range => (
                                <Card
                                    key={range.value}
                                    className={`cursor-pointer transition-all ${onboardingData.jobPreference.salary_range === range.value
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:border-muted-foreground/20 hover:bg-muted/20'
                                        }`}
                                    onClick={() => updateJobPreference({ salary_range: range.value })}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{range.label}</p>
                                        </div>
                                        {onboardingData.jobPreference.salary_range === range.value && (
                                            <FaCheck className="h-4 w-4 text-primary" />
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                );

            case 'job_search_status':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            {jobSearchStatuses.map(status => (
                                <Card
                                    key={status.value}
                                    className={`cursor-pointer transition-all ${onboardingData.jobPreference.job_search_status === status.value
                                        ? 'border-primary bg-primary/5'
                                        : 'hover:border-muted-foreground/20 hover:bg-muted/20'
                                        }`}
                                    onClick={() => updateJobPreference({ job_search_status: status.value })}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{status.label}</p>
                                        </div>
                                        {onboardingData.jobPreference.job_search_status === status.value && (
                                            <FaCheck className="h-4 w-4 text-primary" />
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                );

            case 'resume_upload':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 bg-muted/10">
                            <div className="mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                                <FaUpload className="h-6 w-6 text-primary/70" />
                            </div>
                            <p className="mb-4 text-center text-sm text-muted-foreground">
                                Drag and drop your PDF resume, or click to browse
                            </p>

                            <input
                                id="resume-upload"
                                type="file"
                                accept=".pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={isUploading}
                                ref={(input) => {
                                    // Store the input reference
                                    if (input) {
                                        (window as any)._resumeFileInput = input;
                                    }
                                }}
                            />

                            <Button
                                disabled={isUploading}
                                className="cursor-pointer"
                                onClick={() => {
                                    // Explicitly trigger the file input click
                                    const fileInput = document.getElementById('resume-upload') as HTMLInputElement;
                                    if (fileInput) {
                                        console.log('Clicking file input');
                                        fileInput.click();
                                    } else {
                                        console.error('Could not find file input element');
                                        // Fallback to global reference
                                        if ((window as any)._resumeFileInput) {
                                            (window as any)._resumeFileInput.click();
                                        }
                                    }
                                }}
                            >
                                {isUploading ? (
                                    <>
                                        <FaSpinner className="h-4 w-4 mr-2 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>Choose File</>
                                )}
                            </Button>
                        </div>
                    </div>
                );

            case 'resume_analysis':
                return (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="h-20 w-20 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-center text-muted-foreground mb-4">
                            Analyzing your resume to identify your skills and experience...
                        </p>
                        <Button
                            onClick={() => {
                                // Force the app to continue regardless of database errors
                                // Add mock skills for the demo
                                const mockSkills = [
                                    { skill_name: 'React', is_highlighted: true, source: 'resume' as const },
                                    { skill_name: 'TypeScript', is_highlighted: true, source: 'resume' as const },
                                    { skill_name: 'JavaScript', is_highlighted: false, source: 'resume' as const },
                                    { skill_name: 'Node.js', is_highlighted: false, source: 'resume' as const }
                                ];

                                // Update skills
                                mockSkills.forEach(skill => addSkill(skill));

                                // Set status to waiting for input
                                setAgentStatus('waiting_for_input');

                                // Continue to next step
                                goToNextStep();

                                // Show toast message
                                toast({
                                    title: "Moving to next step",
                                    description: "Database tables may not be set up correctly. Using demo mode."
                                });
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-4"
                        >
                            Continue Anyway
                        </Button>
                    </div>
                );

            case 'skills_verification':
                return (
                    <div className="space-y-6">
                        <div className="grid gap-4">
                            <div className="flex flex-wrap gap-2">
                                {onboardingData.userSkills.map(skill => (
                                    <Badge
                                        key={skill.skill_name}
                                        variant={skill.is_highlighted ? "default" : "secondary"}
                                        className="h-8 gap-1"
                                    >
                                        {skill.skill_name}
                                        <button
                                            onClick={() => removeSkill(skill.skill_name)}
                                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                                        >
                                            <FaTimes className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a skill"
                                    value={newSkill}
                                    onChange={e => setNewSkill(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                                    className="flex-1"
                                />
                                <Button size="sm" onClick={handleAddSkill}>
                                    <FaPlus className="h-3 w-3 mr-1" /> Add
                                </Button>
                            </div>
                        </div>
                    </div>
                );

            case 'location_preferences':
                return (
                    <div className="space-y-6">
                        <div className="grid gap-4">
                            <div className="flex flex-wrap gap-2">
                                {onboardingData.jobPreference.preferred_locations.map(location => (
                                    <Badge key={location} variant="secondary" className="h-8 gap-1">
                                        {location}
                                        <button
                                            onClick={() => updateJobPreference({
                                                preferred_locations: onboardingData.jobPreference.preferred_locations.filter(l => l !== location)
                                            })}
                                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                                        >
                                            <FaTimes className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a location"
                                    value={newLocation}
                                    onChange={e => setNewLocation(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
                                    className="flex-1"
                                />
                                <Button size="sm" onClick={handleAddLocation}>
                                    <FaPlus className="h-3 w-3 mr-1" /> Add
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Common locations</Label>
                            <div className="flex flex-wrap gap-2">
                                {commonLocations.map(location => (
                                    <Button
                                        key={location}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (!onboardingData.jobPreference.preferred_locations.includes(location)) {
                                                updateJobPreference({
                                                    preferred_locations: [...onboardingData.jobPreference.preferred_locations, location]
                                                });
                                            }
                                        }}
                                        className={onboardingData.jobPreference.preferred_locations.includes(location) ? "bg-primary/10" : ""}
                                    >
                                        {location}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'remote_preferences':
                return (
                    <div className="space-y-6">
                        <Card className="border p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="remote-preference">Are you open to remote work?</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Toggle this option if you're interested in remote job opportunities
                                    </p>
                                </div>
                                <Switch
                                    id="remote-preference"
                                    checked={onboardingData.jobPreference.remote_preference}
                                    onCheckedChange={checked => updateJobPreference({ remote_preference: checked })}
                                />
                            </div>
                        </Card>
                    </div>
                );

            case 'industry_preferences':
                return (
                    <div className="space-y-6">
                        <div className="grid gap-4">
                            <div className="flex flex-wrap gap-2">
                                {onboardingData.jobPreference.preferred_industries.map(industry => (
                                    <Badge key={industry} variant="secondary" className="h-8 gap-1">
                                        {industry}
                                        <button
                                            onClick={() => updateJobPreference({
                                                preferred_industries: onboardingData.jobPreference.preferred_industries.filter(i => i !== industry)
                                            })}
                                            className="ml-1 rounded-full hover:bg-muted p-0.5"
                                        >
                                            <FaTimes className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add an industry"
                                    value={newIndustry}
                                    onChange={e => setNewIndustry(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddIndustry()}
                                    className="flex-1"
                                />
                                <Button size="sm" onClick={handleAddIndustry}>
                                    <FaPlus className="h-3 w-3 mr-1" /> Add
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Common industries</Label>
                            <div className="flex flex-wrap gap-2">
                                {commonIndustries.map(industry => (
                                    <Button
                                        key={industry}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (!onboardingData.jobPreference.preferred_industries.includes(industry)) {
                                                updateJobPreference({
                                                    preferred_industries: [...onboardingData.jobPreference.preferred_industries, industry]
                                                });
                                            }
                                        }}
                                        className={onboardingData.jobPreference.preferred_industries.includes(industry) ? "bg-primary/10" : ""}
                                    >
                                        {industry}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'completion':
                return null; // No interactions needed on completion

            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header with progress */}
            <div className="p-6 pb-0">
                <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">Step {stepOrder.indexOf(currentStep) + 1} of {stepOrder.length} ({progressPercentage}% complete)</p>
            </div>

            {/* Main interaction area */}
            <div className="flex-1 p-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="h-full"
                    >
                        {renderStepContent()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation buttons */}
            <div className="p-4 border-t bg-background/95 backdrop-blur-sm">
                <div className="flex gap-2">
                    {currentStep !== 'welcome' && currentStep !== 'completion' && (
                        <Button
                            variant="outline"
                            onClick={goToPreviousStep}
                            disabled={agentStatus === 'processing_resume' || agentStatus === 'analyzing_data' || isUploading}
                        >
                            Back
                        </Button>
                    )}

                    {currentStep === 'completion' ? (
                        <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700" 
                            onClick={async () => {
                                try {
                                    // Get current user from auth context
                                    const auth = await supabase.auth.getSession();
                                    const user = auth.data.session?.user;
                                    
                                    if (user) {
                                        // Ensure done_onboarding is set to true before redirecting
                                        await supabase
                                            .from('profiles')
                                            .update({ done_onboarding: true })
                                            .eq('user_id', user.id);
                                    }
                                    
                                    // Redirect to dashboard
                                    window.location.href = "/";
                                } catch (error) {
                                    console.error('Error setting onboarding complete:', error);
                                    // Still redirect even if there's an error
                                    window.location.href = "/";
                                }
                            }}
                        >
                            Go to Dashboard <FaArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            className="flex-1"
                            onClick={goToNextStep}
                            disabled={agentStatus === 'processing_resume' || agentStatus === 'analyzing_data' || isUploading}
                        >
                            {showNextButton() ? (currentStep === 'welcome' ? 'Get Started' : 'Continue') : 'Skip & Continue'} <FaArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}

                    {/* Skip Step Button - only show for certain steps */}
                    {currentStep !== 'welcome' &&
                        currentStep !== 'completion' &&
                        currentStep !== 'resume_analysis' &&
                        !showNextButton() && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={goToNextStep}
                                disabled={agentStatus === 'processing_resume' || agentStatus === 'analyzing_data' || isUploading}
                                className="ml-auto"
                            >
                                Skip this step
                            </Button>
                        )}
                </div>
            </div>
        </div>
    );
}

// Define step order as a constant for reference
const stepOrder = [
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