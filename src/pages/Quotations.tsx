import React, { useEffect, useState, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Send, 
  Eye, 
  Calendar,
  Euro,
  Package,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Building,
  User,
  Edit,
  Trash2,
  Plus,
  Search,
  Settings,
  TrendingUp,
  Zap,
  Activity,
  MapPin,
  Mail,
  Phone,
  Briefcase
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import HTMLQuotationModal from '../components/HTMLQuotationModal';
import QuotationEditorModal from '../components/QuotationEditorModal';
import QuotationApprovalModal from '../components/QuotationApprovalModal';
import { useQuotationEditor } from '../hooks/useQuotationEditor';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface Quotation {
  id: string;
  quotation_number: string;
  analysis: any;
  total_amount: number;
  margin_percentage: number;
  status: 'draft' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until?: string;
  sent_at?: string;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  project_summary: any;
  client_details: any;
  html_quotation?: string;
  gmail_id?: string;
  user_id: string;
}

interface QuotationsProps {
  onGlobalError?: (error: { title: string; message: string; type?: 'error' | 'timeout' | 'network' }) => void;
}

export default function Quotations({ onGlobalError }: QuotationsProps) {
  const quotationDetailsRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showHTMLModal, setShowHTMLModal] = useState(false);
  const [selectedQuotationForHTML, setSelectedQuotationForHTML] = useState<Quotation | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const { saveDraft, approveQuotation } = useQuotationEditor();

  // Close quotation details modal when clicking outside
  useOutsideClick(quotationDetailsRef, () => setShowDetails(false));

  useEffect(() => {
    console.log('📋 Quotations: Component mounted/user changed', { hasUser: !!user, userId: user?.id });
    if (user) {
      loadQuotations();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user]);

  const loadQuotations = async () => {
    console.log('📋 Quotations: Starting loadQuotations');
    if (!user) return;
    
    try {
      console.log('📋 Quotations: Fetching quotations for user:', user.id);
      
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('📋 Quotations: Error loading quotations:', error);
        throw error;
      }
      
      console.log('📋 Quotations: Loaded quotations successfully:', data?.length || 0);
      setQuotations(data || []);
    } catch (error) {
      console.error('📋 Quotations: Error in loadQuotations:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Quotations Loading Error',
          message: `Failed to load quotations: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      console.log('📋 Quotations: Setting loading to false');
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    console.log('📋 Quotations: Setting up realtime subscription for user:', user?.id);
    const channel = supabase
      .channel('quotations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotations',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log('📋 Quotations: Realtime change received:', payload);
          loadQuotations();
        }
      )
      .subscribe();

    return () => {
      console.log('📋 Quotations: Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  };

  // Enhanced data extraction functions
  const extractClientInfo = (quotation: Quotation) => {
    try {
      // Parse analysis if it's a string
      let analysis = quotation.analysis;
      if (typeof analysis === 'string') {
        analysis = JSON.parse(analysis);
      }

      // Parse client_details if it's a string
      let clientDetails = quotation.client_details;
      if (typeof clientDetails === 'string') {
        clientDetails = JSON.parse(clientDetails);
      }

      // Extract from multiple possible locations
      const projectId = analysis?.project_identification || {};
      const analysisClient = analysis?.client_details || {};
      const directClient = clientDetails || {};

      return {
        name: projectId.client_name || analysisClient.client_name || directClient.client_name || directClient.name || '',
        email: projectId.client_email || analysisClient.client_email || directClient.client_email || directClient.email || '',
        company: projectId.client_company || analysisClient.client_company || directClient.client_company || directClient.company || '',
        project_name: projectId.project_name || analysisClient.project_name || directClient.project_name || '',
        location: projectId.location || analysisClient.location || directClient.location || '',
        building_type: projectId.building_type || analysisClient.building_type || directClient.building_type || '',
        phone: analysisClient.phone || directClient.phone || ''
      };
    } catch (error) {
      console.error('Error extracting client info:', error);
      return {
        name: '', email: '', company: '', project_name: '', location: '', building_type: '', phone: ''
      };
    }
  };

  const extractProjectSummary = (quotation: Quotation) => {
    try {
      // Parse project_summary if it's a string
      let projectSummary = quotation.project_summary;
      if (typeof projectSummary === 'string') {
        projectSummary = JSON.parse(projectSummary);
      }

      // Parse analysis if it's a string
      let analysis = quotation.analysis;
      if (typeof analysis === 'string') {
        analysis = JSON.parse(analysis);
      }

      // Extract from analysis.project_summary or direct project_summary
      const summary = projectSummary || analysis?.project_summary || {};

      return {
        total_indoor_units: summary.total_indoor_units || 0,
        total_outdoor_units: summary.total_outdoor_units || 0,
        total_equipment_items: summary.total_equipment_items || 0,
        system_complexity: summary.system_complexity || 'simple'
      };
    } catch (error) {
      console.error('Error extracting project summary:', error);
      return {
        total_indoor_units: 0,
        total_outdoor_units: 0,
        total_equipment_items: 0,
        system_complexity: 'simple'
      };
    }
  };

  const extractEquipmentInfo = (quotation: Quotation) => {
    try {
      // Parse analysis if it's a string
      let analysis = quotation.analysis;
      if (typeof analysis === 'string') {
        analysis = JSON.parse(analysis);
      }

      // Extract equipment from multiple possible locations
      const equipment = analysis?.equipment || analysis?.equipment_selection || [];
      
      // Categorize equipment
      const hvacEquipment = equipment.filter((item: any) => 
        item.category?.toLowerCase().includes('air_conditioning') ||
        item.category?.toLowerCase().includes('plumbing') ||
        item.ai_specialization === 'primary_hvac'
      );

      const ventilationEquipment = equipment.filter((item: any) => 
        item.ai_specialization === 'ventilation_auxiliary' ||
        (item.category?.toLowerCase().includes('air_conditioning') && item.model?.toLowerCase().includes('ahu'))
      );

      const materialsServices = equipment.filter((item: any) => 
        item.category?.toLowerCase().includes('materials') ||
        item.category?.toLowerCase().includes('services') ||
        item.ai_specialization === 'materials' ||
        item.ai_specialization === 'services'
      );

      return {
        total: equipment.length,
        hvac: hvacEquipment.length,
        ventilation: ventilationEquipment.length,
        materials: materialsServices.length,
        equipment: equipment
      };
    } catch (error) {
      console.error('Error extracting equipment info:', error);
      return {
        total: 0,
        hvac: 0,
        ventilation: 0,
        materials: 0,
        equipment: []
      };
    }
  };

  const extractTechnicalMetrics = (quotation: Quotation) => {
    try {
      let analysis = quotation.analysis;
      if (typeof analysis === 'string') {
        analysis = JSON.parse(analysis);
      }

      const equipment = analysis?.equipment || [];
      
      // Calculate total capacity
      const totalCapacity = equipment.reduce((sum: number, item: any) => {
        const capacity = item.power_kw || item.total_capacity_provided || item.cooling_capacity_kw || 0;
        return sum + (capacity * (item.quantity || 1));
      }, 0);

      // Count major systems
      const vrfSystems = equipment.filter((item: any) => 
        item.model?.toLowerCase().includes('vrf') || 
        item.model?.toLowerCase().includes('vrv') ||
        item.specifications?.toLowerCase().includes('vrf')
      ).length;

      const chillerSystems = equipment.filter((item: any) => 
        item.model?.toLowerCase().includes('chiller') ||
        item.specifications?.toLowerCase().includes('chiller')
      ).length;

      return {
        totalCapacity: Math.round(totalCapacity),
        vrfSystems,
        chillerSystems,
        averageEfficiency: '> 6.5 SEER' // Based on typical high-efficiency equipment
      };
    } catch (error) {
      console.error('Error extracting technical metrics:', error);
      return {
        totalCapacity: 0,
        vrfSystems: 0,
        chillerSystems: 0,
        averageEfficiency: 'N/A'
      };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'approved':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'sent':
        return <Send className="w-5 h-5 text-cyan-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      default:
        return <FileText className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'sent':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'expired':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  // Rest of the functions remain the same...
  const updateQuotationStatus = async (quotationId: string, newStatus: string) => {
    console.log('📋 Quotations: Updating quotation status', { quotationId, newStatus });
    try {
      const updateData: any = { status: newStatus };
      
      const { error } = await supabase
        .from('quotations')
        .update(updateData)
        .eq('id', quotationId)
        .eq('user_id', user?.id);

      if (error) throw error;
      console.log('📋 Quotations: Status updated successfully, reloading quotations');
      await loadQuotations();
    } catch (error) {
      console.error('📋 Quotations: Error updating quotation status:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Status Update Error',
          message: `Failed to update quotation status: ${error.message}`,
          type: 'network'
        });
      }
    }
  };

  const deleteQuotation = async (quotationId: string) => {
    console.log('📋 Quotations: Starting delete for quotation:', quotationId);
    if (!window.confirm('Are you sure you want to delete this quotation?')) return;

    try {
      const { error } = await supabase
        .from('quotations')
        .delete()
        .eq('id', quotationId)
        .eq('user_id', user?.id);

      if (error) throw error;
      console.log('📋 Quotations: Delete successful, reloading quotations');
      await loadQuotations();
    } catch (error) {
      console.error('📋 Quotations: Error deleting quotation:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Quotation Delete Error',
          message: `Failed to delete quotation: ${error.message}`,
          type: 'network'
        });
      }
    }
  };

  const viewQuotationDetails = (quotation: Quotation) => {
    console.log('📋 Quotations: Opening quotation details for:', quotation.id);
    setSelectedQuotation(quotation);
    setShowDetails(true);
  };

  const handleViewHTML = (quotation: Quotation) => {
    console.log('📋 Quotations: Opening HTML view for quotation:', quotation.id);
    setSelectedQuotationForHTML(quotation);
    setShowHTMLModal(true);
  };

  const handleEditQuotation = (quotation: Quotation) => {
    console.log('📋 Quotations: Opening editor for quotation:', quotation.id);
    setSelectedQuotation(quotation);
    setShowEditModal(true);
  };

  const handleApproveQuotation = (quotation: Quotation) => {
    console.log('📋 Quotations: Opening approval modal for quotation:', quotation.id);
    setSelectedQuotation(quotation);
    setShowApprovalModal(true);
  };

  const handleSaveDraft = async (updatedData: any) => {
    console.log('📋 Quotations: Saving draft for quotation:', selectedQuotation?.id);
    if (!selectedQuotation) return;
    
    try {
      await saveDraft(selectedQuotation.id, updatedData);
      console.log('📋 Quotations: Draft saved successfully, reloading quotations');
      await loadQuotations();
    } catch (error) {
      console.error('📋 Quotations: Error saving draft:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Save Draft Error',
          message: `Failed to save draft: ${error.message}`,
          type: 'network'
        });
      }
    }
  };

  const handleConfirmApproval = async (quotationId: string) => {
    console.log('📋 Quotations: Confirming approval for quotation:', quotationId);
    try {
      await approveQuotation(quotationId, selectedQuotation?.analysis || {});
      console.log('📋 Quotations: Approval confirmed successfully, reloading quotations');
      await loadQuotations();
      setShowApprovalModal(false);
      setSelectedQuotation(null);
    } catch (error) {
      console.error('📋 Quotations: Error approving quotation:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Quotation Approval Error',
          message: `Failed to approve quotation: ${error.message}`,
          type: 'network'
        });
      }
    }
  };

  // Search and filter function
  const filteredQuotations = quotations.filter(quotation => {
    const clientInfo = extractClientInfo(quotation);
    
    const matchesSearch = 
      quotation.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientInfo.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientInfo.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl w-2/3 mb-8"></div>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
                <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-3/4 mb-4"></div>
                <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Statistics */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-3">
            Quotations
          </h1>
          <p className="text-xl text-slate-600 mb-6">Professional MEP quotations with advanced analytics</p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-4 border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-xl">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{quotations.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-4 border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700">Accepted</p>
                  <p className="text-2xl font-bold text-green-900">
                    {quotations.filter(q => q.status === 'accepted').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-violet-100 rounded-2xl p-4 border border-purple-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500 rounded-xl">
                  <Euro className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-700">Total Value</p>
                  <p className="text-2xl font-bold text-purple-900">
                    €{quotations.reduce((sum, q) => sum + q.total_amount, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-2xl p-4 border border-orange-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500 rounded-xl">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-700">Pending</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {quotations.filter(q => ['draft', 'sent'].includes(q.status)).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-slate-200/50">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search quotations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 text-base bg-white shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 bg-white shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Professional Quotations Grid */}
      <div className="space-y-6">
        {filteredQuotations.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl shadow-xl border-2 border-dashed border-slate-300 p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">No Quotations Found</h3>
            <p className="text-slate-600 text-lg">
              {statusFilter === 'all' && !searchTerm
                ? 'Process some RFQ emails to generate quotations' 
                : 'No quotations match your current filters'
              }
            </p>
          </div>
        ) : (
          filteredQuotations.map((quotation) => {
            const clientInfo = extractClientInfo(quotation);
            const projectSummary = extractProjectSummary(quotation);
            const equipmentInfo = extractEquipmentInfo(quotation);
            const technicalMetrics = extractTechnicalMetrics(quotation);
            
            return (
              <div key={quotation.id} className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                          {getStatusIcon(quotation.status)}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold">{quotation.quotation_number}</h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusColor(quotation.status)}`}>
                              {quotation.status.toUpperCase()}
                            </span>
                            <span className="text-blue-200 text-sm">
                              {format(new Date(quotation.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Project Title */}
                      {clientInfo.project_name && (
                        <h4 className="text-lg font-semibold text-blue-100 mb-2">
                          {clientInfo.project_name}
                        </h4>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => viewQuotationDetails(quotation)}
                        className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300 font-medium"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </button>

                      {quotation.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleEditQuotation(quotation)}
                            className="inline-flex items-center px-4 py-2 bg-blue-500/80 backdrop-blur-sm text-white rounded-xl hover:bg-blue-600/80 transition-all duration-300 font-medium"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleApproveQuotation(quotation)}
                            className="inline-flex items-center px-4 py-2 bg-green-500/80 backdrop-blur-sm text-white rounded-xl hover:bg-green-600/80 transition-all duration-300 font-medium"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Send
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Client Information */}
                  {(clientInfo.name || clientInfo.company) && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-200">
                      <h5 className="font-bold text-blue-900 mb-4 flex items-center">
                        <User className="w-5 h-5 mr-2" />
                        Client Information
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clientInfo.name && (
                          <div className="flex items-center space-x-3">
                            <User className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-xs font-medium text-blue-600">Contact</p>
                              <p className="font-semibold text-blue-900">{clientInfo.name}</p>
                            </div>
                          </div>
                        )}
                        {clientInfo.company && (
                          <div className="flex items-center space-x-3">
                            <Building className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-xs font-medium text-blue-600">Company</p>
                              <p className="font-semibold text-blue-900">{clientInfo.company}</p>
                            </div>
                          </div>
                        )}
                        {clientInfo.email && (
                          <div className="flex items-center space-x-3">
                            <Mail className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-xs font-medium text-blue-600">Email</p>
                              <p className="font-semibold text-blue-900">{clientInfo.email}</p>
                            </div>
                          </div>
                        )}
                        {clientInfo.location && (
                          <div className="flex items-center space-x-3">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-xs font-medium text-blue-600">Location</p>
                              <p className="font-semibold text-blue-900">{clientInfo.location}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-2xl border border-green-200">
                      <div className="flex items-center space-x-3">
                        <Euro className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="text-xs font-semibold text-green-600">Total Value</p>
                          <p className="text-xl font-bold text-green-900">
                            €{quotation.total_amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-2xl border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <Package className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="text-xs font-semibold text-blue-600">Equipment</p>
                          <p className="text-xl font-bold text-blue-900">
                            {equipmentInfo.total} items
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-2xl border border-purple-200">
                      <div className="flex items-center space-x-3">
                        <Zap className="w-6 h-6 text-purple-600" />
                        <div>
                          <p className="text-xs font-semibold text-purple-600">Capacity</p>
                          <p className="text-xl font-bold text-purple-900">
                            {technicalMetrics.totalCapacity}kW
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-200">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="w-6 h-6 text-orange-600" />
                        <div>
                          <p className="text-xs font-semibold text-orange-600">Complexity</p>
                          <p className="text-xl font-bold text-orange-900 capitalize">
                            {projectSummary.system_complexity}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Equipment Breakdown */}
                  {equipmentInfo.total > 0 && (
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200">
                      <h5 className="font-bold text-slate-900 mb-4 flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        System Overview
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                            <Activity className="w-6 h-6 text-white" />
                          </div>
                          <p className="text-2xl font-bold text-slate-900">{equipmentInfo.hvac}</p>
                          <p className="text-xs text-slate-600">HVAC Systems</p>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                            <Activity className="w-6 h-6 text-white" />
                          </div>
                          <p className="text-2xl font-bold text-slate-900">{equipmentInfo.ventilation}</p>
                          <p className="text-xs text-slate-600">Ventilation</p>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                            <Package className="w-6 h-6 text-white" />
                          </div>
                          <p className="text-2xl font-bold text-slate-900">{equipmentInfo.materials}</p>
                          <p className="text-xs text-slate-600">Materials & Services</p>
                        </div>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-2">
                            <Briefcase className="w-6 h-6 text-white" />
                          </div>
                          <p className="text-2xl font-bold text-slate-900">{technicalMetrics.vrfSystems + technicalMetrics.chillerSystems}</p>
                          <p className="text-xs text-slate-600">Major Systems</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Keep all existing modals */}
      {showDetails && selectedQuotation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-8 border-b border-slate-200">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  {selectedQuotation.quotation_number}
                </h2>
                <p className="text-slate-600 mt-2">Detailed Quotation Information</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2"
              >
                <XCircle className="w-8 h-8" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Enhanced Client Details */}
              {(() => {
                const clientInfo = extractClientInfo(selectedQuotation);
                return (clientInfo.name || clientInfo.email || clientInfo.company) && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-200">
                    <h3 className="text-2xl font-bold text-blue-900 mb-6 flex items-center">
                      <User className="w-6 h-6 mr-3" />
                      Client Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-semibold text-blue-600 mb-2">Contact Name</p>
                        <p className="font-bold text-blue-900">{clientInfo.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-600 mb-2">Company</p>
                        <p className="font-bold text-blue-900">{clientInfo.company || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-600 mb-2">Email Address</p>
                        <p className="font-bold text-blue-900">{clientInfo.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-blue-600 mb-2">Project Name</p>
                        <p className="font-bold text-blue-900">{clientInfo.project_name || 'N/A'}</p>
                      </div>
                      {clientInfo.location && (
                        <div>
                          <p className="text-sm font-semibold text-blue-600 mb-2">Location</p>
                          <p className="font-bold text-blue-900">{clientInfo.location}</p>
                        </div>
                      )}
                      {clientInfo.building_type && (
                        <div>
                          <p className="text-sm font-semibold text-blue-600 mb-2">Building Type</p>
                          <p className="font-bold text-blue-900 capitalize">{clientInfo.building_type.replace('_', ' ')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Enhanced Equipment Display */}
              {(() => {
                const equipmentInfo = extractEquipmentInfo(selectedQuotation);
                return equipmentInfo.equipment.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 border-b border-slate-200">
                      <h3 className="text-2xl font-bold text-slate-900 flex items-center">
                        <Package className="w-6 h-6 mr-3" />
                        Equipment & Services ({equipmentInfo.total} items)
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Equipment</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-slate-700">Specifications</th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-slate-700">Qty</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-slate-700">Unit Price</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-slate-700">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {equipmentInfo.equipment.map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {item.brand} {item.model}
                                  </p>
                                  <p className="text-sm text-slate-600 capitalize">
                                    {item.category?.replace('_', ' ')} • {item.ai_specialization?.replace('_', ' ')}
                                  </p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-slate-700">{item.specifications || item.description || 'Standard specifications'}</p>
                                {item.power_kw && (
                                  <p className="text-xs text-blue-600 font-medium">{item.power_kw}kW Power</p>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center font-semibold text-slate-900">
                                {item.quantity || 1}
                              </td>
                              <td className="px-6 py-4 text-right font-semibold text-slate-900">
                                €{(item.unit_price || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900">
                                €{(item.total_price || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gradient-to-r from-green-50 to-emerald-50">
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-right font-bold text-green-900 text-lg">
                              Total Project Value:
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-green-900 text-2xl">
                              €{selectedQuotation.total_amount.toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      
      {/* Keep existing modals */}
      <HTMLQuotationModal
        isOpen={showHTMLModal}
        onClose={() => {
          setShowHTMLModal(false);
          setSelectedQuotationForHTML(null);
        }}
        htmlContent={selectedQuotationForHTML?.html_quotation || ''}
        quotationNumber={selectedQuotationForHTML?.quotation_number || ''}
      />
      
      <QuotationEditorModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedQuotation(null);
        }}
        quotationData={selectedQuotation}
        onSave={handleSaveDraft}
        onApprove={async (quotationId, updatedData) => {
          await approveQuotation(quotationId, updatedData);
          await loadQuotations();
          setShowEditModal(false);
          setSelectedQuotation(null);
        }}
      />
      
      <QuotationApprovalModal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedQuotation(null);
        }}
        quotationData={selectedQuotation}
        onConfirm={handleConfirmApproval}
      />
    </div>
  );
}