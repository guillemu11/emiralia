-- Migration: Add generated_images table for AI content tracking
-- Created: 2026-03-20
-- Purpose: Track AI-generated images (social media, banners, editorial content)

-- Create generated_images table
CREATE TABLE IF NOT EXISTS generated_images (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT DEFAULT 'gemini-flash-image',
  size TEXT,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  generated_by TEXT, -- Source: telegram:{user_id}, api, cli, etc.
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  cost_usd NUMERIC(10,4) DEFAULT 0.001
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_generated_images_date
  ON generated_images(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_generated_images_user
  ON generated_images(generated_by);

-- Add comment for documentation
COMMENT ON TABLE generated_images IS
  'Tracks AI-generated marketing and editorial images via Nano Banana Pro (OpenRouter Gemini)';

COMMENT ON COLUMN generated_images.generated_by IS
  'Source of generation: telegram:{telegram_user_id}, api, cli, or agent name';

-- Display confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: generated_images table created';
  RAISE NOTICE 'Run this to verify: SELECT COUNT(*) FROM generated_images;';
END $$;
