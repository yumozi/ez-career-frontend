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
import { FaUpload, FaPlus, FaTimes, FaSpinner, FaCheck, FaArrowRight, FaStar } from 'react-icons/fa';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

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
    const [resumeData, setResumeData] = useState<{url?: string; parsedText?: string; fileName?: string}>({});
    
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
                            {suggestions && suggestions.suggested_job_titles && suggestions.suggested_job_titles.length > 0 && onboardingData.jobPreference.job_titles.length > 0 && (
                                <p className="text-sm text-muted-foreground">
                                    We've suggested some job titles for you based on your resume. You can add more or remove any that aren't relevant.
                                </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {onboardingData.jobPreference.job_titles.map(title => {
                                    // Check if this was a suggested title
                                    const isSuggested = suggestions?.suggested_job_titles?.includes(title);
                                    
                                    return (
                                        <Badge key={title} variant="secondary" className="h-8 gap-1">
                                            {isSuggested && <FaStar className="h-3 w-3 text-yellow-500 mr-1" />}
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
                                <Button size="sm" onClick={handleAddJobTitle}>
                                    <FaPlus className="h-3 w-3 mr-1" /> Add
                                </Button>
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
                                    className={`cursor-pointer transition-all ${
                                        onboardingData.jobPreference.experience_level === level.value
                                            ? 'border-primary bg-primary/5'
                                            : 'hover:border-muted-foreground/20 hover:bg-muted/20'
                                    }`}
                                    onClick={() => updateJobPreference({ experience_level: level.value })}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{level.label}</p>
                                            {suggestions && suggestions.recommended_experience_level === level.value && (
                                                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                                    Recommended
                                                </Badge>
                                            )}
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
                                    className={`cursor-pointer transition-all ${
                                        onboardingData.jobPreference.salary_range === range.value
                                            ? 'border-primary bg-primary/5'
                                            : 'hover:border-muted-foreground/20 hover:bg-muted/20'
                                    }`}
                                    onClick={() => updateJobPreference({ salary_range: range.value })}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{range.label}</p>
                                            {suggestions && suggestions.recommended_salary_range === range.value && (
                                                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
                                                    Recommended
                                                </Badge>
                                            )}
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
                                    // First, ensure all onboarding data is saved using the context method
                                    const saved = await saveOnboardingData();
                                    
                                    if (!saved) {
                                        console.error("Failed to save onboarding data");
                                        toast({
                                            title: "Error Saving Data",
                                            description: "There was an error saving your profile data.",
                                            variant: "destructive",
                                        });
                                    }
                                    
                                    // Get current user from auth context
                                    const auth = await supabase.auth.getSession();
                                    const user = auth.data.session?.user;
                                    
                                    if (user) {
                                        // Double-check that done_onboarding is definitely set to true
                                        const { error } = await supabase
                                            .from('profiles')
                                            .update({ done_onboarding: true })
                                            .eq('user_id', user.id);
                                            
                                        if (error) {
                                            console.error('Error setting onboarding complete:', error);
                                        }
                                    }
                                    
                                    // Show feedback to user
                                    toast({
                                        title: "Profile Complete!",
                                        description: "Your profile setup is complete. Redirecting to dashboard...",
                                    });
                                    
                                    // Force a reload to ensure clean state
                                    setTimeout(() => {
                                        window.location.href = "/";
                                    }, 1000); // Short delay to show the toast message
                                } catch (error) {
                                    console.error('Error completing onboarding:', error);
                                    // Still try to redirect
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