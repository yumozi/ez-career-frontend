import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from './OnboardingContext';
import { Progress } from '@/components/ui/progress';
import { FaStar, FaNotesMedical, FaClipboardList, FaRegLightbulb } from 'react-icons/fa';

// Interface for props
interface InteractionPanelProps {
    showHeader?: boolean;
    showNavigation?: boolean;
}

export default function InteractionPanel({ showHeader = true }: InteractionPanelProps) {
    const {
        currentStep,
        progressPercentage,
        onboardingData,
    } = useOnboarding();

    // Map for readable experience level labels
    const experienceLevelMap: Record<string, string> = {
        'entry_level': 'Entry Level (0-2 years)',
        'mid_level': 'Mid Level (3-5 years)',
        'senior': 'Senior (5-8 years)',
        'lead': 'Lead / Principal (8+ years)',
        'executive': 'Executive / Director'
    };

    // Map for readable salary range labels
    const salaryRangeMap: Record<string, string> = {
        'under_50k': 'Under $50K/year',
        '50k_75k': '$50K - $75K/year',
        '75k_100k': '$75K - $100K/year',
        '100k_150k': '$100K - $150K/year',
        '150k_200k': '$150K - $200K/year',
        'over_200k': 'Over $200K/year'
    };

    // Map for readable job search status labels
    const jobSearchStatusMap: Record<string, string> = {
        'actively_looking': 'Actively looking',
        'passively_looking': 'Passively looking',
        'not_looking': 'Not currently looking',
        'urgent': 'Urgently seeking opportunities'
    };

    // Function to get readable label for values
    const getReadableLabel = (map: Record<string, string>, value: string): string => {
        return map[value] || value;
    };

    // Function to determine if a section should be visible based on the current step
    const shouldShowSection = (sectionStep: string): boolean => {
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

        const currentStepIndex = stepOrder.indexOf(currentStep);
        const sectionStepIndex = stepOrder.indexOf(sectionStep);

        // Special case for resume - show as soon as available
        if (sectionStep === 'resume_analysis' && onboardingData.resume.url) {
            return true;
        }

        // Only show sections from completed steps (steps we've moved past)
        // This ensures information only appears after the user has confirmed it
        return currentStepIndex > sectionStepIndex && sectionStepIndex !== -1;
    };

    // Check if there's any information to display
    const hasAnyInformation = () => {
        // Check if any sections are visible
        if (onboardingData.resume.url) return true;
        if (shouldShowSection('job_titles') && onboardingData.jobPreference.job_titles.length > 0) return true;
        if (shouldShowSection('experience_level') && onboardingData.jobPreference.experience_level) return true;
        if (shouldShowSection('salary_expectations') && onboardingData.jobPreference.salary_range) return true;
        if (shouldShowSection('job_search_status') && onboardingData.jobPreference.job_search_status) return true;
        if (shouldShowSection('skills_verification') && onboardingData.userSkills.length > 0) return true;
        if (shouldShowSection('location_preferences') && onboardingData.jobPreference.preferred_locations.length > 0) return true;
        if (shouldShowSection('remote_preferences')) return true;
        if (shouldShowSection('industry_preferences') && onboardingData.jobPreference.preferred_industries.length > 0) return true;

        return false;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header (if enabled) */}
            {showHeader && (
                <div className="p-6 border-b flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <FaNotesMedical className="h-5 w-5 text-blue-600" />
                        <h2 className="text-xl font-medium">Job Preference Summary</h2>
                    </div>
                    <Progress value={progressPercentage} className="mt-4 h-2" />
                </div>
            )}

            {/* Notebook content - scrollable area */}
            <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: "calc(100vh - 160px)" }}>
                {/* Empty state placeholder when no information yet */}
                {!hasAnyInformation() ? (
                    <motion.div
                        className="h-full flex flex-col items-center justify-center text-center px-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="bg-blue-100 rounded-full p-5 mb-6">
                            <FaClipboardList className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-medium text-gray-800 mb-3">Your Job Profile</h3>
                        <p className="text-gray-600 mb-6 max-w-sm">
                            As you progress through the conversation, we'll build your job preference profile here.
                        </p>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3 max-w-sm">
                            <div className="flex-shrink-0 mt-1">
                                <FaRegLightbulb className="h-5 w-5 text-blue-600" />
                            </div>
                            <p className="text-sm text-gray-700">
                                Start by uploading your resume, and then answer the questions on the right to see your profile take shape.
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-8">
                        {/* Resume section - show once resume is uploaded */}
                        {(shouldShowSection('resume_analysis') && onboardingData.resume.fileName) && (
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Resume</h3>
                                <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm inline-flex items-center">
                                    <span>📄</span>
                                    <span className="ml-2">{onboardingData.resume.fileName}</span>
                                </div>
                            </div>
                        )}

                        {/* Job Titles Section - show after job_titles step */}
                        {shouldShowSection('job_titles') && (
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Job Title</h3>
                                {onboardingData.jobPreference.job_titles.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {onboardingData.jobPreference.job_titles.map(title => (
                                            <div key={title} className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                                                {title}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">Not specified yet</p>
                                )}
                            </div>
                        )}

                        {/* Experience Level Section - show after experience_level step */}
                        {shouldShowSection('experience_level') && (
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Level of Roles</h3>
                                {onboardingData.jobPreference.experience_level ? (
                                    <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm inline-block">
                                        {getReadableLabel(experienceLevelMap, onboardingData.jobPreference.experience_level)}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">Not specified yet</p>
                                )}
                            </div>
                        )}

                        {/* Salary Expectations Section - show after salary_expectations step */}
                        {shouldShowSection('salary_expectations') && (
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Expected salary</h3>
                                {onboardingData.jobPreference.salary_range ? (
                                    <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm inline-block">
                                        {getReadableLabel(salaryRangeMap, onboardingData.jobPreference.salary_range)}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">Not specified yet</p>
                                )}
                            </div>
                        )}

                        {/* Job Search Status Section - show after job_search_status step */}
                        {shouldShowSection('job_search_status') && (
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Status of your job search</h3>
                                {onboardingData.jobPreference.job_search_status ? (
                                    <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm inline-block">
                                        {getReadableLabel(jobSearchStatusMap, onboardingData.jobPreference.job_search_status)}
                                    </div>
                                ) : (
                                    <p className="text-slate-500 italic">Not specified yet</p>
                                )}
                            </div>
                        )}

                        {/* Skills Section - show after skills_verification step */}
                        {shouldShowSection('skills_verification') && onboardingData.userSkills.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {onboardingData.userSkills.map(skill => (
                                        <div key={skill.skill_name}
                                            className={`px-3 py-1.5 rounded-full border text-sm
                                                ${skill.is_highlighted
                                                    ? 'bg-green-50 border-green-200 text-green-700'
                                                    : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                            {skill.is_highlighted && <FaStar className="inline-block mr-1 h-3 w-3 text-yellow-500" />}
                                            {skill.skill_name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Location Preferences Section - show after location_preferences step */}
                        {shouldShowSection('location_preferences') && onboardingData.jobPreference.preferred_locations.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Preferred Locations</h3>
                                <div className="flex flex-wrap gap-2">
                                    {onboardingData.jobPreference.preferred_locations.map(location => (
                                        <div key={location} className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                                            {location}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Remote Preference Section - show after remote_preferences step */}
                        {shouldShowSection('remote_preferences') && (
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Remote Work</h3>
                                <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm inline-block">
                                    {onboardingData.jobPreference.remote_preference ? 'Open to remote work' : 'Not interested in remote work'}
                                </div>
                            </div>
                        )}

                        {/* Industry Preferences Section - show after industry_preferences step */}
                        {shouldShowSection('industry_preferences') && onboardingData.jobPreference.preferred_industries.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Preferred Industries</h3>
                                <div className="flex flex-wrap gap-2">
                                    {onboardingData.jobPreference.preferred_industries.map(industry => (
                                        <div key={industry} className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                                            {industry}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Progress indicator at bottom */}
            <div className="p-4 border-t">
                <div className="flex items-center justify-between text-sm text-slate-600">
                    <motion.div
                        className="flex items-center gap-2"
                        animate={{ opacity: 1 }}
                        initial={{ opacity: 0 }}
                    >
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                        </span>
                        {progressPercentage < 100 ? `Collecting info (${progressPercentage}%)` : "Collection Completed (100%)"}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}