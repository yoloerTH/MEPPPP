import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  CheckCircle, 
  AlertTriangle,
  User,
  Building,
  Mail,
  Euro,
  Package,
  Clock,
  Shield,
  Activity,
  Fan,
  Briefcase,
  Zap,
  TrendingUp,
  Settings,
  FileText,
  MapPin,
  Phone,
  Eye,
  Calendar,
  Award,
  Target,
  Gauge
} from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface QuotationApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationData: {
    id: string;
    quotation_number: string;
    total_amount: number;
    margin_percentage: number;
    analysis?: any;
    client_details?: any;
  } | null;
  onConfirm: (quotationId: string) => Promise<void>;
}

export default function QuotationApprovalModal({ 
  isOpen, 
  onClose, 
  quotationData, 
  onConfirm 
}: QuotationApprovalModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkedItems, setCheckedItems] = useState({
    technical: false,
    pricing: false,
    client: false,
    specifications: false
  });

  const [clientInfo, setClientInfo] = useState<any>({});
  const [equipmentBreakdown, setEquipmentBreakdown] = useState<any>({});
  const [technicalMetrics, setTechnicalMetrics] = useState<any>({});
  const [systemComplexity, setSystemComplexity] = useState('simple');

  // Close modal when clicking outside
  useOutsideClick(modalRef, onClose);

  useEffect(() => {
    if (isOpen && quotationData) {
      extractQuotationData();
    }
  }, [isOpen, quotationData]);

  const extractQuotationData = () => {
    if (!quotationData) return;

    try {
      // Parse analysis if it's a string
      let analysis = quotationData.analysis;
      if (typeof analysis === 'string') {
        analysis = JSON.parse(analysis);
      }

      // Extract client information
      const projectId = analysis?.project_identification || {};
      const analysisClient = analysis?.client_details || {};
      const directClient = quotationData.client_details || {};

      setClientInfo({
        name: projectId.client_name || analysisClient.client_name || directClient.client_name || directClient.name || '',
        email: projectId.client_email || analysisClient.client_email || directClient.client_email || directClient.email || '',
        company: projectId.client_company || analysisClient.client_company || directClient.client_company || directClient.company || '',
        project_name: projectId.project_name || analysisClient.project_name || directClient.project_name || '',
        location: projectId.location || analysisClient.location || directClient.location || '',
        building_type: projectId.building_type || analysisClient.building_type || directClient.building_type || '',
        phone: analysisClient.phone || directClient.phone || ''
      });

      // Extract equipment breakdown
      const equipment = analysis?.equipment || analysis?.equipment_selection || [];
      
      const hvacEquipment = equipment.filter((item: any) => 
        item.ai_specialization === 'primary_hvac' ||
        (item.category?.toLowerCase().includes('air_conditioning') && ['outdoor', 'cassette', 'wall', 'ducted', 'precision'].includes(item.type?.toLowerCase())) ||
        (item.category?.toLowerCase().includes('plumbing') && ['air_cooled'].includes(item.type?.toLowerCase()))
      );

      const ventilationEquipment = equipment.filter((item: any) => 
        item.ai_specialization === 'ventilation_auxiliary' ||
        item.model?.toLowerCase().includes('ahu') ||
        item.model?.toLowerCase().includes('fan') ||
        item.model?.toLowerCase().includes('extract')
      );

      const materialsServices = equipment.filter((item: any) => 
        ['materials', 'services'].includes(item.ai_specialization) ||
        item.category?.toLowerCase().includes('materials') ||
        item.category?.toLowerCase().includes('services')
      );

      setEquipmentBreakdown({
        total: equipment.length,
        hvac: hvacEquipment,
        ventilation: ventilationEquipment,
        materials: materialsServices,
        allEquipment: equipment
      });

      // Calculate technical metrics
      const totalCapacity = equipment.reduce((sum: number, item: any) => {
        const capacity = item.power_kw || item.total_capacity_provided || item.cooling_capacity_kw || 0;
        return sum + (capacity * (item.quantity || 1));
      }, 0);

      const vrfSystems = equipment.filter((item: any) => 
        item.model?.toLowerCase().includes('vrf') || 
        item.model?.toLowerCase().includes('vrv') ||
        item.specifications?.toLowerCase().includes('vrf')
      );

      const chillerSystems = equipment.filter((item: any) => 
        item.model?.toLowerCase().includes('chiller') ||
        item.specifications?.toLowerCase().includes('chiller')
      );

      const totalValue = equipment.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);

      setTechnicalMetrics({
        totalCapacity: Math.round(totalCapacity),
        vrfSystems: vrfSystems.length,
        chillerSystems: chillerSystems.length,
        totalValue,
        averageEfficiency: '> 6.5 SEER',
        equipmentCount: equipment.length
      });

      // Determine system complexity
      let complexity = 'simple';
      if (equipment.length > 8 || chillerSystems.length > 0 || totalCapacity > 100) {
        complexity = equipment.length > 15 || totalCapacity > 300 ? 'complex' : 'medium';
      }
      setSystemComplexity(complexity);

    } catch (error) {
      console.error('Error extracting quotation data:', error);
    }
  };

  const handleCheckboxChange = (item: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const allChecksCompleted = Object.values(checkedItems).every(checked => checked) && acknowledged;

  const handleConfirm = async () => {
    if (!quotationData || !allChecksCompleted) return;

    setConfirming(true);
    try {
      await onConfirm(quotationData.id);
      onClose();
    } catch (error) {
      console.error('Error confirming quotation:', error);
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen || !quotationData) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Executive Approval Required</h2>
                <p className="text-blue-200 mt-1">Final review and approval for {quotationData.quotation_number}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-3 hover:bg-white/10 rounded-2xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Executive Summary */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-200">
            <h3 className="text-2xl font-bold text-blue-900 mb-6 flex items-center">
              <Award className="w-6 h-6 mr-3" />
              Executive Project Summary
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center space-x-3 mb-3">
                  <Euro className="w-6 h-6 text-green-600" />
                  <span className="text-green-700 font-medium">Project Value</span>
                </div>
                <p className="text-3xl font-bold text-green-900">€{quotationData.total_amount.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">{quotationData.margin_percentage}% margin</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center space-x-3 mb-3">
                  <Zap className="w-6 h-6 text-yellow-600" />
                  <span className="text-yellow-700 font-medium">Total Capacity</span>
                </div>
                <p className="text-3xl font-bold text-yellow-900">{technicalMetrics.totalCapacity}kW</p>
                <p className="text-sm text-yellow-600 mt-1">System capacity</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center space-x-3 mb-3">
                  <Package className="w-6 h-6 text-purple-600" />
                  <span className="text-purple-700 font-medium">Equipment</span>
                </div>
                <p className="text-3xl font-bold text-purple-900">{equipmentBreakdown.total}</p>
                <p className="text-sm text-purple-600 mt-1">Total items</p>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center space-x-3 mb-3">
                  <Gauge className="w-6 h-6 text-indigo-600" />
                  <span className="text-indigo-700 font-medium">Complexity</span>
                </div>
                <p className="text-3xl font-bold text-indigo-900 capitalize">{systemComplexity}</p>
                <p className="text-sm text-indigo-600 mt-1">System level</p>
              </div>
            </div>
          </div>

          {/* Technical System Breakdown */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-3xl p-8 border border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
              <Settings className="w-6 h-6 mr-3" />
              Technical System Overview
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* HVAC Systems */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-2xl">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Primary HVAC</h4>
                    <p className="text-sm text-slate-600">{equipmentBreakdown.hvac?.length || 0} systems</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {equipmentBreakdown.hvac?.slice(0, 3).map((item: any, index: number) => (
                    <div key={index} className="text-sm">
                      <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                      <p className="text-slate-600">{item.quantity}x @ €{(item.unit_price || 0).toLocaleString()}</p>
                    </div>
                  ))}
                  {equipmentBreakdown.hvac?.length > 3 && (
                    <p className="text-sm text-blue-600 font-medium">
                      +{equipmentBreakdown.hvac.length - 3} more systems
                    </p>
                  )}
                </div>
              </div>

              {/* Ventilation Systems */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-2xl">
                    <Fan className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Ventilation</h4>
                    <p className="text-sm text-slate-600">{equipmentBreakdown.ventilation?.length || 0} systems</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {equipmentBreakdown.ventilation?.slice(0, 3).map((item: any, index: number) => (
                    <div key={index} className="text-sm">
                      <p className="font-medium text-slate-900">{item.brand} {item.model}</p>
                      <p className="text-slate-600">{item.quantity}x @ €{(item.unit_price || 0).toLocaleString()}</p>
                    </div>
                  ))}
                  {equipmentBreakdown.ventilation?.length > 3 && (
                    <p className="text-sm text-green-600 font-medium">
                      +{equipmentBreakdown.ventilation.length - 3} more systems
                    </p>
                  )}
                </div>
              </div>

              {/* Materials & Services */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-purple-100 rounded-2xl">
                    <Briefcase className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Materials & Services</h4>
                    <p className="text-sm text-slate-600">{equipmentBreakdown.materials?.length || 0} items</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {equipmentBreakdown.materials?.slice(0, 3).map((item: any, index: number) => (
                    <div key={index} className="text-sm">
                      <p className="font-medium text-slate-900">{item.model || item.description}</p>
                      <p className="text-slate-600">{item.quantity}x @ €{(item.unit_price || 0).toLocaleString()}</p>
                    </div>
                  ))}
                  {equipmentBreakdown.materials?.length > 3 && (
                    <p className="text-sm text-purple-600 font-medium">
                      +{equipmentBreakdown.materials.length - 3} more items
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Client Information */}
          {(clientInfo.name || clientInfo.company) && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 border border-green-200">
              <h3 className="text-2xl font-bold text-green-900 mb-6 flex items-center">
                <User className="w-6 h-6 mr-3" />
                Client & Project Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  {clientInfo.name && (
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700">Contact Person</p>
                        <p className="font-bold text-green-900">{clientInfo.name}</p>
                      </div>
                    </div>
                  )}
                  
                  {clientInfo.company && (
                    <div className="flex items-center space-x-3">
                      <Building className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700">Company</p>
                        <p className="font-bold text-green-900">{clientInfo.company}</p>
                      </div>
                    </div>
                  )}
                  
                  {clientInfo.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700">Email Address</p>
                        <p className="font-bold text-green-900">{clientInfo.email}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {clientInfo.project_name && (
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700">Project Name</p>
                        <p className="font-bold text-green-900">{clientInfo.project_name}</p>
                      </div>
                    </div>
                  )}
                  
                  {clientInfo.location && (
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700">Location</p>
                        <p className="font-bold text-green-900">{clientInfo.location}</p>
                      </div>
                    </div>
                  )}
                  
                  {clientInfo.building_type && (
                    <div className="flex items-center space-x-3">
                      <Building className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-700">Building Type</p>
                        <p className="font-bold text-green-900 capitalize">{clientInfo.building_type.replace('_', ' ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pre-Approval Checklist */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl p-8 border border-orange-200">
            <h3 className="text-2xl font-bold text-orange-900 mb-6 flex items-center">
              <Target className="w-6 h-6 mr-3" />
              Pre-Approval Technical Checklist
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedItems.technical}
                    onChange={() => handleCheckboxChange('technical')}
                    className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-500 w-5 h-5"
                  />
                  <div>
                    <span className="font-bold text-orange-900">Technical Specifications Verified</span>
                    <p className="text-sm text-orange-700 mt-1">
                      All equipment capacities, power requirements, and technical specifications have been reviewed and are accurate.
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedItems.pricing}
                    onChange={() => handleCheckboxChange('pricing')}
                    className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-500 w-5 h-5"
                  />
                  <div>
                    <span className="font-bold text-orange-900">Pricing & Margins Confirmed</span>
                    <p className="text-sm text-orange-700 mt-1">
                      All pricing, margins ({quotationData.margin_percentage}%), and calculations are correct and competitive.
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedItems.client}
                    onChange={() => handleCheckboxChange('client')}
                    className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-500 w-5 h-5"
                  />
                  <div>
                    <span className="font-bold text-orange-900">Client Details Accurate</span>
                    <p className="text-sm text-orange-700 mt-1">
                      Client contact information, project details, and requirements are complete and verified.
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkedItems.specifications}
                    onChange={() => handleCheckboxChange('specifications')}
                    className="mt-1 rounded border-orange-300 text-orange-600 focus:ring-orange-500 w-5 h-5"
                  />
                  <div>
                    <span className="font-bold text-orange-900">System Integration Validated</span>
                    <p className="text-sm text-orange-700 mt-1">
                      Equipment compatibility, system integration, and installation requirements have been assessed.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Final Acknowledgment */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-3xl p-8 border border-purple-200">
            <h3 className="text-xl font-bold text-purple-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Executive Authorization
            </h3>
            
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-5 h-5"
              />
              <div>
                <span className="font-bold text-purple-900">Executive Approval Authorization</span>
                <p className="text-purple-800 mt-1">
                  I hereby authorize the immediate transmission of this quotation to the client. 
                  I confirm that all technical, commercial, and client details have been thoroughly 
                  reviewed and approved for professional presentation. This quotation represents 
                  our company's commitment to delivering the specified MEP systems and services.
                </p>
              </div>
            </label>
          </div>

          {/* Critical Warning */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-3xl p-6 border border-red-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
              <div>
                <h4 className="font-bold text-red-900 mb-2">Critical: Final Authorization Required</h4>
                <ul className="text-red-800 space-y-1 text-sm">
                  <li>• This quotation will be immediately sent to {clientInfo.email}</li>
                  <li>• The quotation becomes legally binding upon client acceptance</li>
                  <li>• No modifications can be made after transmission</li>
                  <li>• All technical specifications become contractual commitments</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-slate-200 text-slate-800 rounded-xl hover:bg-slate-300 transition-colors font-medium"
            >
              Cancel Review
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming || !allChecksCompleted}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center"
            >
              {confirming ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Authorizing & Sending...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-3" />
                  <Send className="w-4 h-4 mr-2" />
                  Authorize & Send Quotation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}