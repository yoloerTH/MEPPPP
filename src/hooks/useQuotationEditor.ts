import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface QuotationData {
  id: string;
  analysis: any;
  total_amount: number;
  margin_percentage: number;
  client_details: any;
}

export function useQuotationEditor() {
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveDraft = useCallback(async (quotationId: string, updatedData: Partial<QuotationData>) => {
    console.log('💾 QuotationEditor: Starting saveDraft for quotation:', quotationId);
    setSaving(true);
    setError(null);
    
    try {
      console.log('💾 QuotationEditor: Updating quotation in database');
      const { error: updateError } = await supabase
        .from('quotations')
        .update({
          analysis: updatedData.analysis,
          total_amount: updatedData.total_amount,
          margin_percentage: updatedData.margin_percentage,
          client_details: updatedData.client_details,
          updated_at: new Date().toISOString()
        })
        .eq('id', quotationId);

      if (updateError) throw updateError;
      
      console.log('💾 QuotationEditor: Draft saved successfully');
      return { success: true };
    } catch (err: any) {
      console.error('💾 QuotationEditor: Error saving draft:', err);
      setError(err.message);
      throw err;
    } finally {
      console.log('💾 QuotationEditor: Setting saving to false');
      setSaving(false);
    }
  }, []);

  const approveQuotation = useCallback(async (quotationId: string, updatedAnalysisData: any) => {
    console.log('✅ QuotationEditor: Starting approveQuotation for:', quotationId);
    setApproving(true);
    setError(null);
    
    try {
      console.log('✅ QuotationEditor: Getting current user for approval');
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('✅ QuotationEditor: User authentication failed');
        throw new Error('User authentication required');
      }

      console.log('✅ QuotationEditor: Calling approve-quotation edge function');
      // Call the approve-quotation edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-quotation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotation_id: quotationId,
          user_id: user.id,
          updated_analysis_data: updatedAnalysisData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('✅ QuotationEditor: Edge function response not ok:', errorData);
        throw new Error(errorData.error || 'Failed to approve quotation');
      }

      const result = await response.json();
      
      if (!result.success) {
        console.error('✅ QuotationEditor: Edge function returned failure:', result);
        throw new Error(result.error || 'Approval process failed');
      }

      console.log('✅ QuotationEditor: Quotation approved successfully');
      return result;
    } catch (err: any) {
      console.error('✅ QuotationEditor: Error approving quotation:', err);
      setError(err.message);
      throw err;
    } finally {
      console.log('✅ QuotationEditor: Setting approving to false');
      setApproving(false);
    }
  }, []);

  return {
    saveDraft,
    approveQuotation,
    saving,
    approving,
    error,
    clearError: () => setError(null)
  };
}