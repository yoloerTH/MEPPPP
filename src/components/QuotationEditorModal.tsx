import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Send, 
  Calculator, 
  User, 
  Building, 
  Mail, 
  Phone, 
  MapPin,
  Plus,
  Minus,
  Edit3,
  DollarSign,
  Package,
  CheckCircle,
  Search,
  Filter,
  Zap,
  Activity,
  Settings,
  Trash2,
  Copy,
  TrendingUp,
  Eye,
  Database,
  Wrench,
  Fan,
  Briefcase
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface EquipmentItem {
  id: string;
  brand: string;
  model: string;
  category: string;
  type: string;
  power_kw: number;
  price_eur: number;
  description: string;
  specifications: any;
  in_stock: boolean;
}

interface QuotationItem {
  id?: string;
  equipment_id?: string;
  brand: string;
  model: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  description: string;
  specifications?: any;
  ai_specialization?: string;
  power_kw?: number;
}

interface ClientDetails {
  name: string;
  company: string;
  email: string;
  phone?: string;
  address?: string;
  project_name: string;
  location?: string;
  building_type?: string;
}

interface QuotationData {
  id: string;
  quotation_number: string;
  analysis: any;
  total_amount: number;
  margin_percentage: number;
  status: string;
  client_details?: ClientDetails;
}

interface QuotationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationData: QuotationData | null;
  onSave: (updatedData: any) => Promise<void>;
  onApprove: (quotationId: string, updatedData: any) => Promise<void>;
}

export default function QuotationEditorModal({ 
  isOpen, 
  onClose, 
  quotationData, 
  onSave,
  onApprove 
}: QuotationEditorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const equipmentBrowserRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'equipment' | 'client' | 'pricing'>('equipment');
  const [equipmentCategory, setEquipmentCategory] = useState<'hvac' | 'ventilation' | 'materials' | 'all'>('all');
  const [editableItems, setEditableItems] = useState<QuotationItem[]>([]);
  const [clientDetails, setClientDetails] = useState<ClientDetails>({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    project_name: '',
    location: '',
    building_type: ''
  });
  const [marginPercentage, setMarginPercentage] = useState(25);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showEquipmentBrowser, setShowEquipmentBrowser] = useState(false);
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentItem[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  // Close main modal when clicking outside
  useOutsideClick(modalRef, onClose);
  
  // Close equipment browser when clicking outside
  useOutsideClick(equipmentBrowserRef, () => setShowEquipmentBrowser(false));

  useEffect(() => {
    if (isOpen && quotationData) {
      initializeData();
      loadEquipmentDatabase();
    }
  }, [isOpen, quotationData]);

  const initializeData = () => {
    if (!quotationData) return;

    try {
      // Parse analysis if it's a string
      let analysis = quotationData.analysis;
      if (typeof analysis === 'string') {
        analysis = JSON.parse(analysis);
      }

      // Initialize equipment items
      const equipment = analysis?.equipment || analysis?.equipment_selection || [];
      setEditableItems(equipment.map((item: any) => ({
        ...item,
        id: item.id || item.equipment_id || `temp-${Date.now()}-${Math.random()}`,
        power_kw: item.power_kw || 0
      })));

      // Initialize client details
      const projectId = analysis?.project_identification || {};
      const analysisClient = analysis?.client_details || {};
      const directClient = quotationData.client_details || {};

      setClientDetails({
        name: projectId.client_name || analysisClient.client_name || directClient.client_name || directClient.name || '',
        company: projectId.client_company || analysisClient.client_company || directClient.client_company || directClient.company || '',
        email: projectId.client_email || analysisClient.client_email || directClient.client_email || directClient.email || '',
        phone: analysisClient.phone || directClient.phone || '',
        address: analysisClient.address || directClient.address || '',
        project_name: projectId.project_name || analysisClient.project_name || directClient.project_name || '',
        location: projectId.location || analysisClient.location || directClient.location || '',
        building_type: projectId.building_type || analysisClient.building_type || directClient.building_type || ''
      });

      setMarginPercentage(quotationData.margin_percentage || 25);
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  };

  const loadEquipmentDatabase = async () => {
    setLoadingEquipment(true);
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('in_stock', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setAvailableEquipment(data || []);
    } catch (error) {
      console.error('Error loading equipment database:', error);
    } finally {
      setLoadingEquipment(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = editableItems.reduce((sum, item) => sum + item.total_price, 0);
    const marginAmount = (subtotal * marginPercentage) / 100;
    const total = subtotal + marginAmount;
    
    return { subtotal, marginAmount, total };
  };

  const getEquipmentByCategory = () => {
    if (equipmentCategory === 'all') return editableItems;
    
    return editableItems.filter(item => {
      switch (equipmentCategory) {
        case 'hvac':
          return item.ai_specialization === 'primary_hvac' || 
                 item.category?.toLowerCase().includes('air_conditioning') ||
                 item.category?.toLowerCase().includes('plumbing');
        case 'ventilation':
          return item.ai_specialization === 'ventilation_auxiliary' ||
                 item.model?.toLowerCase().includes('ahu') ||
                 item.model?.toLowerCase().includes('fan');
        case 'materials':
          return item.ai_specialization === 'materials' || 
                 item.ai_specialization === 'services' ||
                 item.category?.toLowerCase().includes('materials') ||
                 item.category?.toLowerCase().includes('services');
        default:
          return true;
      }
    });
  };

  const getFilteredEquipmentDatabase = () => {
    let filtered = availableEquipment;

    // Filter by category
    if (equipmentCategory !== 'all') {
      filtered = filtered.filter(item => {
        switch (equipmentCategory) {
          case 'hvac':
            return item.category?.toLowerCase() === 'air_conditioning' && 
                   ['outdoor', 'cassette', 'wall', 'ducted', 'precision'].includes(item.type?.toLowerCase()) ||
                   item.category?.toLowerCase() === 'plumbing' && 
                   ['air_cooled'].includes(item.type?.toLowerCase());
          case 'ventilation':
            return item.category?.toLowerCase() === 'air_conditioning' && 
                   ['supply', 'exhaust', 'smoke_extract', 'dehumidifier', '400v/3ph/50hz'].includes(item.type?.toLowerCase()) ||
                   item.category?.toLowerCase() === 'heating';
          case 'materials':
            return ['materials', 'services', 'hot_water'].includes(item.category?.toLowerCase()) ||
                   (item.category?.toLowerCase() === 'plumbing' && item.type === '');
          default:
            return true;
        }
      });
    }

    // Filter by search term
    if (equipmentSearch) {
      filtered = filtered.filter(item =>
        item.brand?.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        item.model?.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
        item.description?.toLowerCase().includes(equipmentSearch.toLowerCase())
      );
    }

    return filtered;
  };

  const addEquipmentFromDatabase = (equipment: EquipmentItem) => {
    const newItem: QuotationItem = {
      id: `selected-${Date.now()}-${equipment.id}`,
      equipment_id: equipment.id,
      brand: equipment.brand,
      model: equipment.model,
      category: equipment.category,
      quantity: 1,
      unit_price: equipment.price_eur,
      total_price: equipment.price_eur,
      description: equipment.description,
      specifications: equipment.specifications,
      power_kw: equipment.power_kw,
      ai_specialization: getCategorySpecialization(equipment)
    };
    setEditableItems(prev => [...prev, newItem]);
    setShowEquipmentBrowser(false);
  };

  const getCategorySpecialization = (equipment: EquipmentItem): string => {
    if (equipment.category?.toLowerCase() === 'air_conditioning' && 
        ['outdoor', 'cassette', 'wall', 'ducted', 'precision'].includes(equipment.type?.toLowerCase())) {
      return 'primary_hvac';
    }
    if (equipment.category?.toLowerCase() === 'plumbing' && 
        ['air_cooled'].includes(equipment.type?.toLowerCase())) {
      return 'primary_hvac';
    }
    if (['materials', 'services', 'hot_water'].includes(equipment.category?.toLowerCase())) {
      return 'materials';
    }
    return 'ventilation_auxiliary';
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setEditableItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newTotalPrice = quantity * item.unit_price;
        return { ...item, quantity, total_price: newTotalPrice };
      }
      return item;
    }));
  };

  const updateItemPrice = (itemId: string, unitPrice: number) => {
    setEditableItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newTotalPrice = item.quantity * unitPrice;
        return { ...item, unit_price: unitPrice, total_price: newTotalPrice };
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setEditableItems(prev => prev.filter(item => item.id !== itemId));
  };

  const duplicateItem = (itemId: string) => {
    const item = editableItems.find(i => i.id === itemId);
    if (item) {
      const duplicatedItem = {
        ...item,
        id: `duplicate-${Date.now()}-${Math.random()}`
      };
      setEditableItems(prev => [...prev, duplicatedItem]);
    }
  };

  const handleSaveDraft = async () => {
    if (!quotationData) return;

    setSaving(true);
    try {
      const { total } = calculateTotals();
      
      const updatedAnalysis = {
        ...quotationData.analysis,
        equipment: editableItems,
        project_identification: {
          client_name: clientDetails.name,
          client_company: clientDetails.company,
          client_email: clientDetails.email,
          project_name: clientDetails.project_name,
          location: clientDetails.location,
          building_type: clientDetails.building_type
        },
        pricing: {
          margin_percentage: marginPercentage,
          grand_total: total
        }
      };

      await onSave({
        analysis: updatedAnalysis,
        total_amount: total,
        margin_percentage: marginPercentage,
        client_details: clientDetails
      });

    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!quotationData) return;

    setApproving(true);
    try {
      const { total } = calculateTotals();
      
      const updatedAnalysis = {
        ...quotationData.analysis,
        equipment: editableItems,
        project_identification: {
          client_name: clientDetails.name,
          client_company: clientDetails.company,
          client_email: clientDetails.email,
          project_name: clientDetails.project_name,
          location: clientDetails.location,
          building_type: clientDetails.building_type
        },
        pricing: {
          margin_percentage: marginPercentage,
          grand_total: total
        }
      };

      await onApprove(quotationData.id, updatedAnalysis);
      onClose();
    } catch (error) {
      console.error('Error approving quotation:', error);
    } finally {
      setApproving(false);
    }
  };

  if (!isOpen || !quotationData) return null;

  const { subtotal, marginAmount, total } = calculateTotals();
  const categoryEquipment = getEquipmentByCategory();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Professional Quotation Editor</h2>
              <p className="text-blue-200 mt-1">{quotationData.quotation_number}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-3 hover:bg-white/10 rounded-2xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('equipment')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'equipment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Package className="w-5 h-5 inline mr-2" />
              Equipment & Systems
            </button>
            <button
              onClick={() => setActiveTab('client')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'client'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-5 h-5 inline mr-2" />
              Client Details
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'pricing'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calculator className="w-5 h-5 inline mr-2" />
              Pricing & Summary
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Equipment Tab */}
          {activeTab === 'equipment' && (
            <div className="space-y-6">
              {/* Equipment Category Filters */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-xl font-bold text-slate-900">Equipment Selection</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEquipmentCategory('all')}
                      className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                        equipmentCategory === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All ({editableItems.length})
                    </button>
                    <button
                      onClick={() => setEquipmentCategory('hvac')}
                      className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center ${
                        equipmentCategory === 'hvac'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      HVAC ({editableItems.filter(i => i.ai_specialization === 'primary_hvac').length})
                    </button>
                    <button
                      onClick={() => setEquipmentCategory('ventilation')}
                      className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center ${
                        equipmentCategory === 'ventilation'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Fan className="w-4 h-4 mr-2" />
                      Ventilation ({editableItems.filter(i => i.ai_specialization === 'ventilation_auxiliary').length})
                    </button>
                    <button
                      onClick={() => setEquipmentCategory('materials')}
                      className={`px-4 py-2 rounded-xl font-medium transition-colors flex items-center ${
                        equipmentCategory === 'materials'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Materials & Services ({editableItems.filter(i => ['materials', 'services'].includes(i.ai_specialization)).length})
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowEquipmentBrowser(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center"
                >
                  <Database className="w-5 h-5 mr-2" />
                  Add Equipment
                </button>
              </div>

              {/* Equipment List */}
              <div className="space-y-4">
                {categoryEquipment.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-12 text-center">
                    <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Equipment in This Category</h3>
                    <p className="text-slate-500 mb-6">Add equipment from the database to get started</p>
                    <button
                      onClick={() => setShowEquipmentBrowser(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                      Browse Equipment Database
                    </button>
                  </div>
                ) : (
                  categoryEquipment.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Equipment Info */}
                        <div className="lg:col-span-5">
                          <div className="flex items-start space-x-4">
                            <div className={`p-3 rounded-2xl ${
                              item.ai_specialization === 'primary_hvac' ? 'bg-blue-100' :
                              item.ai_specialization === 'ventilation_auxiliary' ? 'bg-green-100' :
                              'bg-purple-100'
                            }`}>
                              {item.ai_specialization === 'primary_hvac' ? (
                                <Activity className={`w-6 h-6 ${
                                  item.ai_specialization === 'primary_hvac' ? 'text-blue-600' : ''
                                }`} />
                              ) : item.ai_specialization === 'ventilation_auxiliary' ? (
                                <Fan className="w-6 h-6 text-green-600" />
                              ) : (
                                <Briefcase className="w-6 h-6 text-purple-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900">{item.brand} {item.model}</h4>
                              <p className="text-sm text-slate-600 capitalize">{item.category?.replace('_', ' ')}</p>
                              {item.power_kw > 0 && (
                                <div className="flex items-center space-x-2 mt-1">
                                  <Zap className="w-4 h-4 text-yellow-600" />
                                  <span className="text-sm font-medium text-yellow-700">{item.power_kw}kW</span>
                                </div>
                              )}
                              {item.specifications && (
                                <p className="text-xs text-slate-500 mt-1">{item.specifications}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quantity */}
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id!, parseInt(e.target.value) || 1)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Unit Price (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItemPrice(item.id!, parseFloat(e.target.value) || 0)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Total Price */}
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Total (€)</label>
                          <div className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900">
                            €{item.total_price.toLocaleString()}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="lg:col-span-1">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => duplicateItem(item.id!)}
                              className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors"
                              title="Duplicate Item"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeItem(item.id!)}
                              className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition-colors"
                              title="Remove Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Client Details Tab */}
          {activeTab === 'client' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-200">
              <h3 className="text-2xl font-bold text-blue-900 mb-8 flex items-center">
                <User className="w-6 h-6 mr-3" />
                Client & Project Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-semibold text-blue-800 mb-3">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={clientDetails.name}
                    onChange={(e) => setClientDetails(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-blue-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-800 mb-3">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={clientDetails.company}
                    onChange={(e) => setClientDetails(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full border border-blue-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="ABC Construction Ltd"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-800 mb-3">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={clientDetails.email}
                    onChange={(e) => setClientDetails(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-blue-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="john@abcconstruction.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-800 mb-3">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={clientDetails.phone}
                    onChange={(e) => setClientDetails(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-blue-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="+357 12 345 678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-800 mb-3">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={clientDetails.project_name}
                    onChange={(e) => setClientDetails(prev => ({ ...prev, project_name: e.target.value }))}
                    className="w-full border border-blue-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="Office Building HVAC Installation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-blue-800 mb-3">
                    Project Location
                  </label>
                  <input
                    type="text"
                    value={clientDetails.location}
                    onChange={(e) => setClientDetails(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full border border-blue-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="Limassol, Cyprus"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-blue-800 mb-3">
                    Building Type
                  </label>
                  <select
                    value={clientDetails.building_type}
                    onChange={(e) => setClientDetails(prev => ({ ...prev, building_type: e.target.value }))}
                    className="w-full border border-blue-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                  >
                    <option value="">Select building type</option>
                    <option value="commercial">Commercial</option>
                    <option value="residential">Residential</option>
                    <option value="industrial">Industrial</option>
                    <option value="hospitality">Hospitality</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="educational">Educational</option>
                    <option value="retail">Retail</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === 'pricing' && (
            <div className="space-y-8">
              {/* Pricing Summary */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-3xl p-8 border border-purple-200">
                <h3 className="text-2xl font-bold text-purple-900 mb-8 flex items-center">
                  <Calculator className="w-6 h-6 mr-3" />
                  Pricing Summary & Margins
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 border border-purple-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <Package className="w-6 h-6 text-purple-600" />
                        <span className="text-purple-800 font-medium">Equipment Subtotal</span>
                      </div>
                      <p className="text-3xl font-bold text-purple-900">€{subtotal.toLocaleString()}</p>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-6 border border-purple-200">
                      <div className="flex items-center space-x-3 mb-3">
                        <TrendingUp className="w-6 h-6 text-purple-600" />
                        <span className="text-purple-800 font-medium">Profit Margin</span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={marginPercentage}
                            onChange={(e) => setMarginPercentage(parseFloat(e.target.value) || 0)}
                            className="w-16 border border-purple-300 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-purple-800 text-sm">%</span>
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-purple-900">€{marginAmount.toLocaleString()}</p>
                    </div>
                    
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
                      <div className="flex items-center space-x-3 mb-3">
                        <DollarSign className="w-6 h-6 text-white" />
                        <span className="text-green-100 font-medium">Total Project Value</span>
                      </div>
                      <p className="text-3xl font-bold text-white">€{total.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Project Statistics */}
                  <div className="bg-white rounded-2xl p-6 border border-purple-200">
                    <h4 className="font-bold text-purple-900 mb-4">Project Statistics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-slate-900">{editableItems.length}</p>
                        <p className="text-sm text-slate-600">Total Items</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-900">
                          {editableItems.filter(i => i.ai_specialization === 'primary_hvac').length}
                        </p>
                        <p className="text-sm text-slate-600">HVAC Systems</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-900">
                          {editableItems.filter(i => i.ai_specialization === 'ventilation_auxiliary').length}
                        </p>
                        <p className="text-sm text-slate-600">Ventilation</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-900">
                          {editableItems.filter(i => ['materials', 'services'].includes(i.ai_specialization)).length}
                        </p>
                        <p className="text-sm text-slate-600">Materials & Services</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-8 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-8 py-3 bg-slate-200 text-slate-800 rounded-xl hover:bg-slate-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-3" />
                  Save Draft
                </>
              )}
            </button>
            <button
              onClick={handleApproveAndSend}
              disabled={approving || !clientDetails.name || !clientDetails.email || editableItems.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 font-medium flex items-center"
            >
              {approving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Approving...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-3" />
                  Approve & Send
                </>
              )}
            </button>
          </div>
        </div>

        {/* Equipment Browser Modal */}
        {showEquipmentBrowser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div ref={equipmentBrowserRef} className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">Equipment Database</h3>
                    <p className="text-blue-200 mt-1">Browse and select from {availableEquipment.length} available items</p>
                  </div>
                  <button
                    onClick={() => setShowEquipmentBrowser(false)}
                    className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Search and Filter */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search equipment..."
                      value={equipmentSearch}
                      onChange={(e) => setEquipmentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEquipmentCategory('all')}
                      className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                        equipmentCategory === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setEquipmentCategory('hvac')}
                      className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                        equipmentCategory === 'hvac'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      HVAC
                    </button>
                    <button
                      onClick={() => setEquipmentCategory('ventilation')}
                      className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                        equipmentCategory === 'ventilation'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Ventilation
                    </button>
                    <button
                      onClick={() => setEquipmentCategory('materials')}
                      className={`px-4 py-3 rounded-xl font-medium transition-colors ${
                        equipmentCategory === 'materials'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Materials
                    </button>
                  </div>
                </div>

                {/* Equipment Grid */}
                <div className="max-h-96 overflow-y-auto">
                  {loadingEquipment ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="text-slate-600 mt-4">Loading equipment database...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {getFilteredEquipmentDatabase().map((equipment) => (
                        <div key={equipment.id} className="bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-900">{equipment.brand} {equipment.model}</h4>
                              <p className="text-sm text-slate-600 capitalize">{equipment.category?.replace('_', ' ')}</p>
                              {equipment.power_kw > 0 && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <Zap className="w-3 h-3 text-yellow-600" />
                                  <span className="text-xs font-medium text-yellow-700">{equipment.power_kw}kW</span>
                                </div>
                              )}
                            </div>
                            <span className="text-green-600 font-bold">€{equipment.price_eur.toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">{equipment.description}</p>
                          <button
                            onClick={() => addEquipmentFromDatabase(equipment)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-medium transition-colors"
                          >
                            Add to Quotation
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}