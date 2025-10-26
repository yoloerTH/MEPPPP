import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      emails: {
        Row: {
          id: string;
          gmail_id: string;
          subject: string;
          from_email: string;
          from_name?: string;
          body?: string;
          attachments: any[];
          status: 'new' | 'processing' | 'completed' | 'failed' | 'clarification_sent';
          processing_started_at?: string;
          processing_completed_at?: string;
          ai_analysis?: any;
          equipment_selection?: any[];
          pricing_breakdown?: any;
          client_info?: any;
          workflow_metadata?: any;
          html_quotation?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gmail_id: string;
          subject: string;
          from_email: string;
          from_name?: string;
          body?: string;
          attachments?: any[];
          status?: 'new' | 'processing' | 'completed' | 'failed' | 'clarification_sent';
          processing_started_at?: string;
          processing_completed_at?: string;
          ai_analysis?: any;
          equipment_selection?: any[];
          pricing_breakdown?: any;
          client_info?: any;
          workflow_metadata?: any;
          html_quotation?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gmail_id?: string;
          subject?: string;
          from_email?: string;
          from_name?: string;
          body?: string;
          attachments?: any[];
          status?: 'new' | 'processing' | 'completed' | 'failed' | 'clarification_sent';
          processing_started_at?: string;
          processing_completed_at?: string;
          ai_analysis?: any;
          equipment_selection?: any[];
          pricing_breakdown?: any;
          client_info?: any;
          workflow_metadata?: any;
          html_quotation?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      quotations: {
        Row: {
          id: string;
          email_id?: string;
          company_id?: string;
          quotation_number: string;
          analysis: any;
          total_amount: number;
          margin_percentage: number;
          status: 'draft' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired';
          valid_until?: string;
          sent_at?: string;
          html_quotation?: string;
          approved_by?: string;
          approved_at?: string;
          project_summary?: any;
          client_details?: any;
          processing_metadata?: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email_id?: string;
          company_id?: string;
          quotation_number?: string;
          analysis?: any;
          total_amount?: number;
          margin_percentage?: number;
          status?: 'draft' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired';
          valid_until?: string;
          sent_at?: string;
          html_quotation?: string;
          approved_by?: string;
          approved_at?: string;
          project_summary?: any;
          client_details?: any;
          processing_metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email_id?: string;
          company_id?: string;
          quotation_number?: string;
          analysis?: any;
          total_amount?: number;
          margin_percentage?: number;
          status?: 'draft' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired';
          valid_until?: string;
          sent_at?: string;
          html_quotation?: string;
          approved_by?: string;
          approved_at?: string;
          project_summary?: any;
          client_details?: any;
          processing_metadata?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      equipment: {
        Row: {
          id: string;
          brand: string;
          model: string;
          category: 'air_conditioning' | 'heating' | 'plumbing' | 'electrical';
          power_kw?: number;
          price_eur: number;
          description?: string;
          specifications: any;
          in_stock: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand: string;
          model: string;
          category: 'air_conditioning' | 'heating' | 'plumbing' | 'electrical';
          power_kw?: number;
          price_eur: number;
          description?: string;
          specifications?: any;
          in_stock?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          brand?: string;
          model?: string;
          category?: 'air_conditioning' | 'heating' | 'plumbing' | 'electrical';
          power_kw?: number;
          price_eur?: number;
          description?: string;
          specifications?: any;
          in_stock?: boolean;
          created_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone?: string;
          address?: string;
          logo_url?: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string;
          address?: string;
          logo_url?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          address?: string;
          logo_url?: string;
          is_default?: boolean;
          created_at?: string;
        };
      };
    };
  };
};