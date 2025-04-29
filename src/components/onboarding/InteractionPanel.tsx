import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from './OnboardingContext';
import { Progress } from '@/components/ui/progress';
import { FaStar, FaNotesMedical } from 'react-icons/fa';

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
                <div className="space-y-8">
                    {/* Job Titles Section */}
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

                    {/* Experience Level Section */}
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

                    {/* Salary Expectations Section */}
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

                    {/* Job Search Status Section */}
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

                    {/* Skills Section */}
                    {onboardingData.userSkills.length > 0 && (
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

                    {/* Location Preferences Section */}
                    {onboardingData.jobPreference.preferred_locations.length > 0 && (
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

                    {/* Remote Preference Section */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Remote Work</h3>
                        <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm inline-block">
                            {onboardingData.jobPreference.remote_preference ? 'Open to remote work' : 'Not interested in remote work'}
                        </div>
                    </div>

                    {/* Industry Preferences Section */}
                    {onboardingData.jobPreference.preferred_industries.length > 0 && (
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

                    {/* Resume Section */}
                    {onboardingData.resume.fileName && (
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold">Resume</h3>
                            <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm inline-flex items-center">
                                <span>📄</span>
                                <span className="ml-2">{onboardingData.resume.fileName}</span>
                            </div>
                        </div>
                    )}
                </div>
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