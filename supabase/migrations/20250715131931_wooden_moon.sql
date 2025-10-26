/*
  # Enhance database schema for rich n8n response data

  1. Database Changes
    - Add new columns to emails table for rich processing data
    - Add new columns to quotations table for enhanced analysis
    - Add new status types for clarification requests
    - Add indexes for better performance

  2. New Fields
    - AI analysis results
    - Equipment selection details
    - Pricing breakdown
    - Client information
    - Processing metadata
*/

-- Add new status for clarification requests
ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_status_check;
ALTER TABLE emails ADD CONSTRAINT emails_status_check 
CHECK (status = ANY (ARRAY['new'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'clarification_sent'::text]));

-- Add rich processing data fields to emails table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'ai_analysis') THEN
    ALTER TABLE emails ADD COLUMN ai_analysis jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'equipment_selection') THEN
    ALTER TABLE emails ADD COLUMN equipment_selection jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'pricing_breakdown') THEN
    ALTER TABLE emails ADD COLUMN pricing_breakdown jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'client_info') THEN
    ALTER TABLE emails ADD COLUMN client_info jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'workflow_metadata') THEN
    ALTER TABLE emails ADD COLUMN workflow_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'html_quotation') THEN
    ALTER TABLE emails ADD COLUMN html_quotation text;
  END IF;
END $$;

-- Add rich data fields to quotations table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'project_summary') THEN
    ALTER TABLE quotations ADD COLUMN project_summary jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'client_details') THEN
    ALTER TABLE quotations ADD COLUMN client_details jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'processing_metadata') THEN
    ALTER TABLE quotations ADD COLUMN processing_metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emails_ai_analysis ON emails USING gin (ai_analysis);
CREATE INDEX IF NOT EXISTS idx_emails_client_info ON emails USING gin (client_info);
CREATE INDEX IF NOT EXISTS idx_quotations_project_summary ON quotations USING gin (project_summary);