import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  Loader2, 
  CheckCircle, 
  Package, 
  Calculator, 
  FileText, 
  AlertCircle,
  Brain,
  Mail,
  User,
  Building,
  Euro,
  Clock,
  Settings,
  XCircle,
  Zap,
  Eye,
  RefreshCw,
  Edit3,
  Send,
  ChevronDown,
  ChevronRight,
  MapPin,
  Users,
  Thermometer,
  Wind,
  Wrench,
  Shield,
  TrendingUp,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface ProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailId: string;
  processingResult?: any;
  processingError?: string | null;
  onProcessingComplete?: (result: any) => void;
}

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  icon: React.ComponentType<any>;
  details?: string;
  substeps?: string[];
}

interface AnalysisSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  data: any;
  expanded: boolean;
}

export default function ProcessingModal({ 
  isOpen, 
  onClose, 
  emailId, 
  processingResult, 
  processingError, 
  onProcessingComplete 
}: ProcessingModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    {
      id: 'ai_analysis',
      title: 'AI Project Analysis',
      description: 'Extracting project requirements and technical specifications',
      status: 'pending',
      icon: Brain,
      substeps: [
        'Reading email content and attachments',
        'Identifying building type and scope',
        'Extracting capacity requirements',
        'Analyzing technical specifications'
      ]
    },
    {
      id: 'equipment_matching',
      title: 'Equipment Database Matching',
      description: 'Matching requirements to available equipment inventory',
      status: 'pending',
      icon: Package,
      substeps: [
        'HVAC systems selection',
        'Ventilation equipment matching',
        'Materials and services calculation',
        'Capacity verification'
      ]
    },
    {
      id: 'pricing_calculation',
      title: 'Intelligent Pricing',
      description: 'Calculating costs, margins, and professional pricing',
      status: 'pending',
      icon: Calculator,
      substeps: [
        'Base equipment costs',
        'Installation calculations',
        'Profit margin application',
        'VAT and final totals'
      ]
    },
    {
      id: 'quotation_generation',
      title: 'Professional Quotation',
      description: 'Creating draft quotation ready for review and approval',
      status: 'pending',
      icon: FileText,
      substeps: [
        'Document structure creation',
        'Technical specifications formatting',
        'Professional layout application',
        'Draft finalization'
      ]
    }
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [finalComplete, setFinalComplete] = useState(false);
  const [pollingForCompletion, setPollingForCompletion] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['project_summary']);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [needsClarification, setNeedsClarification] = useState(false);

  // Close modal when clicking outside
  useOutsideClick(modalRef, onClose);

  // Enhanced cleanup effect
  useEffect(() => {
    if (!isOpen) {
      console.log('🧹 ProcessingModal closed - cleaning up state');
      resetModalState();
    }
  }, [isOpen]);

  useEffect(() => {
    if (emailId) {
      console.log(`🔄 EmailId changed to: ${emailId} - resetting modal state`);
      resetModalState();
    }
  }, [emailId]);

  const resetModalState = () => {
    setAnalysisComplete(false);
    setFinalComplete(false);
    setPollingForCompletion(false);
    setAnalysisData(null);
    setCurrentStep(0);
    setElapsedTime(0);
    setProcessingStartTime(null);
    setIsProcessing(false);
    setExpandedSections(['project_summary']);
    setShowDetailedView(false);
    setNeedsClarification(false);
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', details: undefined })));
  };

  useEffect(() => {
    if (isOpen && !processingStartTime) {
      console.log(`🚀 ProcessingModal opening - starting fresh processing for email: ${emailId}`);
      resetModalState();
      setProcessingStartTime(new Date());
      setIsProcessing(true);
      startProcessingAnimation();
    }
  }, [isOpen, emailId]);

  // Enhanced result handling
  useEffect(() => {
    if (processingResult) {
      console.log('📨 Processing result received:', processingResult);
      
      if (processingResult.status === 'analysis_complete') {
        handleAnalysisComplete(processingResult);
      } else if (processingResult.status === 'clarification_needed') {
        handleClarificationNeeded(processingResult);
      } else if (processingResult.success || processingResult.status === 'draft_created') {
        handleFinalComplete(processingResult);
      } else {
        setIsProcessing(false);
        handleFailedProcessing(processingResult.error || 'Processing failed');
      }
    }
  }, [processingResult]);

  useEffect(() => {
    if (processingError) {
      setIsProcessing(false);
      handleFailedProcessing(processingError);
    }
  }, [processingError]);

  // Enhanced timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if ((isProcessing || pollingForCompletion) && processingStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - processingStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, pollingForCompletion, processingStartTime]);

  const startProcessingAnimation = () => {
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' })));
    setTimeout(() => updateStepStatus(0, 'processing'), 500);
  };

  const handleAnalysisComplete = (result: any) => {
    setIsProcessing(false);
    setAnalysisComplete(true);
    setAnalysisData(result);
    
    // Update AI analysis step
    updateStepStatus(0, 'completed', 'Project requirements successfully extracted and analyzed');
    
    // Start background processing animation
    setTimeout(() => updateStepStatus(1, 'processing'), 1000);
    setTimeout(() => updateStepStatus(2, 'processing'), 2500);
    setTimeout(() => updateStepStatus(3, 'processing'), 4000);
    
    // Start polling for completion
    setPollingForCompletion(true);
    startPollingForCompletion();
  };

  const handleClarificationNeeded = (result: any) => {
    setIsProcessing(false);
    setNeedsClarification(true);
    setAnalysisData(result);
    updateStepStatus(0, 'completed', 'Analysis complete - additional information needed');
  };

  const handleFinalComplete = (result: any) => {
    setIsProcessing(false);
    setPollingForCompletion(false);
    setFinalComplete(true);
    setAnalysisData(result);
    
    // Mark all steps as completed with detailed information
    setSteps(prev => prev.map((step, index) => {
      let details = '';
      switch (step.id) {
        case 'ai_analysis':
          details = `Project: ${result.project_analysis?.identification?.project_name || 'Analyzed successfully'}`;
          break;
        case 'equipment_matching':
          const systemSummary = result.project_analysis?.system_summary;
          const totalItems = (systemSummary?.hvac_systems?.fan_coils || 0) + 
                           (systemSummary?.hvac_systems?.vrf_systems || 0) + 
                           (systemSummary?.hvac_systems?.chillers || 0);
          details = `${totalItems} HVAC items + auxiliary systems selected`;
          break;
        case 'pricing_calculation':
          details = `Total: €${result.quotation_details?.total_amount?.toLocaleString() || result.total_quote?.toLocaleString() || '0'}`;
          break;
        case 'quotation_generation':
          details = `Draft ${result.quotation_details?.quotation_number || result.quotation_number || ''} ready for review`;
          break;
      }
      return { ...step, status: 'completed', details };
    }));
    
    setCurrentStep(steps.length - 1);
    
    if (onProcessingComplete) {
      onProcessingComplete(result);
    }
  };

  const startPollingForCompletion = async () => {
    const maxAttempts = 40;
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      console.log(`🔍 Polling for quotation completion (attempt ${attempts}/${maxAttempts})`);
      
      let shouldContinuePolling = true;
      let quotationRecord = null;
      
      try {
        // Get authenticated user
        let user = null;
        try {
          const authPromise = supabase.auth.getUser();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Auth timeout')), 8000)
          );
          
          const { data: { user: authUser }, error: authError } = await Promise.race([
            authPromise, 
            timeoutPromise
          ]) as any;
          
          if (authUser) {
            user = authUser;
            console.log(`👤 User authenticated: ${authUser.id}`);
          }
        } catch (authError) {
          console.warn('⚠️ Authentication timeout:', authError.message);
        }
        
        // Query quotations table
        if (user) {
          try {
            const { data: record, error } = await supabase
              .from('quotations')
              .select('*')
              .eq('gmail_id', emailId)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!error && record) {
              quotationRecord = record;
              console.log(`✅ Found quotation: ${record.status}`);
            }
          } catch (dbError) {
            console.warn('❌ Database query failed:', dbError.message);
          }
        }
        
        // Fallback query without user_id
        if (!quotationRecord) {
          try {
            const { data: fallbackRecord, error: fallbackError } = await supabase
              .from('quotations')
              .select('*')
              .eq('gmail_id', emailId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!fallbackError && fallbackRecord) {
              quotationRecord = fallbackRecord;
              console.log(`✅ Found quotation via fallback: ${fallbackRecord.status}`);
            }
          } catch (fallbackError) {
            console.warn('❌ Fallback query failed:', fallbackError.message);
          }
        }
        
        // Process result
        if (quotationRecord) {
          if (quotationRecord.status === 'draft') {
            console.log('✅ Draft quotation ready!');
            
            const finalResult = {
              success: true,
              status: 'draft_created',
              message: 'Professional quotation created and ready for review',
              quotation_details: {
                quotation_id: quotationRecord.id,
                quotation_number: quotationRecord.quotation_number,
                total_amount: quotationRecord.total_amount,
                gmail_id: quotationRecord.gmail_id
              },
              project_analysis: {
                identification: quotationRecord.client_details || {},
                system_summary: quotationRecord.analysis?.project_summary || {},
                capacity_analysis: quotationRecord.analysis?.capacity_requirements || {}
              },
              processing_status: {
                stage: 'quotation_complete',
                project_complexity: quotationRecord.analysis?.qualification_assessment?.project_complexity || 'medium'
              }
            };
            
            handleFinalComplete(finalResult);
            shouldContinuePolling = false;
          } else if (quotationRecord.status === 'failed') {
            console.log('❌ Quotation failed');
            setPollingForCompletion(false);
            handleFailedProcessing('Quotation generation failed. Please try again.');
            shouldContinuePolling = false;
          } else {
            console.log(`⏳ Still processing... Status: ${quotationRecord.status}`);
          }
        } else {
          console.warn('⚠️ No quotation record found, continuing to poll');
        }
        
      } catch (error) {
        console.error('💥 Polling error:', error);
      }
      
      // Schedule next poll
      if (shouldContinuePolling && attempts < maxAttempts) {
        const nextInterval = attempts <= 2 ? 8000 : attempts <= 5 ? 12000 : 15000;
        setTimeout(poll, nextInterval);
      } else if (attempts >= maxAttempts) {
        console.log('⏰ Polling timeout - processing may continue in background');
        setPollingForCompletion(false);
      }
    };
    
    setTimeout(poll, 25000);
  };

  const updateStepStatus = (stepIndex: number, status: 'pending' | 'processing' | 'completed' | 'failed', details?: string) => {
    setSteps(prev => prev.map((step, index) => {
      if (index === stepIndex) {
        return { ...step, status, details };
      } else if (index < stepIndex && status === 'completed') {
        return { ...step, status: 'completed' };
      }
      return step;
    }));
    setCurrentStep(stepIndex);
  };

  const handleFailedProcessing = (error: string) => {
    setSteps(prev => prev.map(step => ({ ...step, status: 'failed' })));
    setPollingForCompletion(false);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const getStepIcon = (step: ProcessingStep) => {
    const IconComponent = step.icon;
    
    if (step.status === 'processing') {
      return <Loader2 className="w-6 h-6 animate-spin text-blue-600" />;
    } else if (step.status === 'completed') {
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    } else if (step.status === 'failed') {
      return <XCircle className="w-6 h-6 text-red-600" />;
    } else {
      return <IconComponent className="w-6 h-6 text-gray-400" />;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderProjectSummary = () => {
    if (!analysisData?.project_analysis?.identification) return null;

    const identification = analysisData.project_analysis.identification;
    const systemSummary = analysisData.project_analysis.system_summary;
    const processingStatus = analysisData.processing_status;

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('project_summary')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Building className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Project Overview</h4>
          </div>
          {expandedSections.includes('project_summary') ? 
            <ChevronDown className="w-5 h-5 text-gray-500" /> : 
            <ChevronRight className="w-5 h-5 text-gray-500" />
          }
        </button>
        
        {expandedSections.includes('project_summary') && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Building className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Project Name</p>
                    <p className="text-gray-900">{identification.project_name || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Location</p>
                    <p className="text-gray-900">{identification.location || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <User className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Client</p>
                    <p className="text-gray-900">{identification.client_name || 'Not specified'}</p>
                    {identification.client_company && (
                      <p className="text-sm text-gray-600">{identification.client_company}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <Building className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Building Type</p>
                    <p className="text-gray-900 capitalize">{identification.building_type || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Users className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Project Scope</p>
                    <p className="text-gray-900">{identification.total_units || 0} units</p>
                    <p className="text-sm text-gray-600 capitalize">{identification.project_scope?.replace('_', ' ') || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <TrendingUp className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Complexity</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      processingStatus?.project_complexity === 'complex' 
                        ? 'bg-red-100 text-red-800'
                        : processingStatus?.project_complexity === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {processingStatus?.project_complexity || 'Medium'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSystemRequirements = () => {
    if (!analysisData?.project_analysis?.system_summary) return null;

    const systemSummary = analysisData.project_analysis.system_summary;
    const hvacSystems = systemSummary.hvac_systems || {};
    const auxiliarySystems = systemSummary.auxiliary_systems || {};

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('system_requirements')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Thermometer className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">System Requirements</h4>
          </div>
          {expandedSections.includes('system_requirements') ? 
            <ChevronDown className="w-5 h-5 text-gray-500" /> : 
            <ChevronRight className="w-5 h-5 text-gray-500" />
          }
        </button>
        
        {expandedSections.includes('system_requirements') && (
          <div className="p-6 space-y-6">
            <div>
              <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                <Thermometer className="w-4 h-4 mr-2 text-red-500" />
                HVAC Systems
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Fan Coils</p>
                  <p className="text-xl font-bold text-blue-600">{hvacSystems.fan_coils || 0}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-green-900">VRF Systems</p>
                  <p className="text-xl font-bold text-green-600">{hvacSystems.vrf_systems || 0}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">Chillers</p>
                  <p className="text-xl font-bold text-purple-600">{hvacSystems.chillers || 0}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-orange-900">Heat Pumps</p>
                  <p className="text-xl font-bold text-orange-600">{hvacSystems.heat_pumps || 0}</p>
                </div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                <Wind className="w-4 h-4 mr-2 text-blue-500" />
                Auxiliary Systems
              </h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg ${auxiliarySystems.ventilation ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className="text-sm font-medium text-gray-700">Ventilation</p>
                  <p className={`text-sm font-semibold ${auxiliarySystems.ventilation ? 'text-green-600' : 'text-gray-500'}`}>
                    {auxiliarySystems.ventilation ? 'Required' : 'Not needed'}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${auxiliarySystems.controls ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className="text-sm font-medium text-gray-700">Controls</p>
                  <p className={`text-sm font-semibold ${auxiliarySystems.controls ? 'text-green-600' : 'text-gray-500'}`}>
                    {auxiliarySystems.controls ? 'Required' : 'Not needed'}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${auxiliarySystems.hot_water ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className="text-sm font-medium text-gray-700">Hot Water</p>
                  <p className={`text-sm font-semibold ${auxiliarySystems.hot_water ? 'text-green-600' : 'text-gray-500'}`}>
                    {auxiliarySystems.hot_water ? 'Required' : 'Not needed'}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${auxiliarySystems.special_systems ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <p className="text-sm font-medium text-gray-700">Special Systems</p>
                  <p className={`text-sm font-semibold ${auxiliarySystems.special_systems ? 'text-green-600' : 'text-gray-500'}`}>
                    {auxiliarySystems.special_systems ? 'Required' : 'Not needed'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCapacityAnalysis = () => {
    if (!analysisData?.project_analysis?.capacity_analysis?.capacity_breakdown) return null;

    const capacityBreakdown = analysisData.project_analysis.capacity_analysis.capacity_breakdown;

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => toggleSection('capacity_analysis')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold text-gray-900">Capacity Requirements</h4>
          </div>
          {expandedSections.includes('capacity_analysis') ? 
            <ChevronDown className="w-5 h-5 text-gray-500" /> : 
            <ChevronRight className="w-5 h-5 text-gray-500" />
          }
        </button>
        
        {expandedSections.includes('capacity_analysis') && (
          <div className="p-6">
            <div className="space-y-3">
              {capacityBreakdown.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.area}</p>
                    <p className="text-sm text-gray-600">{item.requirement}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI-Powered MEP Analysis</h2>
              <p className="text-sm text-gray-600">
                Email ID: {emailId} | Processing time: {formatTime(elapsedTime)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Processing Steps */}
          <div className="space-y-6 mb-8">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-medium ${
                    step.status === 'completed' ? 'text-green-900' :
                    step.status === 'processing' ? 'text-blue-900' :
                    step.status === 'failed' ? 'text-red-900' :
                    'text-gray-900'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-gray-600 mt-1">{step.description}</p>
                  
                  {step.details && (
                    <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                      ✅ {step.details}
                    </p>
                  )}
                  
                  {step.status === 'processing' && step.substeps && (
                    <div className="mt-3">
                      <div className="bg-blue-100 rounded-full h-2 mb-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                      <div className="space-y-1">
                        {step.substeps.map((substep, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${idx <= 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
                            <p className="text-sm text-blue-700">{substep}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Analysis Complete - Rich Display */}
          {analysisComplete && analysisData && !finalComplete && !needsClarification && (
            <div className="mt-8 space-y-6">
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                    <h3 className="text-lg font-semibold text-green-900">✅ Project Analysis Complete!</h3>
                  </div>
                  <button
                    onClick={() => setShowDetailedView(!showDetailedView)}
                    className="text-green-700 hover:text-green-900 flex items-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">{showDetailedView ? 'Hide' : 'Show'} Details</span>
                  </button>
                </div>

                {/* Enhanced Analysis Display */}
                <div className="space-y-4">
                  {renderProjectSummary()}
                  
                  {showDetailedView && (
                    <>
                      {renderSystemRequirements()}
                      {renderCapacityAnalysis()}
                    </>
                  )}
                </div>

                {/* Background Processing Indicator */}
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-blue-900">Creating Professional Quotation</p>
                        <p className="text-sm text-blue-700">Equipment matching, pricing optimization, and document generation in progress...</p>
                      </div>
                    </div>
                    {pollingForCompletion && (
                      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      {pollingForCompletion ? 'Monitoring every 15 seconds...' : 'Processing continues in background...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clarification Needed */}
          {needsClarification && (
            <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3" />
                <h3 className="text-lg font-semibold text-yellow-900">Additional Information Needed</h3>
              </div>
              <p className="text-yellow-800 mb-4">
                The AI analysis is complete, but we need some additional details to create an accurate quotation.
              </p>
              <div className="bg-white rounded-lg p-4 border border-yellow-300">
                <p className="text-yellow-800 text-sm">
                  <strong>Next steps:</strong> A clarification request has been sent to the client automatically. 
                  Once they provide the missing information, processing will continue.
                </p>
              </div>
            </div>
          )}

          {/* Final Complete */}
          {finalComplete && analysisData && (
            <div className="mt-8 space-y-6">
              <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <div className="flex items-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                  <h3 className="text-lg font-semibold text-green-900">🎉 Professional Quotation Ready!</h3>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-green-200 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Quotation #:</span>
                        <span className="text-sm font-mono text-gray-900">{analysisData.quotation_details?.quotation_number}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                        <span className="text-sm font-semibold text-green-600">
                          €{analysisData.quotation_details?.total_amount?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Complexity:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          analysisData.processing_status?.project_complexity === 'complex' 
                            ? 'bg-red-100 text-red-800'
                            : analysisData.processing_status?.project_complexity === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {analysisData.processing_status?.project_complexity || 'Medium'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Draft Ready for Review
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 mb-4">
                  <div className="flex items-start space-x-3">
                    <Edit3 className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 mb-2">Professional Quotation Created</p>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Complete equipment specifications and pricing</li>
                        <li>• Professional layout with company branding</li>
                        <li>• Ready for review, editing, and client approval</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={onClose}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium flex items-center shadow-lg"
                  >
                    <Edit3 className="w-5 h-5 mr-2" />
                    Review & Edit Quotation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {processingError && (
            <div className="mt-8 p-6 bg-red-50 rounded-xl border-2 border-red-200">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-red-900">Processing Issue</h3>
              </div>
              <p className="text-red-700 leading-relaxed mb-4">{processingError}</p>
              <div className="bg-red-100 rounded-lg p-3 border border-red-300 mb-4">
                <p className="text-red-800 text-sm">
                  <strong>Common causes:</strong> Complex email formatting, network connectivity, or incomplete project information.
                </p>
              </div>
              <button
                onClick={onClose}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Close & Retry
              </button>
            </div>
          )}

          {/* Initial Processing State */}
          {isProcessing && !analysisComplete && !processingError && (
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
              <div className="flex items-center justify-center mb-6">
                <div className="relative">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                  <Zap className="w-5 h-5 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-blue-900 font-semibold text-xl mb-2">Intelligent MEP Analysis in Progress</p>
                <p className="text-blue-700 mb-6">
                  Our advanced AI is analyzing your project requirements and extracting technical specifications...
                </p>
                <div className="bg-blue-100 rounded-lg p-4 border border-blue-300 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                    <div className="space-y-2">
                      <p>⚡ <strong>AI Processing:</strong> Email content + attachments</p>
                      <p>🏗️ <strong>Project Analysis:</strong> Building type, scope, requirements</p>
                    </div>
                    <div className="space-y-2">
                      <p>🎯 <strong>Equipment Matching:</strong> Database of 1000+ items</p>
                      <p>💰 <strong>Smart Pricing:</strong> Professional quotation creation</p>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full animate-pulse transition-all duration-1000" 
                       style={{ width: `${Math.min(40 + (elapsedTime * 2), 90)}%` }}></div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Estimated completion: {Math.max(0, 120 - elapsedTime)}s remaining
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}