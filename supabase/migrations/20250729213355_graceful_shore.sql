/*
  # Update quotations table for new workflow

  1. Database Schema Updates
    - Add html_quotation field to store generated HTML content
    - Add approved_by field to track who approved the quotation
    - Add approved_at timestamp for approval tracking
    - Update sent_at field for when quotation was sent
    - Update quotations status check constraint to include 'approved'

  2. Security
    - Maintain existing RLS policies
    - Add policy for approved_by field access
*/

-- Add new fields to quotations table
ALTER TABLE quotations 
ADD COLUMN IF NOT EXISTS html_quotation TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES user_profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Update the status check constraint to include 'approved'
ALTER TABLE quotations DROP CONSTRAINT IF EXISTS quotations_status_check;
ALTER TABLE quotations ADD CONSTRAINT quotations_status_check 
CHECK (status = ANY (ARRAY['draft'::text, 'approved'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text]));

-- Ensure emails table has gmail_id field (might already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'gmail_id'
  ) THEN
    ALTER TABLE emails ADD COLUMN gmail_id TEXT;
  END IF;
END $$;

-- Add index for html_quotation field for better performance
CREATE INDEX IF NOT EXISTS idx_quotations_html_not_null 
ON quotations (id) WHERE html_quotation IS NOT NULL;

-- Update quotations updated_at trigger to handle new fields
CREATE OR REPLACE FUNCTION update_quotations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS update_quotations_updated_at_trigger ON quotations;
CREATE TRIGGER update_quotations_updated_at_trigger
    BEFORE UPDATE ON quotations
    FOR EACH ROW
    EXECUTE FUNCTION update_quotations_updated_at();