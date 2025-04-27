import { supabase } from './supabase';

/**
 * Verifies that the resume storage bucket exists and is accessible
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const verifyStorageBucket = async (): Promise<{ success: boolean, message: string }> => {
    try {
        // Check if we can list buckets
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

        if (bucketsError) {
            return {
                success: false,
                message: `Failed to list storage buckets: ${bucketsError.message}`
            };
        }

        // Check if user-uploads bucket exists
        const uploadsBucket = buckets.find(bucket => bucket.name === 'user-uploads');
        if (!uploadsBucket) {
            return {
                success: false,
                message: 'User uploads storage bucket not found'
            };
        }

        // Try to list files in bucket to verify permissions
        const { error: listError } = await supabase.storage
            .from('user-uploads')
            .list('resumes');

        if (listError) {
            return {
                success: false,
                message: `Cannot access user-uploads bucket: ${listError.message}`
            };
        }

        return {
            success: true,
            message: 'Storage bucket verification successful'
        };
    } catch (error) {
        return {
            success: false,
            message: `Unexpected error during storage verification: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}

/**
 * Generates a storage path for a resume file
 * @param userId - The user ID
 * @param fileName - The original file name
 * @returns The storage path in the format 'userId/timestamp_filename.ext'
 */
export const getResumeStoragePath = (userId: string, fileName: string): string => {
    const timestamp = new Date().getTime();
    const fileExtension = fileName.split('.').pop();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();

    return `${userId}/${timestamp}_${safeFileName}`;
} 