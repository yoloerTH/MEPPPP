// Supabase Edge Function: /functions/equipment-ai-import/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Initialize Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Get user from JWT token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }
    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) {
      throw new Error('No file provided');
    }
    console.log(`Processing file: ${file.name} (${file.size} bytes) for user: ${user.id}`);
    // Parse file content
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    let rawData = [];
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      // Parse CSV using simple text parsing (since Papa Parse isn't available in Deno)
      const text = new TextDecoder().decode(uint8Array);
      rawData = parseCSV(text);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Parse Excel
      const workbook = XLSX.read(uint8Array);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rawData = XLSX.utils.sheet_to_json(worksheet);
    } else {
      throw new Error('Unsupported file format. Please use CSV or Excel files.');
    }
    if (rawData.length === 0) {
      throw new Error('No data found in file');
    }
    console.log(`Parsed ${rawData.length} rows from file`);
    // Process data with AI
    const processedEquipment = await processWithAI(rawData, user.id);
    if (processedEquipment.length === 0) {
      throw new Error('No valid equipment data could be processed');
    }
    // Bulk insert to database
    console.log(`Inserting ${processedEquipment.length} equipment items`);
    const { data: insertedData, error: insertError } = await supabaseClient.from('equipment').insert(processedEquipment).select('id, brand, model, category');
    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error(`Database error: ${insertError.message}`);
    }
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: `Successfully imported ${processedEquipment.length} equipment items`,
      imported_count: processedEquipment.length,
      categories: getCategorySummary(processedEquipment),
      sample_items: insertedData?.slice(0, 5) || []
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Import failed',
      details: error.stack || 'No additional details'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
// Simple CSV parser for Deno environment
function parseCSV(text) {
  const lines = text.split('\n').filter((line)=>line.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h)=>h.trim().replace(/"/g, ''));
  const data = [];
  for(let i = 1; i < lines.length; i++){
    const values = lines[i].split(',').map((v)=>v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((header, index)=>{
      row[header] = values[index] || '';
    });
    data.push(row);
  }
  return data;
}
// AI Processing Function
async function processWithAI(rawData, userId) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  console.log('Processing equipment data with AI...');
  // Create AI prompt with sample data
  const sampleRows = rawData.slice(0, 10);
  const allColumns = [
    ...new Set(rawData.flatMap((row)=>Object.keys(row)))
  ];
  const prompt = createAIPrompt(sampleRows, allColumns, rawData.length);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: 'You are a professional MEP (Mechanical, Electrical, Plumbing) engineer and data processing expert. Your task is to analyze equipment data and structure it correctly for a professional HVAC/MEP equipment database.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      })
    });
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }
    const aiResponse = await response.json();
    const aiContent = aiResponse.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No response from AI');
    }
    console.log('AI processing complete, parsing results...');
    // Parse AI response
    const processedData = parseAIResponse(aiContent, rawData, userId);
    console.log(`AI processed ${processedData.length} valid equipment items`);
    return processedData;
  } catch (error) {
    console.error('AI processing error:', error);
    throw new Error(`AI processing failed: ${error.message}`);
  }
}
// Create comprehensive AI prompt
function createAIPrompt(sampleRows, columns, totalRows) {
  return `
TASK: Process MEP equipment data for professional HVAC database import.

INPUT DATA ANALYSIS:
- Total rows to process: ${totalRows}
- Available columns: ${columns.join(', ')}
- Sample data (first 10 rows):
${JSON.stringify(sampleRows, null, 2)}

PROCESSING REQUIREMENTS:

1. EQUIPMENT CATEGORIZATION:
   Map all equipment to these exact categories:
   - "air_conditioning": VRF, split systems, cassettes, wall units, ducted units, chillers, fan coils, AHUs
   - "heating": Heat pumps, boilers, radiators, underfloor heating, steam generators, sauna heaters  
   - "plumbing": Pumps, valves, expansion tanks, pressure vessels, water treatment
   - "materials": Pipes, cables, insulation, fittings, consumables
   - "services": Installation, commissioning, maintenance, design services
   - "hot_water": Water heaters, cylinders, calorifiers, solar thermal

2. TECHNICAL DATA EXTRACTION:
   Extract and structure technical specifications into JSON format:
   - Cooling/heating capacities (convert to kW if needed)
   - Airflow rates (CFM to m³/h conversion: CFM × 1.699)
   - Electrical specifications (voltage, phase, frequency)
   - Physical dimensions and weights
   - Efficiency ratings (SEER, COP, EER)
   - Refrigerant types (R32, R410A, etc.)
   - Operating conditions and ranges

3. DATA CLEANING RULES:
   - Extract numeric power ratings to power_kw field (convert if needed)
   - Clean price data (remove currency symbols, convert to EUR if needed)
   - Standardize brand names (proper capitalization)
   - Create descriptive model names
   - Set realistic in_stock status (default: true)

4. EQUIPMENT TYPE DETECTION:
   For air_conditioning equipment, detect and include in specifications:
   - "type": "outdoor" | "indoor" | "cassette" | "wall" | "ducted" | "split" | "vrf_outdoor" | "vrf_indoor"
   - "mount_type": "ceiling" | "wall" | "floor" | "ducted" (for indoor units)
   - "application": "residential" | "commercial" | "industrial"

5. CAPACITY MATCHING:
   - Convert BTU to kW: BTU/hr ÷ 3412
   - Convert tons to kW: tons × 3.517
   - Parse capacity ranges (e.g., "12-18kW" → use middle value 15kW)

RESPONSE FORMAT:
Return a JSON array of equipment objects. Each object must have:

{
  "brand": "string (required)",
  "model": "string (required)", 
  "category": "air_conditioning|heating|plumbing|materials|services|hot_water (required)",
  "power_kw": number | null,
  "price_eur": number (required, must be > 0),
  "description": "string (required)",
  "specifications": {
    "type": "string (for HVAC equipment)",
    "cooling_capacity_kw": number,
    "heating_capacity_kw": number,
    "airflow_m3h": number,
    "voltage_ph_hz": "string",
    "refrigerant": "string",
    "SEER_COP": number,
    "dimensions_mm": "string",
    "weight_kg": number,
    "efficiency": "string",
    "application": "string",
    // ... other technical specifications
  },
  "in_stock": boolean (default: true)
}

CRITICAL INSTRUCTIONS:
- Process ALL ${totalRows} rows from the input data, not just the sample
- Return ONLY valid JSON array, no explanations
- Skip invalid/incomplete rows but process everything else  
- Ensure all required fields are present
- Use realistic pricing (no zeros or extreme values)
- Apply MEP engineering knowledge for proper categorization
- Convert units to metric system (kW, m³/h, °C)

Process the complete dataset and return the structured equipment array:
`;
}
// Parse AI response and validate data
function parseAIResponse(aiContent, rawData, userId) {
  try {
    // Clean AI response (remove potential markdown or extra text)
    let jsonContent = aiContent.trim();
    // Extract JSON if wrapped in markdown
    const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }
    // Parse JSON
    const parsedData = JSON.parse(jsonContent);
    if (!Array.isArray(parsedData)) {
      throw new Error('AI response is not an array');
    }
    // Validate and clean each equipment item
    const validEquipment = [];
    const now = new Date().toISOString();
    for (const item of parsedData){
      // Validate required fields
      if (!item.brand || !item.model || !item.category || !item.price_eur) {
        console.warn('Skipping invalid item:', item);
        continue;
      }
      // Validate category
      const validCategories = [
        'air_conditioning',
        'heating',
        'plumbing',
        'materials',
        'services',
        'hot_water'
      ];
      if (!validCategories.includes(item.category)) {
        console.warn('Invalid category, skipping:', item.category);
        continue;
      }
      // Validate price
      const price = parseFloat(item.price_eur);
      if (isNaN(price) || price <= 0) {
        console.warn('Invalid price, skipping:', item.price_eur);
        continue;
      }
      // Create valid equipment object with correct data types for Supabase
      const equipment = {
        brand: item.brand.toString().trim(),
        model: item.model.toString().trim(),
        category: item.category,
        power_kw: item.power_kw ? parseFloat(item.power_kw).toFixed(2) : "0.00",
        price_eur: price.toFixed(2),
        description: item.description || `${item.brand} ${item.model}`,
        specifications: JSON.stringify(item.specifications || {}),
        in_stock: item.in_stock !== false,
        user_id: userId,
        created_at: now
      };
      validEquipment.push(equipment);
    }
    console.log(`Validated ${validEquipment.length} equipment items out of ${parsedData.length} AI processed items`);
    return validEquipment;
  } catch (error) {
    console.error('AI response parsing error:', error);
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}
// Generate category summary for response
function getCategorySummary(equipment) {
  const summary = {};
  equipment.forEach((item)=>{
    summary[item.category] = (summary[item.category] || 0) + 1;
  });
  return summary;
}
