import React, { useEffect, useState, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Upload,
  Search, 
  Filter,
  Edit,
  Trash2,
  Zap,
  Thermometer,
  Droplets,
  Settings as SettingsIcon,
  Euro,
  Save,
  X,
  Check,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Home,
  Factory,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import EquipmentImportModal from '../components/EquipmentImportModal';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface Equipment {
  id: string;
  brand: string;
  model: string;
  category: 'air_conditioning' | 'heating' | 'plumbing' | 'materials' | 'services' | 'hot_water';
  power_kw?: number;
  price_eur: number;
  description?: string;
  specifications: any;
  in_stock: boolean;
  created_at: string;
  user_id: string;
}

const categoryIcons = {
  air_conditioning: Thermometer,
  heating: Zap,
  plumbing: Droplets,
  materials: Package,
  services: Wrench,
  hot_water: Factory
};

const categoryColors = {
  air_conditioning: 'bg-blue-100 text-blue-800 border-blue-200',
  heating: 'bg-red-100 text-red-800 border-red-200',
  plumbing: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  materials: 'bg-green-100 text-green-800 border-green-200',
  services: 'bg-purple-100 text-purple-800 border-purple-200',
  hot_water: 'bg-orange-100 text-orange-800 border-orange-200'
};

const categoryOptions = [
  { value: 'air_conditioning', label: 'Air Conditioning' },
  { value: 'heating', label: 'Heating' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'materials', label: 'Materials' },
  { value: 'services', label: 'Services' },
  { value: 'hot_water', label: 'Hot Water' }
];

interface EquipmentProps {
  onGlobalError?: (error: { title: string; message: string; type?: 'error' | 'timeout' | 'network' }) => void;
}

export default function Equipment({ onGlobalError }: EquipmentProps) {
  const equipmentModalRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Equipment>>({
    brand: '',
    model: '',
    category: 'air_conditioning',
    power_kw: 0,
    price_eur: 0,
    description: '',
    specifications: {},
    in_stock: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    console.log('🔧 Equipment: Resetting form');
    setFormData({
      brand: '',
      model: '',
      category: 'air_conditioning',
      power_kw: 0,
      price_eur: 0,
      description: '',
      specifications: {},
      in_stock: true
    });
    setEditingItem(null);
    setShowAddModal(false);
    setFormErrors({});
    setError(null);
  };

  // Close equipment modal when clicking outside
  useOutsideClick(equipmentModalRef, resetForm);

  useEffect(() => {
    console.log('🔧 Equipment: Component mounted/user changed', { hasUser: !!user, userId: user?.id });
    if (user) {
      loadEquipment();
      const cleanup = setupRealtimeSubscription();
      return cleanup;
    }
  }, [user]);

  const loadEquipment = async () => {
    console.log('🔧 Equipment: Starting loadEquipment');
    if (!user) return;
    
    try {
      console.log('🔧 Equipment: Fetching equipment for user:', user.id);
      setError(null);
      
      // First try with RLS
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('user_id', user.id)
        .order('category', { ascending: true })
        .order('brand', { ascending: true });

      if (error) {
        console.error('🔧 Equipment: Query error (possibly RLS):', error);
        
        // If RLS error, try with service role access
        if (error.code === 'PGRST116' || error.message.includes('RLS')) {
          console.log('🔧 Equipment: RLS issue detected, attempting fallback query');
          
          // Alternative query approach for RLS issues
          const { data: equipmentData, error: serviceError } = await supabase
            .from('equipment')
            .select('*')
            .order('category', { ascending: true })
            .order('brand', { ascending: true });

          if (serviceError) throw serviceError;
          
          // Filter client-side if RLS isn't working properly
          const userEquipment = (equipmentData || []).filter(item => item.user_id === user.id);
          console.log('🔧 Equipment: Fallback query successful, filtered to user equipment:', userEquipment.length);
          setEquipment(userEquipment);
        } else {
          throw error;
        }
      } else {
        console.log('🔧 Equipment: Query successful, equipment loaded:', data?.length || 0);
        setEquipment(data || []);
      }
    } catch (error: any) {
      console.error('🔧 Equipment: Error loading equipment:', error);
      setError(`Failed to load equipment: ${error.message}`);
      if (onGlobalError) {
        onGlobalError({
          title: 'Equipment Loading Error',
          message: `Failed to load equipment: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      console.log('🔧 Equipment: Setting loading to false');
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    console.log('🔧 Equipment: Setting up realtime subscription for user:', user?.id);
    if (!user) return;

    const channel = supabase
      .channel('user_equipment_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
          filter: `user_id=eq.${user.id}` // Filter by user_id in real-time
        },
        (payload) => {
          console.log('🔧 Equipment: Realtime change received:', payload);
          loadEquipment(); // Reload equipment on any change
        }
      )
      .subscribe();

    return () => {
      console.log('🔧 Equipment: Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.brand?.trim()) {
      errors.brand = 'Brand is required';
    }

    if (!formData.model?.trim()) {
      errors.model = 'Model is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    if (!formData.price_eur || formData.price_eur <= 0) {
      errors.price_eur = 'Price must be greater than 0';
    }

    if (formData.power_kw && formData.power_kw < 0) {
      errors.power_kw = 'Power cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔧 Equipment: Starting form submission');
    if (!user || !validateForm()) return;

    setOperationLoading(true);
    setError(null);

    try {
      console.log('🔧 Equipment: Processing form data');
      // Process specifications
      let processedSpecs = {};
      if (formData.specifications) {
        if (typeof formData.specifications === 'string') {
          try {
            processedSpecs = JSON.parse(formData.specifications);
          } catch {
            processedSpecs = {};
          }
        } else {
          processedSpecs = formData.specifications;
        }
      }

      const equipmentData = {
        brand: formData.brand?.trim(),
        model: formData.model?.trim(),
        category: formData.category,
        power_kw: formData.power_kw || null,
        price_eur: formData.price_eur,
        description: formData.description?.trim() || null,
        specifications: processedSpecs,
        in_stock: formData.in_stock ?? true,
        user_id: user.id
      };

      if (editingItem) {
        console.log('🔧 Equipment: Updating existing equipment:', editingItem.id);
        const { error } = await supabase
          .from('equipment')
          .update(equipmentData)
          .eq('id', editingItem.id)
          .eq('user_id', user.id); // Ensure user can only update their own equipment
        
        if (error) throw error;
        console.log('🔧 Equipment: Equipment updated successfully');
      } else {
        console.log('🔧 Equipment: Creating new equipment');
        const { error } = await supabase
          .from('equipment')
          .insert([equipmentData]);
        
        if (error) throw error;
        console.log('🔧 Equipment: Equipment created successfully');
      }

      console.log('🔧 Equipment: Reloading equipment list');
      await loadEquipment();
      resetForm();
    } catch (error: any) {
      console.error('🔧 Equipment: Error saving equipment:', error);
      setError(`Failed to save equipment: ${error.message}`);
      if (onGlobalError) {
        onGlobalError({
          title: 'Equipment Save Error',
          message: `Failed to save equipment: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      console.log('🔧 Equipment: Setting operationLoading to false');
      setOperationLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    console.log('🔧 Equipment: Starting delete for ID:', id);
    if (!window.confirm('Are you sure you want to delete this equipment?')) return;

    setOperationLoading(true);
    setError(null);

    try {
      console.log('🔧 Equipment: Attempting Supabase delete');
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id); // Ensure user can only delete their own equipment

      if (error) throw error;
      console.log('🔧 Equipment: Delete successful, reloading equipment');
      await loadEquipment();
    } catch (error: any) {
      console.error('🔧 Equipment: Error deleting equipment:', error);
      setError(`Failed to delete equipment: ${error.message}`);
      if (onGlobalError) {
        onGlobalError({
          title: 'Equipment Delete Error',
          message: `Failed to delete equipment: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      console.log('🔧 Equipment: Setting operationLoading to false after delete');
      setOperationLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    console.log('🔧 Equipment: Starting bulk delete for items:', selectedItems.length);
    if (selectedItems.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedItems.length} selected items?`)) return;

    setOperationLoading(true);
    setError(null);

    try {
      console.log('🔧 Equipment: Attempting bulk Supabase delete');
      const { error } = await supabase
        .from('equipment')
        .delete()
        .in('id', selectedItems)
        .eq('user_id', user?.id); // Ensure user can only delete their own equipment

      if (error) throw error;
      console.log('🔧 Equipment: Bulk delete successful, reloading equipment');
      await loadEquipment();
      setSelectedItems([]);
    } catch (error: any) {
      console.error('🔧 Equipment: Error in bulk delete:', error);
      setError(`Failed to delete selected equipment: ${error.message}`);
      if (onGlobalError) {
        onGlobalError({
          title: 'Bulk Delete Error',
          message: `Failed to delete selected equipment: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      console.log('🔧 Equipment: Setting operationLoading to false after bulk delete');
      setOperationLoading(false);
    }
  };

  const toggleStock = async (id: string, currentStatus: boolean) => {
    console.log('🔧 Equipment: Toggling stock status for ID:', id, 'current status:', currentStatus);
    setError(null);

    try {
      const { error } = await supabase
        .from('equipment')
        .update({ in_stock: !currentStatus })
        .eq('id', id)
        .eq('user_id', user?.id); // Ensure user can only update their own equipment

      if (error) throw error;
      console.log('🔧 Equipment: Stock status updated successfully');
      await loadEquipment();
    } catch (error: any) {
      console.error('🔧 Equipment: Error updating stock status:', error);
      setError(`Failed to update stock status: ${error.message}`);
      if (onGlobalError) {
        onGlobalError({
          title: 'Stock Update Error',
          message: `Failed to update stock status: ${error.message}`,
          type: 'network'
        });
      }
    }
  };

  const startEditing = (item: Equipment) => {
    console.log('🔧 Equipment: Starting edit for item:', item.id);
    setEditingItem(item);
    setFormData({
      ...item,
      specifications: typeof item.specifications === 'object' 
        ? JSON.stringify(item.specifications, null, 2)
        : item.specifications
    });
    setShowAddModal(true);
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStock = stockFilter === 'all' || 
                        (stockFilter === 'in_stock' && item.in_stock) ||
                        (stockFilter === 'out_of_stock' && !item.in_stock);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Package;
    return <IconComponent className="w-5 h-5" />;
  };

  // Group equipment by category
  const groupedEquipment = filteredEquipment.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Equipment[]>);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-xl">
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
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Enhanced Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Equipment Database
          </h1>
          <p className="text-xl text-slate-600 mt-2">Manage your MEP equipment inventory and pricing</p>
          <div className="flex items-center space-x-4 mt-4">
            <div className="text-sm text-slate-500">
              <span className="font-semibold">{filteredEquipment.length}</span> items total
            </div>
            <div className="flex space-x-2">
              {categoryOptions.map(category => {
                const count = equipment.filter(e => e.category === category.value).length;
                return count > 0 && (
                  <span key={category.value} className={`px-2 py-1 text-xs font-bold rounded-full ${categoryColors[category.value as keyof typeof categoryColors]}`}>
                    {count} {category.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          {selectedItems.length > 0 && (
            <button 
              onClick={handleBulkDelete}
              disabled={operationLoading}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-2xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 shadow-xl hover:shadow-2xl font-semibold disabled:opacity-50"
            >
              {operationLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5 mr-2" />
              )}
              Delete Selected ({selectedItems.length})
            </button>
          )}
          <button 
            onClick={() => setShowImportModal(true)}
            disabled={operationLoading}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-2xl hover:from-purple-700 hover:to-violet-700 transition-all duration-300 shadow-xl hover:shadow-2xl font-semibold disabled:opacity-50"
          >
            <Upload className="w-6 h-6 mr-3" />
            Import Equipment
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            disabled={operationLoading}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl font-semibold disabled:opacity-50"
          >
            <Plus className="w-6 h-6 mr-3" />
            Add Equipment
          </button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-slate-200/50">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-6 h-6 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search equipment by brand, model, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 border border-slate-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 text-lg bg-white shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <Filter className="w-6 h-6 text-slate-400" />
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 bg-white shadow-sm"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 bg-white shadow-sm"
            >
              <option value="all">All Stock Status</option>
              <option value="in_stock">In Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Equipment by Category */}
      <div className="space-y-8">
        {Object.keys(groupedEquipment).length === 0 ? (
          <div className="col-span-full bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl shadow-xl border-2 border-dashed border-slate-300 p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">No Equipment Found</h3>
            <p className="text-slate-600 text-lg mb-8">
              {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Start building your equipment database'
              }
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={operationLoading}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold disabled:opacity-50"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add First Equipment
            </button>
          </div>
        ) : (
          Object.entries(groupedEquipment).map(([category, items]) => (
            <div key={category} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              {/* Category Header */}
              <div className={`p-6 border-b border-slate-200 ${categoryColors[category as keyof typeof categoryColors]} bg-gradient-to-r`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                      {getCategoryIcon(category)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold capitalize">
                        {category.replace('_', ' ')}
                      </h2>
                      <p className="opacity-80 font-medium">{items.length} items</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipment Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item) => (
                    <div key={item.id} className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-all duration-300 group">
                      {/* Selection Checkbox */}
                      <div className="flex items-start justify-between mb-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems([...selectedItems, item.id]);
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== item.id));
                            }
                          }}
                          className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-blue-500"
                        />
                        
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => startEditing(item)}
                            disabled={operationLoading}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 disabled:opacity-50"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            disabled={operationLoading}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Equipment Info */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">{item.brand}</h3>
                          <p className="text-slate-600 font-medium">{item.model}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white rounded-lg p-3 border border-slate-200">
                            <div className="flex items-center text-sm font-medium text-slate-600 mb-1">
                              <Euro className="w-4 h-4 mr-1" />
                              Price
                            </div>
                            <p className="text-lg font-bold text-slate-900">
                              €{item.price_eur.toLocaleString()}
                            </p>
                          </div>

                          {item.power_kw && (
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="flex items-center text-sm font-medium text-slate-600 mb-1">
                                <Zap className="w-4 h-4 mr-1" />
                                Power
                              </div>
                              <p className="text-lg font-bold text-slate-900">{item.power_kw} kW</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-600">Stock Status:</span>
                          <button
                            onClick={() => toggleStock(item.id, item.in_stock)}
                            disabled={operationLoading}
                            className={`px-3 py-1 text-xs font-bold rounded-full border transition-all duration-200 disabled:opacity-50 ${
                              item.in_stock 
                                ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200' 
                                : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                            }`}
                          >
                            {item.in_stock ? (
                              <span className="flex items-center">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                In Stock
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Out of Stock
                              </span>
                            )}
                          </button>
                        </div>

                        {item.description && (
                          <div className="pt-4 border-t border-slate-200">
                            <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                              {item.description}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div ref={equipmentModalRef} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-8 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingItem ? 'Edit Equipment' : 'Add Equipment'}
              </h2>
              <button
                onClick={resetForm}
                disabled={operationLoading}
                className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Brand *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 ${
                      formErrors.brand ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="Daikin, Mitsubishi, etc."
                    disabled={operationLoading}
                  />
                  {formErrors.brand && <p className="text-red-600 text-sm mt-1">{formErrors.brand}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Model *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.model || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 ${
                      formErrors.model ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="RXS25L2V1B"
                    disabled={operationLoading}
                  />
                  {formErrors.model && <p className="text-red-600 text-sm mt-1">{formErrors.model}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category || 'air_conditioning'}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                    className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 ${
                      formErrors.category ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    disabled={operationLoading}
                  >
                    {categoryOptions.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.category && <p className="text-red-600 text-sm mt-1">{formErrors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Power (kW)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.power_kw || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, power_kw: parseFloat(e.target.value) || undefined }))}
                    className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 ${
                      formErrors.power_kw ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="2.5"
                    disabled={operationLoading}
                  />
                  {formErrors.power_kw && <p className="text-red-600 text-sm mt-1">{formErrors.power_kw}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Price (EUR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.price_eur || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_eur: parseFloat(e.target.value) || 0 }))}
                    className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 ${
                      formErrors.price_eur ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="1250.00"
                    disabled={operationLoading}
                  />
                  {formErrors.price_eur && <p className="text-red-600 text-sm mt-1">{formErrors.price_eur}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                  placeholder="High-efficiency split system air conditioner"
                  disabled={operationLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Specifications (JSON format)
                </label>
                <textarea
                  rows={4}
                  value={typeof formData.specifications === 'string' ? formData.specifications : JSON.stringify(formData.specifications || {}, null, 2)}
                  onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 font-mono text-sm"
                  placeholder='{"cooling_capacity": "2.5kW", "energy_class": "A++"}'
                  disabled={operationLoading}
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="in_stock"
                  checked={formData.in_stock ?? true}
                  onChange={(e) => setFormData(prev => ({ ...prev, in_stock: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                  disabled={operationLoading}
                />
                <label htmlFor="in_stock" className="text-sm font-semibold text-slate-700">
                  Currently in stock
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={operationLoading}
                  className="px-8 py-3 bg-slate-200 text-slate-800 rounded-xl hover:bg-slate-300 transition-colors font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={operationLoading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold flex items-center disabled:opacity-50"
                >
                  {operationLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  {editingItem ? 'Update Equipment' : 'Add Equipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Equipment Import Modal */}
      <EquipmentImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={loadEquipment}
        onGlobalError={onGlobalError}
      />
    </div>
  );
}