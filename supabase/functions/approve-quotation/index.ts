import { createClient } from 'npm:@supabase/supabase-js@2';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Configuration constants
const CONFIG = {
  WEBHOOK_TIMEOUT: 180000, // 3 minutes for document generation and email sending
  N8N_WEBHOOK_URL: 'https://n8n-cy.redloopai.com/webhook/approve-quotation-rlcymep',
  MAX_RETRY_ATTEMPTS: 3
};

// Enhanced logging function
const log = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data, null, 2)}` : '';
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${logData}`);
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate HTTP method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed. Use POST.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  let requestBody: any;
  let supabase: any;

  try {
    // Parse and validate request body
    try {
      requestBody = await req.json();
    } catch (error) {
      log('error', 'Invalid JSON in request body', { error: error.message });
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Extract and validate required fields
    const { quotation_id, user_id, updated_analysis_data } = requestBody;

    // Input validation
    if (!quotation_id || typeof quotation_id !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Quotation ID is required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (!user_id || typeof user_id !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'User ID is required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    log('info', 'Starting quotation approval process', {
      quotation_id,
      user_id,
      hasUpdatedData: !!updated_analysis_data
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);

    // Verify quotation exists and get basic info
    log('info', 'Verifying quotation exists');
    const { data: quotation, error: fetchError } = await supabase
      .from('quotations')
      .select('id, quotation_number, status')
      .eq('id', quotation_id)
      .single();

    if (fetchError || !quotation) {
      throw new Error(`Quotation not found: ${quotation_id}`);
    }

    if (quotation.status !== 'draft') {
      throw new Error(`Quotation status is '${quotation.status}'. Only draft quotations can be approved.`);
    }

    log('info', 'Found quotation record', {
      quotation_number: quotation.quotation_number,
      current_status: quotation.status
    });

    // Update analysis data if provided (user made edits)
    if (updated_analysis_data) {
      log('info', 'Updating quotation with user edits');
      const { error: updateError } = await supabase
        .from('quotations')
        .update({
          analysis: updated_analysis_data,
          total_amount: updated_analysis_data.pricing?.grand_total || 0,
          last_modified_at: new Date().toISOString(),
          last_modified_by: user_id
        })
        .eq('id', quotation_id);

      if (updateError) {
        log('error', 'Failed to update quotation with user edits', { error: updateError });
        throw new Error('Failed to save quotation changes');
      }
    }

    // Prepare payload for n8n workflow (MEP 2.0 B)
    const workflowPayload = {
      quotation_id,
      user_id,
      action: 'approve_and_send'
    };

    log('info', 'Prepared workflow payload for MEP 2.0 (B)', {
      quotation_id,
      user_id
    });

    // Call n8n approval workflow with retry logic
    log('info', 'Calling MEP 2.0 (B) approval workflow', {
      webhookUrl: CONFIG.N8N_WEBHOOK_URL
    });

    let workflowResponse: Response;
    let retryCount = 0;

    while (retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.WEBHOOK_TIMEOUT);

        workflowResponse = await fetch(CONFIG.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MEP-Quotation-Approval/2.0'
          },
          body: JSON.stringify(workflowPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        break;
      } catch (error) {
        retryCount++;
        log('warn', `Workflow call attempt ${retryCount} failed`, {
          error: error.message,
          remaining: CONFIG.MAX_RETRY_ATTEMPTS - retryCount
        });
        
        if (retryCount >= CONFIG.MAX_RETRY_ATTEMPTS) {
          throw new Error(`n8n workflow failed after ${CONFIG.MAX_RETRY_ATTEMPTS} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    log('info', 'n8n workflow responded', {
      status: workflowResponse.status
    });

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      log('error', 'n8n workflow error', {
        status: workflowResponse.status,
        error: errorText
      });
      throw new Error(`n8n workflow failed with status ${workflowResponse.status}: ${errorText}`);
    }

    // Parse workflow response
    const responseText = await workflowResponse.text();
    if (!responseText || responseText.trim() === '') {
      throw new Error('n8n workflow returned empty response');
    }

    let workflowResult: any;
    try {
      workflowResult = JSON.parse(responseText);
    } catch (parseError) {
      log('error', 'Failed to parse workflow response', {
        error: parseError.message,
        responsePreview: responseText.substring(0, 200)
      });
      throw new Error(`Invalid JSON response from n8n workflow: ${responseText.substring(0, 200)}`);
    }

    if (!workflowResult || !workflowResult.success) {
      throw new Error(`n8n workflow processing failed: ${workflowResult?.message || 'Unknown error'}`);
    }

    log('info', 'Successfully processed approval workflow', {
      status: workflowResult.workflow,
      emailSent: workflowResult.email_details?.word_file_sent,
      htmlStored: workflowResult.document_storage?.html_stored
    });

    // Prepare success response
    const successResponse = {
      success: true,
      status: 'sent',
      message: workflowResult.message || 'Quotation sent successfully to client',
      
      // Quotation details
      quotation_details: {
        quotation_id,
        quotation_number: workflowResult.quotation_details?.quotation_number || quotation.quotation_number,
        status: workflowResult.quotation_details?.status || 'sent',
        sent_at: workflowResult.quotation_details?.sent_at
      },
      
      // Client information
      client_information: {
        client_name: workflowResult.client_information?.client_name,
        project_name: workflowResult.client_information?.project_name,
        total_amount: workflowResult.client_information?.total_amount,
        currency: workflowResult.client_information?.currency || 'EUR'
      },
      
      // Email details
      email_details: {
        word_file_sent: workflowResult.email_details?.word_file_sent || false,
        word_filename: workflowResult.email_details?.word_filename,
        email_thread_maintained: workflowResult.email_details?.email_thread_maintained || false
      },
      
      // Document storage
      document_storage: {
        html_stored: workflowResult.document_storage?.html_stored || false,
        html_available_for_pdf: workflowResult.document_storage?.html_available_for_pdf || false,
        pdf_generation: workflowResult.document_storage?.pdf_generation || 'frontend_handled'
      },
      
      // Processing metadata
      workflow_metadata: workflowResult.workflow_metadata,
      processing_time: workflowResult.timestamp
    };

    log('info', 'Quotation approval completed successfully', {
      quotation_id,
      quotation_number: quotation.quotation_number,
      email_sent: workflowResult.email_details?.word_file_sent,
      html_stored: workflowResult.document_storage?.html_stored
    });

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    log('error', 'Quotation approval failed', {
      error: error.message,
      stack: error.stack,
      quotation_id: requestBody?.quotation_id
    });

    // Revert quotation status back to draft on failure
    try {
      if (supabase && requestBody?.quotation_id) {
        await supabase
          .from('quotations')
          .update({
            status: 'draft',
            approved_by: null,
            approved_at: null,
            error_message: error.message,
            last_error_at: new Date().toISOString()
          })
          .eq('id', requestBody.quotation_id);
        log('info', 'Reverted quotation status to draft due to failure');
      }
    } catch (revertError) {
      log('error', 'Failed to revert quotation status', {
        error: revertError.message
      });
    }

    // Return appropriate error response
    const statusCode = error.message.includes('not found') ? 404 : 
                      error.message.includes('Invalid') || error.message.includes('Only draft') ? 400 : 500;
                      
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode
    });
  }
});