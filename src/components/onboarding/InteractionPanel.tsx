import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from './OnboardingContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { FaUpload, FaPlus, FaTimes, FaSpinner, FaCheck, FaArrowRight, FaStar, FaNotesMedical, FaUserTie } from 'react-icons/fa';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

// Add this interface to allow typing the window object extension
interface CustomWindow extends Window {
    _resumeFileInput?: HTMLInputElement;
}

// Response type for the parse endpoint
interface ParseResponse {
    markdown: string;
}

// Response type for the suggestions endpoint
interface SuggestionsResponse {
    suggested_job_titles: string[];
    recommended_experience_level: string;
    recommended_salary_range: string;
    skills: string[];
    recommended_locations: string[];
    other_locations: string[];
    recommended_industries: string[];
    other_industries: string[];
}

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
        goToNextStep,
        goToPreviousStep,
        setAgentStatus,
        saveOnboardingData
    } = useOnboarding();

    const [newSkill, setNewSkill] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newIndustry, setNewIndustry] = useState('');
    const [newJobTitle, setNewJobTitle] = useState('');
    const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const [resumeData, setResumeData] = useState<{ url?: string; parsedText?: string; fileName?: string }>({});

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
        'Boston',
        'Dallas',
        'Chicago',
        'Los Angeles',
        'Remote (US)',
        'Remote (Global)'
    ];

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

            const data: SuggestionsResponse = await response.json();
            console.log('Suggestions received:', data);

            // Set the suggestions - don't apply them here, we'll do that in the useEffect
            setSuggestions(data);

        } catch (error) {
            console.error('Error fetching suggestions:', error);
            toast({
                title: "Suggestion Generation Failed",
                description: "We couldn't generate personalized suggestions from your resume.",
                variant: "destructive",
            });

            // Set suggestions to null instead of using defaults
            setSuggestions(null);
        } finally {
            setIsFetchingSuggestions(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

        // Set uploading state to true
        setAgentStatus('processing_resume');

        try {
            // Get current user from auth context
            const auth = await supabase.auth.getSession();
            const user = auth.data.session?.user;

            if (!user) {
                throw new Error('User not authenticated');
            }

            // Create a unique file name with user ID and timestamp
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `resumes/${fileName}`;

            console.log('Uploading resume to path:', filePath);

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('user-uploads')
                .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type,
                });

            if (uploadError) {
                console.error('Storage upload error:', uploadError);
                throw new Error(`Error uploading file: ${uploadError.message}`);
            }

            console.log('File upload successful');

            // Get the public URL
            const { data: urlData } = supabase.storage
                .from('user-uploads')
                .getPublicUrl(filePath);

            const publicUrl = urlData.publicUrl;
            console.log('Resume URL generated:', publicUrl);

            let resumeMarkdownText = null;

            try {
                // Create a FormData object for the parse endpoint
                const formData = new FormData();
                formData.append('file', file);
                console.log('Form data created for parse request');

                // Call the parse endpoint to convert PDF to markdown
                console.log('Sending request to parse endpoint');
                const parseResponse = await fetch(`http://localhost:8000/parse`, {
                    method: 'POST',
                    body: formData,
                });

                if (!parseResponse.ok) {
                    console.error('Parse endpoint returned an error:', parseResponse.status);
                    throw new Error(`Parse API failed with status: ${parseResponse.status}`);
                }

                const parseData: ParseResponse = await parseResponse.json();
                resumeMarkdownText = parseData.markdown;
                console.log('Resume parsed to markdown successfully');

                // Set agent status to analyzing data
                setAgentStatus('analyzing_data');

            } catch (parseError) {
                console.error('Error parsing resume to markdown:', parseError);
                // Continue with the process even if parsing fails
                toast({
                    title: "Resume Uploaded",
                    description: "Your resume was uploaded but could not be fully analyzed. Some features may be limited.",
                    variant: "destructive",
                });
            }

            // Save resume data to local state
            setResumeData({
                url: publicUrl,
                parsedText: resumeMarkdownText,
                fileName: file.name
            });

            // Update profile with resume URL and text
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    resume_url: publicUrl,
                    resume_text: resumeMarkdownText,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

            if (updateError) {
                console.error('Error updating profile with resume data:', updateError);
                // Continue anyway - we'll rely on the local state
            }

            // Show success message
            toast({
                title: "Resume Uploaded",
                description: "Your resume has been uploaded and processed successfully",
            });

            // Set agent status to waiting for input and proceed to next step
            setAgentStatus('waiting_for_input');
            goToNextStep();

        } catch (error) {
            console.error("Resume upload failed:", error);
            toast({
                title: "Upload failed",
                description: "There was an error uploading your resume. Please try again.",
                variant: "destructive",
            });
            setAgentStatus('waiting_for_input');
        }
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
                                {onboardingData.jobPreference.job_titles.map(title => {
                                    // Check if this was a suggested title
                                    const isSuggested = suggestions?.suggested_job_titles?.includes(title);

                                    return (
                                        <Badge key={title} variant="outline" className="h-8 gap-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">
                                            {isSuggested && <FaStar className="h-3 w-3 text-yellow-500 mr-1" />}
                                            {title}
                                            <button
                                                onClick={() => updateJobPreference({
                                                    job_titles: onboardingData.jobPreference.job_titles.filter(t => t !== title)
                                                })}
                                                className="ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 p-0.5"
                                            >
                                                <FaTimes className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Add a job title"
                                    value={newJobTitle}
                                    onChange={e => setNewJobTitle(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddJobTitle()}
                                    className="flex-1"
                                />
                                <Button size="sm" onClick={handleAddJobTitle} variant="outline">
                                    <FaPlus className="h-3 w-3 mr-1" /> Add
                                </Button>
                            </div>
                        </div>

                        {/* List suggested job titles if available */}
                        {suggestions?.suggested_job_titles && suggestions.suggested_job_titles.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium mb-2">Suggested job titles:</p>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.suggested_job_titles.map(title => (
                                        !onboardingData.jobPreference.job_titles.includes(title) && (
                                            <Badge
                                                key={title}
                                                variant="outline"
                                                className="h-8 cursor-pointer hover:bg-primary/10"
                                                onClick={() => updateJobPreference({
                                                    job_titles: [...onboardingData.jobPreference.job_titles, title]
                                                })}
                                            >
                                                <FaStar className="h-3 w-3 text-yellow-500 mr-1" />
                                                {title}
                                                <FaPlus className="h-3 w-3 ml-2 text-muted-foreground" />
                                            </Badge>
                                        )
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'experience_level':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                            {experienceLevels.map(level => (
                                <div
                                    key={level.value}
                                    className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between
                                        ${onboardingData.jobPreference.experience_level === level.value
                                            ? 'bg-primary/10 text-primary font-medium'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    onClick={() => updateJobPreference({ experience_level: level.value })}
                                >
                                    <div className="flex items-center gap-2">
                                        <p>{level.label}</p>
                                        {suggestions && suggestions.recommended_experience_level === level.value && (
                                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-600 border-yellow-200">
                                                Recommended
                                            </Badge>
                                        )}
                                    </div>
                                    {onboardingData.jobPreference.experience_level === level.value && (
                                        <FaCheck className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'salary_expectations':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                            {salaryRanges.map(range => (
                                <div
                                    key={range.value}
                                    className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between
                                        ${onboardingData.jobPreference.salary_range === range.value
                                            ? 'bg-primary/10 text-primary font-medium'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    onClick={() => updateJobPreference({ salary_range: range.value })}
                                >
                                    <div className="flex items-center gap-2">
                                        <p>{range.label}</p>
                                        {suggestions && suggestions.recommended_salary_range === range.value && (
                                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-600 border-yellow-200">
                                                Recommended
                                            </Badge>
                                        )}
                                    </div>
                                    {onboardingData.jobPreference.salary_range === range.value && (
                                        <FaCheck className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'job_search_status':
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2">
                            {jobSearchStatuses.map(status => (
                                <div
                                    key={status.value}
                                    className={`p-3 rounded-lg cursor-pointer transition-all flex items-center justify-between
                                        ${onboardingData.jobPreference.job_search_status === status.value
                                            ? 'bg-primary/10 text-primary font-medium'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    onClick={() => updateJobPreference({ job_search_status: status.value })}
                                >
                                    <p>{status.label}</p>
                                    {onboardingData.jobPreference.job_search_status === status.value && (
                                        <FaCheck className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'resume_upload':
                return (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
                            <input
                                type="file"
                                id="resume-upload"
                                accept=".pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={isUploading || agentStatus === 'processing_resume'}
                                ref={(input) => {
                                    // Store the input reference
                                    if (input) {
                                        (window as unknown as CustomWindow)._resumeFileInput = input;
                                    }
                                }}
                            />
                            <div
                                className={`flex flex-col items-center justify-center cursor-pointer ${(isUploading || agentStatus === 'processing_resume') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => {
                                    if (isUploading || agentStatus === 'processing_resume') return;

                                    // Explicitly trigger the file input click
                                    const fileInput = document.getElementById('resume-upload') as HTMLInputElement;
                                    if (fileInput) {
                                        console.log('Clicking file input');
                                        fileInput.click();
                                    } else {
                                        console.error('Could not find file input element');
                                        // Fallback to global reference
                                        const customWindow = window as unknown as CustomWindow;
                                        if (customWindow._resumeFileInput) {
                                            customWindow._resumeFileInput.click();
                                        }
                                    }
                                }}
                            >
                                {isUploading || agentStatus === 'processing_resume' ? (
                                    <FaSpinner className="h-12 w-12 text-primary animate-spin mb-4" />
                                ) : (
                                    <FaUpload className="h-12 w-12 text-primary opacity-75 mb-4" />
                                )}
                                <h3 className="text-lg font-medium mb-2">
                                    {isUploading || agentStatus === 'processing_resume'
                                        ? "Processing..."
                                        : "Upload your resume"}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    {isUploading || agentStatus === 'processing_resume'
                                        ? "Please wait while we process your resume"
                                        : "PDF format only, max 5MB"}
                                </p>
                                {!(isUploading || agentStatus === 'processing_resume') && (
                                    <Button
                                        variant="outline"
                                        className="bg-white dark:bg-slate-800"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent double triggering

                                            // Explicitly trigger the file input click
                                            const fileInput = document.getElementById('resume-upload') as HTMLInputElement;
                                            if (fileInput) {
                                                fileInput.click();
                                            } else {
                                                const customWindow = window as unknown as CustomWindow;
                                                if (customWindow._resumeFileInput) {
                                                    customWindow._resumeFileInput.click();
                                                }
                                            }
                                        }}
                                    >
                                        <FaUpload className="mr-2 h-4 w-4" /> Select PDF
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case 'resume_analysis':
                return (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="h-20 w-20 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-center text-muted-foreground mb-4">
                            {isFetchingSuggestions
                                ? "Generating personalized suggestions based on your resume..."
                                : "Analyzing your resume to extract relevant information..."}
                        </p>
                        <p className="text-sm text-center text-muted-foreground mt-2">
                            This may take a moment. We're processing your resume to identify skills,
                            job titles, and other information to personalize your experience.
                        </p>
                    </div>
                );

            case 'skills_verification':
                return (
                    <div className="space-y-6">
                        <div className="grid gap-4">
                            {suggestions && suggestions.skills && suggestions.skills.length > 0 && onboardingData.userSkills.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    We've identified these skills based on your resume. You can add more skills or remove any that aren't relevant.
                                </p>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {onboardingData.userSkills.map(skill => {
                                    // Check if this was a suggested skill
                                    const isSuggested = suggestions?.skills?.includes(skill.skill_name);

                                    return (
                                        <Badge
                                            key={skill.skill_name}
                                            variant="secondary"
                                            className="h-8 gap-1"
                                        >
                                            {isSuggested && <FaStar className="h-3 w-3 text-yellow-500 mr-1" />}
                                            {skill.skill_name}
                                            <button
                                                onClick={() => removeSkill(skill.skill_name)}
                                                className="ml-1 rounded-full hover:bg-muted p-0.5"
                                            >
                                                <FaTimes className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    );
                                })}
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

                            {suggestions && suggestions.skills && suggestions.skills.length > 0 &&
                                onboardingData.userSkills.length === 0 && (
                                    <div className="p-4 bg-muted/20 rounded-lg">
                                        <p className="text-sm font-medium mb-2">
                                            No skills added yet. Here are suggestions based on your resume:
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {suggestions.skills.map(skillName => (
                                                <Button
                                                    key={skillName}
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        addSkill({
                                                            skill_name: skillName,
                                                            is_highlighted: false,
                                                            source: 'resume'
                                                        });
                                                    }}
                                                    className="flex items-center gap-1"
                                                >
                                                    <FaStar className="h-3 w-3 text-yellow-500" /> {skillName}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                );

            case 'location_preferences':
                return (
                    <div className="space-y-6">
                        <div className="grid gap-4">
                            {suggestions &&
                                (suggestions.recommended_locations?.length > 0 || suggestions.other_locations?.length > 0) &&
                                onboardingData.jobPreference.preferred_locations.length > 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        We've suggested some locations for you based on your resume. You can add more or remove any that aren't relevant.
                                    </p>
                                )}
                            <div className="flex flex-wrap gap-2">
                                {onboardingData.jobPreference.preferred_locations.map(location => {
                                    // Check if this was a suggested location
                                    const isSuggested = suggestions?.recommended_locations?.includes(location);

                                    return (
                                        <Badge key={location} variant="secondary" className="h-8 gap-1">
                                            {isSuggested && <FaStar className="h-3 w-3 text-yellow-500 mr-1" />}
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
                                    );
                                })}
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

                        {/* Empty state suggestion section for locations */}
                        {suggestions && suggestions.recommended_locations && suggestions.recommended_locations.length > 0 &&
                            onboardingData.jobPreference.preferred_locations.length === 0 && (
                                <div className="p-4 bg-muted/20 rounded-lg">
                                    <p className="text-sm font-medium mb-2">
                                        No locations added yet. Here are suggestions based on your resume:
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {suggestions.recommended_locations.map(location => (
                                            <Button
                                                key={location}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    updateJobPreference({
                                                        preferred_locations: [...onboardingData.jobPreference.preferred_locations, location]
                                                    });
                                                }}
                                                className="flex items-center gap-1"
                                            >
                                                <FaStar className="h-3 w-3 text-yellow-500" /> {location}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {/* Keep the other locations section */}
                        {suggestions && suggestions.other_locations && suggestions.other_locations.length > 0 && (
                            <div className="grid gap-2">
                                <Label>Popular locations</Label>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.other_locations.map(location => (
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
                        )}
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
                            {suggestions &&
                                (suggestions.recommended_industries?.length > 0 || suggestions.other_industries?.length > 0) &&
                                onboardingData.jobPreference.preferred_industries.length > 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        We've suggested some industries for you based on your resume. You can add more or remove any that aren't relevant.
                                    </p>
                                )}
                            <div className="flex flex-wrap gap-2">
                                {onboardingData.jobPreference.preferred_industries.map(industry => {
                                    // Check if this was a suggested industry
                                    const isSuggested = suggestions?.recommended_industries?.includes(industry);

                                    return (
                                        <Badge key={industry} variant="secondary" className="h-8 gap-1">
                                            {isSuggested && <FaStar className="h-3 w-3 text-yellow-500 mr-1" />}
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
                                    );
                                })}
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

                        {/* Empty state suggestion section for industries */}
                        {suggestions && suggestions.recommended_industries && suggestions.recommended_industries.length > 0 &&
                            onboardingData.jobPreference.preferred_industries.length === 0 && (
                                <div className="p-4 bg-muted/20 rounded-lg">
                                    <p className="text-sm font-medium mb-2">
                                        No industries added yet. Here are suggestions based on your resume:
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {suggestions.recommended_industries.map(industry => (
                                            <Button
                                                key={industry}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    updateJobPreference({
                                                        preferred_industries: [...onboardingData.jobPreference.preferred_industries, industry]
                                                    });
                                                }}
                                                className="flex items-center gap-1"
                                            >
                                                <FaStar className="h-3 w-3 text-yellow-500" /> {industry}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        {/* Keep the other industries section */}
                        {suggestions && suggestions.other_industries && suggestions.other_industries.length > 0 && (
                            <div className="grid gap-2">
                                <Label>Popular industries</Label>
                                <div className="flex flex-wrap gap-2">
                                    {suggestions.other_industries.map(industry => (
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
                        )}
                    </div>
                );

            case 'completion':
                return null; // No interactions needed on completion

            default:
                return null;
        }
    };

    // Add a useEffect to apply suggestions when entering specific steps
    useEffect(() => {
        // Don't proceed if we don't have suggestions yet or if suggestions is explicitly null
        if (!suggestions) return;

        // Check if we have actual suggestion data before applying
        const hasSuggestedSkills = suggestions.skills && suggestions.skills.length > 0;
        const hasSuggestedJobTitles = suggestions.suggested_job_titles && suggestions.suggested_job_titles.length > 0;
        const hasRecommendedExperienceLevel = !!suggestions.recommended_experience_level;
        const hasRecommendedSalaryRange = !!suggestions.recommended_salary_range;
        const hasRecommendedLocations = suggestions.recommended_locations && suggestions.recommended_locations.length > 0;
        const hasRecommendedIndustries = suggestions.recommended_industries && suggestions.recommended_industries.length > 0;

        // For skills verification step, apply skills from suggestions only if we have skills
        if (currentStep === 'skills_verification' && onboardingData.userSkills.length === 0 && hasSuggestedSkills) {
            // Apply the skills from suggestions
            suggestions.skills.forEach(skillName => {
                addSkill({
                    skill_name: skillName,
                    is_highlighted: false,
                    source: 'resume'
                });
            });
        }

        // For job titles step, apply suggested job titles if none selected yet and we have suggestions
        if (currentStep === 'job_titles' && onboardingData.jobPreference.job_titles.length === 0 && hasSuggestedJobTitles) {
            // If there are suggested job titles, add them to the user's preferences
            updateJobPreference({
                job_titles: [...suggestions.suggested_job_titles]
            });
        }

        // For experience level, pre-select the recommended level if none selected and we have a recommendation
        if (currentStep === 'experience_level' && !onboardingData.jobPreference.experience_level && hasRecommendedExperienceLevel) {
            updateJobPreference({
                experience_level: suggestions.recommended_experience_level
            });
        }

        // For salary expectations, pre-select the recommended range if none selected and we have a recommendation
        if (currentStep === 'salary_expectations' && !onboardingData.jobPreference.salary_range && hasRecommendedSalaryRange) {
            updateJobPreference({
                salary_range: suggestions.recommended_salary_range
            });
        }

        // For location preferences, add recommended locations if none selected and we have recommendations
        if (currentStep === 'location_preferences' && onboardingData.jobPreference.preferred_locations.length === 0 && hasRecommendedLocations) {
            updateJobPreference({
                preferred_locations: [...suggestions.recommended_locations]
            });
        }

        // For industry preferences, add recommended industries if none selected and we have recommendations
        if (currentStep === 'industry_preferences' && onboardingData.jobPreference.preferred_industries.length === 0 && hasRecommendedIndustries) {
            updateJobPreference({
                preferred_industries: [...suggestions.recommended_industries]
            });
        }

    }, [currentStep, suggestions, onboardingData, addSkill, updateJobPreference]);

    // Add useEffect hook to fetch suggestions when entering the resume_analysis step
    useEffect(() => {
        // Skip resume_analysis step if no resume was uploaded
        const hasResume =
            (resumeData && resumeData.url && resumeData.url.length > 0) ||
            (onboardingData && onboardingData.resume && onboardingData.resume.url && onboardingData.resume.url.length > 0);

        if (currentStep === 'resume_analysis' && !hasResume) {
            // No resume was uploaded, skip this step
            console.log('No resume uploaded, skipping resume analysis step');
            setAgentStatus('waiting_for_input');
            goToNextStep();
            return;
        }

        // Automatically fetch suggestions when entering the resume_analysis step
        if (currentStep === 'resume_analysis' && !suggestions && !isFetchingSuggestions) {
            fetchSuggestions().then(() => {
                // Move to next step automatically after suggestions are fetched
                setTimeout(() => {
                    setAgentStatus('waiting_for_input');
                    goToNextStep();
                }, 1500); // Short delay to allow user to see the loading state
            }).catch(error => {
                console.error("Error fetching suggestions:", error);
                // Continue anyway if there's an error
                setAgentStatus('waiting_for_input');
                goToNextStep();
                toast({
                    title: "Moving to next step",
                    description: "Completing the analysis and proceeding."
                });
            });
        }
    }, [currentStep, suggestions, isFetchingSuggestions, resumeData, fetchSuggestions, setAgentStatus, goToNextStep, onboardingData]);

    // Progress percentage based on current step
    const currentProgress = progressPercentage;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header with progress */}
            <div className="py-4 px-6 border-b">
                <div className="flex items-center gap-4 mb-3">
                    <div className="flex-shrink-0 bg-primary/10 p-3 rounded-full">
                        <FaNotesMedical className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-medium">We are taking notes for your job preference</h2>
                        <p className="text-sm text-muted-foreground">Please complete all sections</p>
                    </div>
                </div>

                <Progress value={currentProgress} className="h-2" />
                <p className="text-xs text-right mt-1 text-muted-foreground">
                    {Math.round(currentProgress)}% Complete
                </p>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-auto px-6 py-6">
                {/* Current step title */}
                {currentStep !== 'welcome' && (
                    <div className="mb-6">
                        <h3 className="text-xl font-semibold mb-2">
                            {currentStep === 'job_titles' && "Job Title"}
                            {currentStep === 'experience_level' && "Level of Roles"}
                            {currentStep === 'salary_expectations' && "Expected salary"}
                            {currentStep === 'job_search_status' && "Status of your job search"}
                            {currentStep === 'resume_upload' && "Upload Resume"}
                            {currentStep === 'resume_analysis' && "Analyzing Resume"}
                            {currentStep === 'skills_verification' && "Verify Skills"}
                            {currentStep === 'location_preferences' && "Location Preferences"}
                            {currentStep === 'remote_preferences' && "Remote Work"}
                            {currentStep === 'industry_preferences' && "Industry Preferences"}
                            {currentStep === 'completion' && "Complete Setup"}
                        </h3>

                        {/* Content description */}
                        {currentStep === 'job_titles' && (
                            <p className="text-sm text-muted-foreground">
                                Select or add job titles you're interested in
                            </p>
                        )}
                        {currentStep === 'experience_level' && (
                            <p className="text-sm text-muted-foreground">
                                What level of roles are you targeting?
                            </p>
                        )}
                        {currentStep === 'resume_upload' && (
                            <p className="text-sm text-muted-foreground">
                                Upload your resume to help us personalize your job search
                            </p>
                        )}
                    </div>
                )}

                {/* Step content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderStepContent()}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation buttons */}
            <div className="p-4 border-t bg-slate-50 dark:bg-slate-900/50 flex justify-between">
                <Button
                    variant="ghost"
                    onClick={goToPreviousStep}
                    disabled={currentStep === 'welcome' || agentStatus === 'processing_resume' || agentStatus === 'analyzing_data' || isUploading}
                    className="text-muted-foreground hover:text-foreground"
                >
                    Back
                </Button>

                {showNextButton() && currentStep !== 'completion' && (
                    <Button onClick={goToNextStep} className="gap-1">
                        Next <FaArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                )}

                {currentStep === 'completion' && (
                    <Button onClick={saveOnboardingData} className="bg-green-600 hover:bg-green-700 gap-1">
                        Complete <FaCheck className="ml-1 h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
        </div>
    );
}

// Define step order as a constant for reference
const stepOrder = [
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