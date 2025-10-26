import React, { useEffect, useState, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  User, 
  Shield,
  Database,
  Mail,
  Save,
  Plus,
  Edit,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  is_default: boolean;
  created_at: string;
}

interface SettingsProps {
  onGlobalError?: (error: { title: string; message: string; type?: 'error' | 'timeout' | 'network' }) => void;
}

export default function Settings({ onGlobalError }: SettingsProps) {
  const companyModalRef = useRef<HTMLDivElement>(null);
  const { user, profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    logo_url: '',
    is_default: false
  });

  const resetCompanyForm = () => {
    console.log('⚙️ Settings: Resetting company form');
    setCompanyForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      logo_url: '',
      is_default: false
    });
    setEditingCompany(null);
    setShowAddCompany(false);
  };

  // Close company modal when clicking outside
  useOutsideClick(companyModalRef, resetCompanyForm);

  useEffect(() => {
    console.log('⚙️ Settings: Component mounted/user changed', { hasUser: !!user, userId: user?.id });
    if (user) {
      loadCompanies();
    }
  }, [user]);

  const loadCompanies = async () => {
    console.log('⚙️ Settings: Starting loadCompanies');
    try {
      if (!user) {
        console.log('⚙️ Settings: No user found, skipping company load');
        setLoading(false);
        return;
      }
      
      console.log('⚙️ Settings: Fetching companies for user:', user.id);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      console.log('⚙️ Settings: Companies loaded successfully:', data?.length || 0);
      setCompanies(data || []);
    } catch (error) {
      console.error('⚙️ Settings: Error loading companies:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Companies Loading Error',
          message: `Failed to load companies: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      console.log('⚙️ Settings: Setting loading to false');
      setLoading(false);
    }
  };

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('⚙️ Settings: Starting company form submission');
    if (!user) return;

    try {
      const companyData = {
        ...companyForm,
        user_id: user.id
      };

      if (editingCompany) {
        console.log('⚙️ Settings: Updating existing company:', editingCompany.id);
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', editingCompany.id);
        if (error) throw error;
        console.log('⚙️ Settings: Company updated successfully');
      } else {
        console.log('⚙️ Settings: Creating new company');
        const { error } = await supabase
          .from('companies')
          .insert(companyData);
        if (error) throw error;
        console.log('⚙️ Settings: Company created successfully');
      }

      console.log('⚙️ Settings: Reloading companies after save');
      await loadCompanies();
      resetCompanyForm();
    } catch (error) {
      console.error('⚙️ Settings: Error saving company:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Company Save Error',
          message: `Failed to save company: ${error.message}`,
          type: 'network'
        });
      }
    }
  };

  const setDefaultCompany = async (companyId: string) => {
    console.log('⚙️ Settings: Setting default company:', companyId);
    try {
      // First, unset all companies as default
      await supabase
        .from('companies')
        .update({ is_default: false })
        .eq('user_id', user?.id);

      // Then set the selected company as default
      const { error } = await supabase
        .from('companies')
        .update({ is_default: true })
        .eq('id', companyId);

      if (error) throw error;
      console.log('⚙️ Settings: Default company set successfully');
      await loadCompanies();
    } catch (error) {
      console.error('⚙️ Settings: Error setting default company:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Default Company Error',
          message: `Failed to set default company: ${error.message}`,
          type: 'network'
        });
      }
    }
  };

  const deleteCompany = async (companyId: string) => {
    console.log('⚙️ Settings: Starting delete for company:', companyId);
    if (!window.confirm('Are you sure you want to delete this company?')) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
      console.log('⚙️ Settings: Company deleted successfully');
      await loadCompanies();
    } catch (error) {
      console.error('⚙️ Settings: Error deleting company:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Company Delete Error',
          message: `Failed to delete company: ${error.message}`,
          type: 'network'
        });
      }
    }
  };

  const startEditingCompany = (company: Company) => {
    console.log('⚙️ Settings: Starting edit for company:', company.id);
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      email: company.email,
      phone: company.phone || '',
      address: company.address || '',
      logo_url: company.logo_url || '',
      is_default: company.is_default
    });
    setShowAddCompany(true);
  };

  const tabs = [
    { id: 'company', name: 'Company Settings', icon: Building2 },
    { id: 'profile', name: 'User Profile', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'data', name: 'Data Management', icon: Database }
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-xl">
              <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-full mb-4"></div>
              <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-xl text-slate-600 mt-2">Configure your MEP dashboard preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'company' && (
            <div className="space-y-8">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Company Management</h2>
                    <p className="text-slate-600 mt-2">Manage your company information for quotations</p>
                  </div>
                  <button
                    onClick={() => setShowAddCompany(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Company
                  </button>
                </div>

                {companies.length === 0 ? (
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
                    <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-600 mb-2">No Companies Added</h3>
                    <p className="text-slate-500 mb-6">Add your first company to appear on quotations</p>
                    <button
                      onClick={() => setShowAddCompany(true)}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Company
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {companies.map((company) => (
                      <div
                        key={company.id}
                        className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                          company.is_default
                            ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <h3 className="text-xl font-bold text-slate-900">{company.name}</h3>
                              {company.is_default && (
                                <span className="px-3 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full border border-green-300">
                                  DEFAULT
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-semibold text-slate-600">Email</p>
                                <p className="text-slate-900">{company.email}</p>
                              </div>
                              {company.phone && (
                                <div>
                                  <p className="text-sm font-semibold text-slate-600">Phone</p>
                                  <p className="text-slate-900">{company.phone}</p>
                                </div>
                              )}
                              {company.address && (
                                <div className="md:col-span-2">
                                  <p className="text-sm font-semibold text-slate-600">Address</p>
                                  <p className="text-slate-900">{company.address}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 ml-6">
                            {!company.is_default && (
                              <button
                                onClick={() => setDefaultCompany(company.id)}
                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200"
                                title="Set as default"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => startEditingCompany(company)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => deleteCompany(company.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-8">User Profile</h2>
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-900 mb-4">Current Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-semibold text-blue-600 mb-1">Full Name</p>
                      <p className="font-semibold text-blue-900">{profile?.full_name || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-600 mb-1">Job Title</p>
                      <p className="font-semibold text-blue-900">{profile?.job_title || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-600 mb-1">Company</p>
                      <p className="font-semibold text-blue-900">{profile?.company_name || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-600 mb-1">Email</p>
                      <p className="font-semibold text-blue-900">{profile?.email || user?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-600 mb-1">Phone</p>
                      <p className="font-semibold text-blue-900">{profile?.phone || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-600 mb-1">Address</p>
                      <p className="font-semibold text-blue-900">{profile?.address || 'Not set'}</p>
                    </div>
                  </div>
                </div>
                <p className="text-slate-600">
                  To edit your profile information, use the profile button in the sidebar or click your avatar in the top navigation.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-8">Security Settings</h2>
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <Shield className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-bold text-green-900">Account Security</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-green-900">Two-Factor Authentication</p>
                        <p className="text-sm text-green-700">Add an extra layer of security</p>
                      </div>
                      <span className="px-3 py-1 bg-orange-200 text-orange-800 text-xs font-bold rounded-full">
                        Coming Soon
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-green-900">Session Management</p>
                        <p className="text-sm text-green-700">Manage active sessions</p>
                      </div>
                      <span className="px-3 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-8">Data Management</h2>
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <Database className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-bold text-blue-900">Data Overview</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-blue-900">Total Companies</span>
                      <span className="text-blue-900">{companies.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-blue-900">Data Backup</span>
                      <span className="px-3 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full">
                        Auto-enabled
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-blue-900">Data Export</span>
                      <span className="px-3 py-1 bg-orange-200 text-orange-800 text-xs font-bold rounded-full">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Company Modal */}
      {showAddCompany && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div ref={companyModalRef} className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-8 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h2>
              <button
                onClick={resetCompanyForm}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCompanySubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="Your Company Ltd"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="contact@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    value={companyForm.logo_url}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, logo_url: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Address
                </label>
                <textarea
                  rows={3}
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500"
                  placeholder="123 Business Street, City, State, ZIP"
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={companyForm.is_default}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                />
                <label htmlFor="is_default" className="text-sm font-semibold text-slate-700">
                  Set as default company for quotations
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetCompanyForm}
                  className="px-8 py-3 bg-slate-200 text-slate-800 rounded-xl hover:bg-slate-300 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold flex items-center"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {editingCompany ? 'Update Company' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}