/*
  # MEP Quotation Dashboard Schema

  1. New Tables
    - `emails` - Store RFQ emails from Gmail with processing status
    - `quotations` - Store generated quotations linked to emails
    - `equipment` - Equipment database with pricing
    - `companies` - Company information for quotations
    - `quotation_items` - Individual equipment items in quotations

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure access to company data

  3. Features
    - Real-time email processing status
    - Equipment pricing and inventory
    - Quotation generation and tracking
    - Company branding and contact info
*/

-- Create emails table for RFQ processing
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_id text UNIQUE NOT NULL,
  subject text NOT NULL,
  from_email text NOT NULL,
  from_name text,
  body text,
  attachments jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'new' CHECK (status IN ('new', 'processing', 'completed', 'failed')),
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create equipment database
CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  category text NOT NULL CHECK (category IN ('air_conditioning', 'heating', 'plumbing', 'electrical')),
  power_kw decimal(10,2),
  price_eur decimal(10,2) NOT NULL,
  description text,
  specifications jsonb DEFAULT '{}'::jsonb,
  in_stock boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create companies table for branding
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  logo_url text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid REFERENCES emails(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id),
  quotation_number text UNIQUE NOT NULL,
  analysis jsonb DEFAULT '{}'::jsonb,
  total_amount decimal(10,2) DEFAULT 0,
  margin_percentage decimal(5,2) DEFAULT 20,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until date,
  pdf_url text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quotation items (equipment in each quotation)
CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  equipment_id uuid REFERENCES equipment(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can read all emails"
  ON emails FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert emails"
  ON emails FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update emails"
  ON emails FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can read equipment"
  ON equipment FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage equipment"
  ON equipment FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can read companies"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage companies"
  ON companies FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage quotations"
  ON quotations FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage quotation items"
  ON quotation_items FOR ALL
  TO authenticated
  USING (true);

-- Insert default company data
INSERT INTO companies (name, email, phone, address, is_default) VALUES 
('Aristides S. Air Control Services Ltd', 'info@aristidesaircontrol.com', '00357-22444660', 'Cyprus', true)
ON CONFLICT DO NOTHING;

-- Insert equipment data
INSERT INTO equipment (brand, model, category, power_kw, price_eur, description) VALUES 
('LENNOX', 'ARMONIA2 LX EC 644', 'air_conditioning', 3.4, 1250.00, 'High-efficiency air conditioning unit'),
('LENNOX', 'ARMONIA2 LX EC 646', 'air_conditioning', 4.5, 1450.00, 'Premium air conditioning unit'),
('EURAPO', 'CH-524 3R+1R', 'heating', 4.0, 1100.00, 'Compact heating system'),
('EURAPO', 'EBH-020 4R+2R', 'heating', 7.5, 1850.00, 'Industrial heating unit'),
('GRUNDFOS', 'TP 65-250/2', 'plumbing', 4.0, 3200.00, 'High-performance water pump')
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);

-- Create function to generate quotation numbers
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  counter INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO counter
  FROM quotations
  WHERE quotation_number LIKE 'QUO-' || current_year || '-%';
  
  RETURN 'QUO-' || current_year || '-' || LPAD(counter::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate quotation numbers
CREATE OR REPLACE FUNCTION set_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quotation_number IS NULL THEN
    NEW.quotation_number := generate_quotation_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_quotation_number
  BEFORE INSERT ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION set_quotation_number();