/*
  # Add User Data Isolation and Enhanced Functionality

  1. User Data Isolation
    - Add user_id to all necessary tables
    - Update RLS policies for proper data separation
    - Ensure each user only sees their own data

  2. Enhanced Tables
    - Update companies table with user ownership
    - Update equipment table with user ownership
    - Update emails table with user ownership
    - Enhanced quotations with proper relationships

  3. Security
    - Proper RLS policies for all tables
    - User-specific data access only
*/

-- Add user_id to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to equipment table
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to emails table
ALTER TABLE emails ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);

-- Update RLS policies for companies
DROP POLICY IF EXISTS "Users can manage companies" ON companies;
DROP POLICY IF EXISTS "Users can read companies" ON companies;

CREATE POLICY "Users can manage their own companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for equipment
DROP POLICY IF EXISTS "Users can manage equipment" ON equipment;
DROP POLICY IF EXISTS "Users can read equipment" ON equipment;

CREATE POLICY "Users can manage their own equipment"
  ON equipment
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for emails
DROP POLICY IF EXISTS "Users can insert emails" ON emails;
DROP POLICY IF EXISTS "Users can read all emails" ON emails;
DROP POLICY IF EXISTS "Users can update emails" ON emails;

CREATE POLICY "Users can manage their own emails"
  ON emails
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for quotations (through email relationship)
DROP POLICY IF EXISTS "Users can manage quotations" ON quotations;

CREATE POLICY "Users can manage their own quotations"
  ON quotations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = quotations.email_id 
      AND emails.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM emails 
      WHERE emails.id = quotations.email_id 
      AND emails.user_id = auth.uid()
    )
  );

-- Update RLS policies for quotation_items
DROP POLICY IF EXISTS "Users can manage quotation items" ON quotation_items;

CREATE POLICY "Users can manage their own quotation items"
  ON quotation_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations q
      JOIN emails e ON e.id = q.email_id
      WHERE q.id = quotation_items.quotation_id 
      AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations q
      JOIN emails e ON e.id = q.email_id
      WHERE q.id = quotation_items.quotation_id 
      AND e.user_id = auth.uid()
    )
  );

-- Create default equipment for new users
INSERT INTO equipment (user_id, brand, model, category, power_kw, price_eur, description, specifications, in_stock)
SELECT 
  auth.uid(),
  'Daikin',
  'RXS25L2V1B',
  'air_conditioning',
  2.5,
  1250.00,
  'High-efficiency split system air conditioner',
  '{"cooling_capacity": "2.5kW", "heating_capacity": "3.2kW", "energy_class": "A++"}',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment WHERE user_id = auth.uid()
);

INSERT INTO equipment (user_id, brand, model, category, power_kw, price_eur, description, specifications, in_stock)
SELECT 
  auth.uid(),
  'Mitsubishi',
  'MSZ-LN25VG',
  'air_conditioning',
  2.5,
  1380.00,
  'Premium inverter split system with WiFi control',
  '{"cooling_capacity": "2.5kW", "heating_capacity": "3.2kW", "energy_class": "A+++", "wifi": true}',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM equipment WHERE user_id = auth.uid() AND model = 'MSZ-LN25VG'
);

-- Function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to automatically set user_id
CREATE TRIGGER set_companies_user_id
  BEFORE INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_on_insert();

CREATE TRIGGER set_equipment_user_id
  BEFORE INSERT ON equipment
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_on_insert();

CREATE TRIGGER set_emails_user_id
  BEFORE INSERT ON emails
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_on_insert();