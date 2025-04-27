-- SQL function to match user answers based on pre-computed embedding
-- Takes user ID, query embedding, threshold, and count

CREATE OR REPLACE FUNCTION match_user_answers_384 (
  p_user_id UUID,
  query_embedding VECTOR(384), -- Expect 384d embedding
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (id UUID, question_id UUID, answer_text TEXT, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ua.id,
    ua.question_id,
    ua.answer_text,
    1 - (ua.embedding <=> query_embedding) AS similarity -- Calculate cosine similarity
  FROM public.user_answers AS ua
  WHERE ua.user_id = p_user_id
    AND ua.answer_text IS NOT NULL
    AND ua.embedding IS NOT NULL -- Ensure embedding exists for comparison
    AND 1 - (ua.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_user_answers_384(UUID, VECTOR(384), FLOAT, INT) 
IS 'Performs cosine similarity search on user_answers table using a pre-computed 384-dimension embedding.'; 