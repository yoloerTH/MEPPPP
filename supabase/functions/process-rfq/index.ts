import { createClient } from 'npm:@supabase/supabase-js@2';
// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
// Configuration constants
const CONFIG = {
  WEBHOOK_TIMEOUT: 180000,
  N8N_WEBHOOK_URL: 'https://n8n-cy.redloopai.com/webhook/rlcymep-rfq',
  QUOTATION_VALIDITY_DAYS: 30,
  MAX_RETRY_ATTEMPTS: 3
};
// Enhanced logging function
const log = (level, message, data)=>{
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data, null, 2)}` : '';
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${logData}`);
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  // Validate HTTP method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Method not allowed. Use POST.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 405
    });
  }
  let requestBody;
  let supabase;
  let quotation = null;
  try {
    // Parse and validate request body
    try {
      requestBody = await req.json();
    } catch (error) {
      log('error', 'Invalid JSON in request body', {
        error: error.message
      });
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Extract and validate required fields
    const { emailId, userId, accessToken } = requestBody;
    // Input validation
    if (!emailId || typeof emailId !== 'string' || emailId.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email ID is required and must be a non-empty string'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    if (!userId || typeof userId !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: 'User ID is required'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    log('info', 'Starting RFQ processing', {
      emailId: emailId.trim(),
      userId,
      hasAccessToken: Boolean(accessToken)
    });
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }
    supabase = createClient(supabaseUrl, supabaseKey);
    // Create initial quotation record for the workflow to update
    log('info', 'Creating initial quotation record');
    // Get default company
    const { data: company } = await supabase.from('companies').select('*').eq('is_default', true).single();
    // Calculate quotation expiry date
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + CONFIG.QUOTATION_VALIDITY_DAYS);
    // Create initial quotation record
    const { data: quotationData, error: quotationError } = await supabase.from('quotations').insert({
      gmail_id: emailId.trim(),
      company_id: company?.id || null,
      status: 'draft',
      analysis: {},
      total_amount: 0,
      margin_percentage: 20.00,
      project_summary: {},
      client_details: {},
      processing_metadata: {},
      valid_until: validUntil.toISOString().split('T')[0],
      user_id: userId
    }).select().single();
    if (quotationError || !quotationData) {
      throw new Error(`Failed to create quotation record: ${quotationError?.message}`);
    }
    quotation = quotationData;
    log('info', 'Created quotation record', {
      quotationId: quotation.id,
      quotationNumber: quotation.quotation_number
    });
    // Prepare payload for n8n workflow (MEP 2.0 A)
    const workflowPayload = {
      emailId: emailId.trim(),
      userId,
      quotationId: quotation.id,
      accessToken: accessToken || null
    };
    log('info', 'Prepared workflow payload', {
      emailId: workflowPayload.emailId,
      quotationId: workflowPayload.quotationId
    });
    // Call n8n workflow with timeout and retry logic
    log('info', 'Calling MEP 2.0 (A) workflow', {
      webhookUrl: CONFIG.N8N_WEBHOOK_URL
    });
    let workflowResponse;
    let retryCount = 0;
    while(retryCount < CONFIG.MAX_RETRY_ATTEMPTS){
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(()=>controller.abort(), CONFIG.WEBHOOK_TIMEOUT);
        workflowResponse = await fetch(CONFIG.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MEP-RFQ-Processor/2.0'
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
        await new Promise((resolve)=>setTimeout(resolve, Math.pow(2, retryCount) * 1000));
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
    let workflowResult;
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
    log('info', 'Successfully processed RFQ', {
      status: workflowResult.status,
      quotationId: workflowResult.quotation_details?.quotation_id
    });
    // Return success response with quotation data for frontend
    const successResponse = {
      success: true,
      status: workflowResult.status || 'draft',
      quotation_id: workflowResult.quotation_details?.quotation_id || quotation.id,
      quotation_number: workflowResult.quotation_details?.quotation_number || quotation.quotation_number,
      message: workflowResult.message || 'Draft quotation created successfully',
      // Rich data for frontend quotation editor
      quotation_data: {
        total_amount: workflowResult.client_information?.total_amount,
        equipment_count: workflowResult.pricing_summary?.equipment_count,
        client_name: workflowResult.client_information?.client_name,
        project_name: workflowResult.client_information?.project_name,
        building_type: workflowResult.project_details?.building_type,
        location: workflowResult.project_details?.location
      },
      // Processing metadata
      processing_time: workflowResult.timestamp,
      workflow_version: '2.0'
    };
    log('info', 'RFQ processing completed successfully', {
      quotationId: successResponse.quotation_id,
      status: successResponse.status
    });
    return new Response(JSON.stringify(successResponse), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    log('error', 'RFQ processing failed', {
      error: error.message,
      stack: error.stack
    });
    // Update quotation with error details if it was created
    try {
      if (supabase && quotation?.id) {
        await supabase.from('quotations').update({
          processing_metadata: {
            error: error.message,
            failed_at: new Date().toISOString(),
            processing_status: 'failed'
          }
        }).eq('id', quotation.id);
        log('info', 'Updated quotation with error details');
      }
    } catch (updateError) {
      log('error', 'Failed to update quotation status to failed', {
        error: updateError.message
      });
    }
    // Return appropriate error response
    const statusCode = error.message.includes('not found') ? 404 : error.message.includes('Invalid') ? 400 : 500;
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: statusCode
    });
  }
});
