# Supabase Setup for EZ Frontend

This directory contains SQL migrations for setting up your Supabase database.

## Setting up the Profiles Table

The profile functionality requires a `profiles` table in your Supabase database. You can create this table in one of two ways:

### Option 1: Using Supabase Dashboard

1. Log into your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `migrations/create_profiles_table.sql`
4. Run the SQL in the editor

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed, you can run:

```bash
supabase migration up
```

This will apply all migrations in the migrations directory.

## Setting up Storage for Resume Uploads

The profile page includes a resume upload feature that allows users to upload PDF files. This requires setting up a Supabase Storage bucket:

1. Run the SQL in `migrations/create_storage_buckets.sql` to create the necessary storage bucket and policies
2. Alternatively, you can create the bucket manually in the Supabase dashboard:
   - Go to Storage > Buckets
   - Create a new bucket named `user-uploads`
   - Ensure that "Public bucket" is enabled
   - Set up access control with appropriate policies

## Fixing Duplicate Profiles Issue

If you encounter a problem where multiple profile records are being created for the same user, you can run the cleanup script:

1. Go to the SQL Editor in the Supabase dashboard
2. Copy the contents of `migrations/fix_duplicate_profiles.sql`
3. Run the SQL to clean up duplicate profiles

This script will:
- Keep only the most recently updated profile for each user
- Delete all other duplicate profiles
- Display counts of how many profiles were kept and deleted

## Table Structure

The `profiles` table has the following columns:

- `id`: UUID primary key
- `user_id`: UUID foreign key to the auth.users table
- `first_name`: Text field for the user's first name
- `last_name`: Text field for the user's last name
- `email`: Text field for the user's email
- `phone`: Text field for the user's phone number
- `resume_url`: Text field for the URL to the user's uploaded resume
- `created_at`: Timestamp for when the profile was created
- `updated_at`: Timestamp for when the profile was last updated

## Row Level Security

The table is protected by Row Level Security (RLS) policies that ensure:

1. Users can only view their own profile
2. Users can only update their own profile
3. Users can only insert their own profile

This provides proper data isolation between users. 