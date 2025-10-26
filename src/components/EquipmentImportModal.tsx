import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  ArrowRight,
  Loader2,
  Eye,
  Save,
  AlertCircle,
  FileSpreadsheet,
  Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useOutsideClick } from '../hooks/useOutsideClick';
// Simple ID generator function to replace uuid
const generateId = () => {
  return 'eq_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

interface ImportData {
  [key: string]: any;
}

interface ColumnMapping {
  fileColumn: string;
  systemField: string;
  defaultValue?: string;
  isSpecField?: boolean; // New: marks fields that should go into specifications
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface EquipmentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  onGlobalError?: (error: { title: string; message: string; type?: 'error' | 'timeout' | 'network' }) => void;
}

const systemFields = [
  { value: 'brand', label: 'Brand *', required: true },
  { value: 'model', label: 'Model *', required: true },
  { value: 'category', label: 'Category *', required: true },
  { value: 'type', label: 'Type', required: false },
  { value: 'power_kw', label: 'Power (kW)', required: false },
  { value: 'price_eur', label: 'Price (EUR) *', required: true },
  { value: 'description', label: 'Description', required: false },
  { value: 'specifications', label: 'Specifications (Auto-Combined)', required: false },
  { value: 'in_stock', label: 'In Stock', required: false }
];

const categoryOptions = [
  'air_conditioning',
  'heating', 
  'plumbing',
  'materials',
  'services',
  'hot_water'
];

// MEP-specific field patterns for smart mapping
const mepFieldPatterns = {
  // Core system fields
  brand: ['brand', 'manufacturer', 'make', 'supplier', 'vendor'],
  model: ['model', 'product', 'part', 'part_number', 'product_code', 'sku'],
  category: ['category', 'class', 'group', 'classification', 'equipment_category'],
  type: ['type', 'equipment_type', 'unit_type', 'variant', 'style', 'configuration', 'subtype'],
  power_kw: ['power', 'power_kw', 'power_consumption', 'electrical_power', 'wattage'],
  price_eur: ['price', 'cost', 'price_eur', 'price_euro', 'unit_price', 'list_price'],
  description: ['description', 'desc', 'name', 'title', 'product_name'],
  in_stock: ['in_stock', 'stock', 'available', 'inventory', 'availability'],
  
  // Technical fields that should go into specifications
  cooling_capacity: ['cooling_capacity', 'cooling_capacity_kw', 'cooling_power', 'cool_cap', 'refrigeration_capacity'],
  heating_capacity: ['heating_capacity', 'heating_capacity_kw', 'heating_power', 'heat_cap', 'heating_output'],
  airflow: ['airflow', 'airflow_m3h', 'air_flow', 'cfm', 'air_volume', 'ventilation_rate'],
  voltage: ['voltage', 'voltage_ph_hz', 'electrical', 'power_supply', 'volts', 'v'],
  refrigerant: ['refrigerant', 'refrigerant_type', 'coolant', 'gas_type'],
  efficiency: ['efficiency', 'seer', 'cop', 'seer_cop', 'energy_rating', 'performance'],
  dimensions: ['dimensions', 'size', 'measurements', 'length', 'width', 'height'],
  weight: ['weight', 'mass', 'weight_kg'],
  noise: ['noise', 'noise_level', 'sound', 'db', 'noise_db'],
  capacity: ['capacity', 'tank_capacity', 'volume', 'storage', 'capacity_l'],
  flow_rate: ['flow_rate', 'flow', 'gpm', 'lpm', 'm3h', 'flow_m3h'],
  head: ['head', 'pressure', 'head_m', 'pump_head'],
  static_pressure: ['static_pressure', 'pressure_pa', 'external_pressure'],
  application: ['application', 'use', 'purpose', 'location', 'installation'],
  material: ['material', 'construction', 'build_material'],
  insulation: ['insulation', 'insulated', 'thermal_protection'],
  warranty: ['warranty', 'guarantee', 'warranty_years']
};

// Category mapping for common variations
const categoryMapping = {
  'hvac': 'air_conditioning',
  'ac': 'air_conditioning',
  'air conditioning': 'air_conditioning',
  'vrf': 'air_conditioning',
  'split system': 'air_conditioning',
  'heat pump': 'heating',
  'boiler': 'heating',
  'heater': 'heating',
  'pump': 'plumbing',
  'pumps': 'plumbing',
  'chiller': 'plumbing',
  'piping': 'materials',
  'pipe': 'materials',
  'cable': 'materials',
  'wiring': 'materials',
  'installation': 'services',
  'service': 'services',
  'commissioning': 'services',
  'hot water': 'hot_water',
  'water heater': 'hot_water',
  'hwc': 'hot_water'
};

export default function EquipmentImportModal({ isOpen, onClose, onImportComplete, onGlobalError }: EquipmentImportModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [fileName, setFileName] = useState<string>('');
  const [rawData, setRawData] = useState<ImportData[]>([]);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, errors: 0 });
  const [importError, setImportError] = useState<string>('');
  const [specFields, setSpecFields] = useState<string[]>([]); // Track which fields will be combined into specifications

  // Close modal when clicking outside
  useOutsideClick(modalRef, onClose);

  const resetModal = () => {
    console.log('📂 EquipmentImport: Resetting modal state');
    setStep('upload');
    setFileName('');
    setRawData([]);
    setFileColumns([]);
    setColumnMappings([]);
    setProcessedData([]);
    setValidationErrors([]);
    setImporting(false);
    setImportStats({ total: 0, valid: 0, errors: 0 });
    setImportError('');
    setSpecFields([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📂 EquipmentImport: Starting file upload');
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportError('');
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    console.log('📂 EquipmentImport: Processing file', { name: file.name, extension: fileExtension, size: file.size });

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const data = results.data as ImportData[];
            console.log('📂 EquipmentImport: Parsed CSV data:', data.length, 'rows');
            setRawData(data);
            setFileColumns(Object.keys(data[0]));
            generateSmartMapping(Object.keys(data[0]), data[0]);
            setStep('mapping');
          } else {
            console.error('📂 EquipmentImport: No data found in CSV file');
            setImportError('No data found in CSV file');
          }
        },
        error: (error) => {
          console.error('📂 EquipmentImport: CSV parsing error:', error);
          setImportError(`CSV parsing error: ${error.message}`);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as ImportData[];
          
          if (jsonData.length > 0) {
            console.log('📂 EquipmentImport: Parsed Excel data:', jsonData.length, 'rows');
            setRawData(jsonData);
            setFileColumns(Object.keys(jsonData[0]));
            generateSmartMapping(Object.keys(jsonData[0]), jsonData[0]);
            setStep('mapping');
          } else {
            console.error('📂 EquipmentImport: No data found in Excel file');
            setImportError('No data found in Excel file');
          }
        } catch (error) {
          console.error('📂 EquipmentImport: Excel parsing error:', error);
          setImportError(`Excel parsing error: ${error.message}`);
        }
      };
      reader.onerror = () => {
        console.error('📂 EquipmentImport: Failed to read Excel file');
        setImportError('Failed to read Excel file');
      };
      reader.readAsArrayBuffer(file);
    } else {
      console.error('📂 EquipmentImport: Unsupported file format:', fileExtension);
      setImportError('Unsupported file format. Please use CSV, XLS, or XLSX files.');
    }
  };

  const generateSmartMapping = (columns: string[], sampleRow: ImportData) => {
    console.log('📂 EquipmentImport: Generating smart mapping for columns:', columns.length);
    const mappings: ColumnMapping[] = [];
    const detectedSpecFields: string[] = [];
    
    columns.forEach(column => {
      const lowerColumn = column.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      let suggestedField = '';
      let isSpecField = false;
      
      // First check for exact system fields
      for (const [systemField, patterns] of Object.entries(mepFieldPatterns)) {
        if (['brand', 'model', 'category', 'type', 'power_kw', 'price_eur', 'description', 'in_stock'].includes(systemField)) {
          if (patterns.some(pattern => lowerColumn.includes(pattern.replace(/[^a-z0-9]/g, '_')))) {
            suggestedField = systemField;
            break;
          }
        }
      }
      
      // If not a core field, check if it's a technical specification field
      if (!suggestedField) {
        for (const [specType, patterns] of Object.entries(mepFieldPatterns)) {
          if (!['brand', 'model', 'category', 'type', 'power_kw', 'price_eur', 'description', 'in_stock'].includes(specType)) {
            if (patterns.some(pattern => lowerColumn.includes(pattern.replace(/[^a-z0-9]/g, '_')))) {
              suggestedField = 'specifications';
              isSpecField = true;
              detectedSpecFields.push(column);
              break;
            }
          }
        }
      }
      
      mappings.push({
        fileColumn: column,
        systemField: suggestedField,
        defaultValue: '',
        isSpecField: isSpecField
      });
    });
    
    setColumnMappings(mappings);
    setSpecFields(detectedSpecFields);
    
    console.log('📂 EquipmentImport: Smart mapping generated:', mappings.length, 'mappings');
    console.log('📂 EquipmentImport: Detected specification fields:', detectedSpecFields.length);
  };

  const updateMapping = (fileColumn: string, systemField: string) => {
    setColumnMappings(prev => prev.map(mapping => 
      mapping.fileColumn === fileColumn 
        ? { 
            ...mapping, 
            systemField,
            isSpecField: systemField === 'specifications'
          }
        : mapping
    ));
  };

  const updateDefaultValue = (fileColumn: string, defaultValue: string) => {
    setColumnMappings(prev => prev.map(mapping => 
      mapping.fileColumn === fileColumn 
        ? { ...mapping, defaultValue }
        : mapping
    ));
  };

  const normalizeCategory = (category: string): string => {
    const normalized = category.toLowerCase().trim();
    return categoryMapping[normalized] || normalized;
  };

  const cleanNumericValue = (value: any, fieldType: string): number | null => {
    if (value === undefined || value === null || value === '') return null;
    
    let cleanValue = value.toString()
      .replace(/[€$,\s]/g, '') // Remove currency and spaces
      .replace(/[^\d.-]/g, ''); // Keep only numbers, dots, and minus
    
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? null : parsed;
  };

  const buildSpecifications = (row: ImportData): object => {
    const specs: any = {};
    
    columnMappings.forEach(mapping => {
      if (mapping.isSpecField && mapping.fileColumn && row[mapping.fileColumn] !== undefined) {
        let value = row[mapping.fileColumn];
        
        // Clean and process specification values
        if (value !== null && value !== '') {
          // Convert numeric fields
          const lowerColumn = mapping.fileColumn.toLowerCase();
          if (lowerColumn.includes('capacity') || lowerColumn.includes('power') || lowerColumn.includes('kw')) {
            const numValue = cleanNumericValue(value, 'numeric');
            if (numValue !== null) value = numValue;
          } else if (lowerColumn.includes('airflow') || lowerColumn.includes('m3h') || lowerColumn.includes('cfm')) {
            const numValue = cleanNumericValue(value, 'numeric');
            if (numValue !== null) value = numValue;
          } else if (lowerColumn.includes('efficiency') || lowerColumn.includes('seer') || lowerColumn.includes('cop')) {
            const numValue = cleanNumericValue(value, 'numeric');
            if (numValue !== null) value = numValue;
          }
          
          // Use a clean field name for the specification
          const specFieldName = mapping.fileColumn.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/^_+|_+$/g, '');
          
          specs[specFieldName] = value;
        }
      }
    });
    
    return specs;
  };

  const validateData = (data: any[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    data.forEach((row, index) => {
      // Required field validation
      if (!row.brand || row.brand.toString().trim() === '') {
        errors.push({ row: index + 1, field: 'brand', message: 'Brand is required' });
      }
      if (!row.model || row.model.toString().trim() === '') {
        errors.push({ row: index + 1, field: 'model', message: 'Model is required' });
      }
      if (!row.category || row.category.toString().trim() === '') {
        errors.push({ row: index + 1, field: 'category', message: 'Category is required' });
      }
      
      // Price validation
      const price = parseFloat(row.price_eur);
      if (!row.price_eur || isNaN(price) || price <= 0) {
        errors.push({ row: index + 1, field: 'price_eur', message: 'Valid price greater than 0 is required' });
      }
      
      // Category validation
      if (row.category && !categoryOptions.includes(row.category.toString().toLowerCase())) {
        errors.push({ row: index + 1, field: 'category', message: `Category must be one of: ${categoryOptions.join(', ')}` });
      }
      
      // Power validation
      if (row.power_kw && row.power_kw !== '') {
        const power = parseFloat(row.power_kw);
        if (isNaN(power) || power < 0) {
          errors.push({ row: index + 1, field: 'power_kw', message: 'Power must be a positive number' });
        }
      }
    });
    
    return errors;
  };

  const processData = () => {
    console.log('📂 EquipmentImport: Processing data with', rawData.length, 'rows');
    const processed = rawData.map(row => {
      const newRow: any = {};
      
      // Process core system fields
      columnMappings.forEach(mapping => {
        if (mapping.systemField && !mapping.isSpecField) {
          let value = row[mapping.fileColumn];
          
          // Use default value if the field is empty or undefined
          if (value === undefined || value === null || value === '') {
            value = mapping.defaultValue || '';
          }
          
          // Type conversions and cleaning
          if (mapping.systemField === 'price_eur') {
            newRow[mapping.systemField] = cleanNumericValue(value, 'price') || 0;
          } else if (mapping.systemField === 'power_kw') {
            newRow[mapping.systemField] = cleanNumericValue(value, 'power');
          } else if (mapping.systemField === 'in_stock') {
            const boolValue = value.toString().toLowerCase();
            newRow[mapping.systemField] = ['true', '1', 'yes', 'y', 'in stock', 'available'].includes(boolValue);
          } else if (mapping.systemField === 'category') {
            newRow[mapping.systemField] = normalizeCategory(value.toString());
          } else {
            newRow[mapping.systemField] = value.toString().trim();
          }
        }
      });
      
      // Build specifications object from technical fields
      const specifications = buildSpecifications(row);
      newRow.specifications = specifications;
      
      return newRow;
    });
    
    const errors = validateData(processed);
    setProcessedData(processed);
    setValidationErrors(errors);
    setImportStats({
      total: processed.length,
      valid: processed.length - new Set(errors.map(e => e.row)).size,
      errors: new Set(errors.map(e => e.row)).size
    });
    console.log('📂 EquipmentImport: Data processed', { 
      total: processed.length, 
      valid: processed.length - new Set(errors.map(e => e.row)).size,
      errors: new Set(errors.map(e => e.row)).size 
    });
    setStep('preview');
  };

  const performImport = async () => {
    console.log('📂 EquipmentImport: Starting performImport');
    if (!user) {
      console.error('📂 EquipmentImport: User not authenticated');
      setImportError('User not authenticated');
      if (onGlobalError) {
        onGlobalError({
          title: 'Authentication Error',
          message: 'User not authenticated. Please sign in again.',
          type: 'error'
        });
      }
      return;
    }
    
    setImporting(true);
    setImportError('');
    
    try {
      console.log('📂 EquipmentImport: Starting import for user:', user.id);
      
      // Get rows without errors
      const errorRows = new Set(validationErrors.map(error => error.row - 1));
      const validRows = processedData.filter((_, index) => !errorRows.has(index));
      
      console.log('📂 EquipmentImport: Valid rows to import:', validRows.length);
      
      if (validRows.length === 0) {
        console.error('📂 EquipmentImport: No valid rows to import');
        setImportError('No valid rows to import');
        if (onGlobalError) {
          onGlobalError({
            title: 'Import Validation Error',
            message: 'No valid rows found for import. Please check your data.',
            type: 'error'
          });
        }
        setImporting(false);
        return;
      }
      
      // Add user_id and created_at to each row
      const rowsWithMetadata = validRows.map(row => ({
        ...row,
        user_id: user.id,
        created_at: new Date().toISOString(),
        specifications: JSON.stringify(row.specifications || {})
      }));
      
      console.log('📂 EquipmentImport: Sample row to import:', rowsWithMetadata[0]);
      
      // Import in batches to avoid timeout
      const batchSize = 100;
      let importedCount = 0;
      
      for (let i = 0; i < rowsWithMetadata.length; i += batchSize) {
        const batch = rowsWithMetadata.slice(i, i + batchSize);
        console.log(`📂 EquipmentImport: Importing batch ${Math.floor(i / batchSize) + 1}, rows ${i + 1} to ${Math.min(i + batchSize, rowsWithMetadata.length)}`);
        
        const { error } = await supabase
          .from('equipment')
          .insert(batch);
        
        if (error) {
          console.error('📂 EquipmentImport: Batch import error:', error);
          throw new Error(`Import failed at row ${i + 1}: ${error.message}`);
        }
        
        importedCount += batch.length;
        console.log(`📂 EquipmentImport: Successfully imported ${importedCount} of ${rowsWithMetadata.length} rows`);
      }
      
      console.log('📂 EquipmentImport: Import completed successfully');
      onImportComplete();
      resetModal();
      onClose();
    } catch (error: any) {
      console.error('📂 EquipmentImport: Import error:', error);
      setImportError(error.message || 'Failed to import equipment data');
      if (onGlobalError) {
        onGlobalError({
          title: 'Import Failed',
          message: `Failed to import equipment: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      console.log('📂 EquipmentImport: Setting importing to false');
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Brand': 'Daikin',
        'Model': 'FXFQ50A',
        'Category': 'air_conditioning',
        'Type': 'cassette',
        'Power (kW)': '5.6',
        'Price (EUR)': '2450.00',
        'Description': 'VRV indoor cassette unit - 5.6kW',
        'Cooling Capacity (kW)': '5.6',
        'Heating Capacity (kW)': '6.3',
        'Voltage': '230V/1Ph/50Hz',
        'Refrigerant': 'R32',
        'Airflow (m³/h)': '840',
        'In Stock': 'true'
      },
      {
        'Brand': 'Carrier',
        'Model': '30RB300',
        'Category': 'plumbing',
        'Type': 'air_cooled',
        'Power (kW)': '300',
        'Price (EUR)': '42000.00',
        'Description': 'Air-cooled screw chiller - 300kW',
        'Cooling Capacity (kW)': '300',
        'Voltage': '400V/3Ph/50Hz',
        'Refrigerant': 'R134a',
        'Efficiency (COP)': '4.2',
        'In Stock': 'true'
      },
      {
        'Brand': 'Professional',
        'Model': 'VRF Indoor Installation',
        'Category': 'services',
        'Type': 'installation',
        'Power (kW)': '0',
        'Price (EUR)': '125.00',
        'Description': 'VRF indoor unit installation per piece',
        'In Stock': 'true'
      }
    ];
    
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mep_equipment_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Upload className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">MEP Equipment Import</h2>
                <p className="text-emerald-100 mt-1">Import professional MEP equipment data from CSV or Excel</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetModal();
                onClose();
              }}
              className="text-white/80 hover:text-white transition-colors p-3 hover:bg-white/10 rounded-2xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="mt-6 flex items-center space-x-4">
            {[
              { id: 'upload', name: 'Upload File', icon: Upload },
              { id: 'mapping', name: 'Smart Mapping', icon: Settings },
              { id: 'preview', name: 'Preview Data', icon: Eye },
              { id: 'importing', name: 'Import', icon: Save }
            ].map((stepItem, index) => {
              const isActive = step === stepItem.id;
              const isCompleted = ['upload', 'mapping', 'preview', 'importing'].indexOf(step) > index;
              return (
                <div key={stepItem.id} className="flex items-center">
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-white/30 text-white' 
                      : isCompleted 
                      ? 'bg-white/20 text-white' 
                      : 'bg-white/10 text-white/60'
                  }`}>
                    <stepItem.icon className="w-4 h-4" />
                    <span className="font-medium">{stepItem.name}</span>
                  </div>
                  {index < 3 && <ArrowRight className="w-4 h-4 text-white/60 mx-2" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-8">
          {/* Error Display */}
          {importError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <h4 className="font-bold text-red-900">Import Error</h4>
                  <p className="text-red-800">{importError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Upload MEP Equipment Data</h3>
                <p className="text-gray-600 mb-8">Upload CSV or Excel files with VRF, chillers, pumps, and other MEP equipment</p>
                
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 hover:border-emerald-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  <div className="text-center">
                    <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 flex items-center mx-auto"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Choose File
                    </button>
                  </div>
                  
                  <p className="text-gray-500 mt-4 text-sm">
                    Supported formats: CSV, Excel (.xlsx, .xls)<br/>
                    Maximum file size: 10MB
                  </p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-start space-x-4">
                  <Download className="w-6 h-6 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-blue-900 mb-2">MEP Equipment Template</h4>
                    <p className="text-blue-800 mb-4">
                      Download our professional MEP template with examples of VRF systems, chillers, and technical specifications.
                    </p>
                    <button
                      onClick={downloadTemplate}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium transition-colors flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download MEP Template
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
                <div className="flex items-start space-x-4">
                  <Settings className="w-6 h-6 text-emerald-600 mt-1" />
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-emerald-900 mb-2">Smart Processing</h4>
                    <p className="text-emerald-800 mb-3">
                      Our system automatically detects MEP equipment fields and combines technical specifications:
                    </p>
                    <div className="text-sm text-emerald-700 space-y-1">
                      <div>• <strong>Cooling/Heating Capacity:</strong> Auto-detected and combined into specifications</div>
                      <div>• <strong>Technical Details:</strong> Voltage, refrigerant, airflow automatically organized</div>
                      <div>• <strong>Equipment Types:</strong> VRF, chillers, pumps, AHUs intelligently categorized</div>
                      <div>• <strong>Categories:</strong> Auto-maps HVAC → air_conditioning, Pumps → plumbing</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Smart Mapping */}
          {step === 'mapping' && (
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Smart Column Mapping</h3>
                <p className="text-gray-600 mb-6">
                  AI-powered mapping detected your MEP equipment fields. Review and adjust as needed.
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  File: {fileName} ({rawData.length} rows)
                </div>
              </div>

              {/* Show detected technical fields that will be combined */}
              {specFields.length > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-start space-x-4">
                    <Settings className="w-6 h-6 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-blue-900 mb-2">Technical Fields Detected</h4>
                      <p className="text-blue-800 mb-3">
                        These fields will be automatically combined into the specifications JSON:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {specFields.map(field => (
                          <span key={field} className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium">
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900">Column Mapping</h4>
                  <div className="space-y-3">
                    {columnMappings.map((mapping, index) => (
                      <div key={index} className={`rounded-xl p-4 border-2 ${
                        mapping.isSpecField 
                          ? 'bg-blue-50 border-blue-200' 
                          : mapping.systemField 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{mapping.fileColumn}</span>
                            <span className="text-xs text-gray-500 max-w-32 truncate">
                              Sample: {rawData[0]?.[mapping.fileColumn]?.toString().substring(0, 20)}...
                            </span>
                          </div>
                          
                          <select
                            value={mapping.systemField}
                            onChange={(e) => updateMapping(mapping.fileColumn, e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">-- Skip this column --</option>
                            {systemFields.map(field => (
                              <option key={field.value} value={field.value}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                          
                          {mapping.isSpecField && (
                            <div className="text-xs text-blue-600 font-medium">
                              → Will be added to specifications JSON
                            </div>
                          )}
                          
                          {!mapping.systemField && (
                            <input
                              type="text"
                              placeholder="Default value (optional)"
                              value={mapping.defaultValue}
                              onChange={(e) => updateDefaultValue(mapping.fileColumn, e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-gray-900">System Fields</h4>
                  <div className="space-y-3">
                    {systemFields.map(field => {
                      const isMapped = columnMappings.some(m => m.systemField === field.value);
                      const mappedCount = columnMappings.filter(m => m.systemField === field.value).length;
                      return (
                        <div key={field.value} className={`p-4 rounded-xl border-2 ${
                          isMapped 
                            ? field.value === 'specifications' && mappedCount > 1
                              ? 'bg-blue-50 border-blue-200' 
                              : 'bg-green-50 border-green-200'
                            : field.required 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{field.label}</span>
                            <div className="flex items-center space-x-2">
                              {field.value === 'specifications' && mappedCount > 1 && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {mappedCount} fields
                                </span>
                              )}
                              {isMapped ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : field.required ? (
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                              ) : (
                                <div className="w-5 h-5" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setStep('upload')}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  onClick={processData}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-medium flex items-center"
                >
                  Process Data
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Preview Processed Data</h3>
                <p className="text-gray-600 mb-6">Review how your MEP equipment data will be imported</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <p className="text-2xl font-bold text-blue-900">{importStats.total}</p>
                    <p className="text-blue-600 font-medium">Total Rows</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                    <p className="text-2xl font-bold text-green-900">{importStats.valid}</p>
                    <p className="text-green-600 font-medium">Valid Rows</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                    <p className="text-2xl font-bold text-red-900">{importStats.errors}</p>
                    <p className="text-red-600 font-medium">Rows with Errors</p>
                  </div>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <h4 className="text-lg font-bold text-red-900 mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Validation Errors
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {validationErrors.slice(0, 20).map((error, index) => (
                      <div key={index} className="text-sm text-red-800">
                        Row {error.row}, {error.field}: {error.message}
                      </div>
                    ))}
                    {validationErrors.length > 20 && (
                      <p className="text-sm text-red-600 font-medium">
                        ... and {validationErrors.length - 20} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 p-4 border-b border-gray-200">
                  <h4 className="font-bold text-gray-900">Data Preview (First 10 rows)</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Row</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Brand</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Model</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Specifications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {processedData.slice(0, 10).map((row, index) => {
                        const hasError = validationErrors.some(error => error.row === index + 1);
                        return (
                          <tr key={index} className={hasError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {index + 1}
                              {hasError && <AlertTriangle className="w-4 h-4 text-red-500 inline ml-2" />}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.brand || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.model || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{row.category || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.type || '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">€{row.price_eur || 0}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-xs">
                              <div className="truncate">
                                {Object.keys(row.specifications || {}).length > 0 
                                  ? `${Object.keys(row.specifications).length} technical fields`
                                  : 'No specifications'
                                }
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {Object.keys(row.specifications || {}).slice(0, 3).join(', ')}
                                {Object.keys(row.specifications || {}).length > 3 && '...'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  Back to Mapping
                </button>
                <button
                  onClick={performImport}
                  disabled={importStats.valid === 0 || importing}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      Import {importStats.valid} Valid Rows
                      <Save className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Importing State */}
          {importing && (
            <div className="text-center py-16">
              <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Importing MEP Equipment</h3>
              <p className="text-gray-600">Processing your professional equipment database...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments for large catalogs.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}