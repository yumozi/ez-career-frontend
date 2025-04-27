import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dirname } from 'path';

// Initialize environment variables
dotenv.config();

// Get directory name equivalent to __dirname in CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) must be set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// List of migration files to execute in order
const migrationFiles = [
    'create_storage_buckets.sql',
    'create_user_skills_table.sql',
    'create_job_preferences_table.sql'
];

// Manual SQL execution using REST API instead of RPC
async function executeSQL(sql) {
    try {
        // Using raw SQL query through the REST API
        const { data, error } = await supabase.from('_sqlexec').select('*').limit(1).csv();

        if (error) {
            console.warn('SQL execution API not available. Trying alternative method...');

            // Try direct insert as a workaround
            console.log('You will need to manually run the SQL migrations on your Supabase instance.');
            console.log('Please copy the SQL from the migration files and run them in the Supabase SQL editor.');

            // Print paths to migration files for reference
            for (const file of migrationFiles) {
                const filePath = path.join(__dirname, 'supabase', 'migrations', file);
                console.log(`Migration file: ${filePath}`);
            }

            return { success: false, error };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err };
    }
}

async function runMigrations() {
    console.log('Starting database migrations for onboarding tables...');

    for (const fileName of migrationFiles) {
        try {
            const filePath = path.join(__dirname, 'supabase', 'migrations', fileName);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Migration file content (${fileName}):`);
            console.log('--------------------------------------------------');
            console.log(sql);
            console.log('--------------------------------------------------');

            console.log(`Please execute this SQL manually in your Supabase SQL editor.`);
        } catch (error) {
            console.error(`Error reading migration file ${fileName}:`, error);
        }
    }

    console.log(`\nWARNING: Automatic migration wasn't possible. Please run the SQL migrations manually.`);
    console.log(`You can find the SQL in the 'supabase/migrations/' directory.`);
}

async function main() {
    try {
        console.log('Checking Supabase connection...');
        // Simple check if we can connect to Supabase
        const { error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            // If we can't even connect to Supabase
            console.error('Error connecting to Supabase:', error.message);
            console.log('\nPlease check your Supabase credentials and network connection.');
            console.log('Showing migration files that need to be manually executed:');
            await runMigrations();
        } else {
            console.log('Connected to Supabase successfully.');
            console.log('However, automatic SQL execution is not supported in this environment.');
            console.log('Please run the migrations manually using the Supabase SQL editor.');
            await runMigrations();
        }
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
}

main(); 