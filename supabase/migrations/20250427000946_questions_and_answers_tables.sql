-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Create the questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    -- Add other columns like 'order', 'category', etc. if needed
);

-- Enable Row Level Security for questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read questions
CREATE POLICY "Allow authenticated read access" ON questions
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Create the user_answers table
CREATE TABLE user_answers (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    embedding vector(384), -- Embedding column (adjust dimension 384 if needed)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, question_id) -- Composite primary key
);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to call the function before update on user_answers
CREATE TRIGGER update_user_answers_updated_at
BEFORE UPDATE ON user_answers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for user_answers
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to manage their own answers
CREATE POLICY "Allow users to manage their own answers" ON user_answers
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Index for faster similarity search on the embedding column
-- Using ivfflat. Adjust 'lists' based on expected data size (e.g., sqrt(N) where N is num rows).
CREATE INDEX ON user_answers USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Optional: Add some sample questions for initial setup
-- INSERT INTO questions (question_text) VALUES
-- ('What are your top 3 technical skills?'),
-- ('Describe a challenging project you worked on and how you overcame obstacles.'),
-- ('What are your salary expectations (provide a range)?'),
-- ('What kind of company culture are you looking for?'); 