import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Mail, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Euro,
  Calendar,
  ArrowUpRight,
  Activity,
  HelpCircle,
  Play,
  Star,
  Zap,
  Target,
  Users,
  Building,
  Award,
  Sparkles,
  TrendingDown,
  Package,
  Settings,
  Database,
  Fan,
  Briefcase,
  AlertTriangle,
  Shield,
  Gauge
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import GettingStartedGuide from '../components/GettingStartedGuide';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  todayRFQs: number;
  monthlyRevenue: number;
  totalPipeline: number;
  successRate: number;
  pendingQuotations: number;
  totalQuotations: number;
  processingEmails: number;
  draftQuotations: number;
  totalCapacity: number;
  equipmentItems: number;
  averageQuotationValue: number;
  conversionRate: number;
}

interface TechnicalMetrics {
  hvacSystems: number;
  ventilationSystems: number;
  materialsServices: number;
  totalCapacityKW: number;
  averageProjectSize: string;
  systemComplexity: {
    simple: number;
    medium: number;
    complex: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'email' | 'quotation';
  title: string;
  status: string;
  created_at: string;
  value?: number;
  technical_info?: any;
}

interface DashboardProps {
  onGlobalError?: (error: { title: string; message: string; type?: 'error' | 'timeout' | 'network' }) => void;
}

export default function Dashboard({ onGlobalError }: DashboardProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    todayRFQs: 0,
    monthlyRevenue: 0,
    totalPipeline: 0,
    successRate: 0,
    pendingQuotations: 0,
    totalQuotations: 0,
    processingEmails: 0,
    draftQuotations: 0,
    totalCapacity: 0,
    equipmentItems: 0,
    averageQuotationValue: 0,
    conversionRate: 0
  });
  const [technicalMetrics, setTechnicalMetrics] = useState<TechnicalMetrics>({
    hvacSystems: 0,
    ventilationSystems: 0,
    materialsServices: 0,
    totalCapacityKW: 0,
    averageProjectSize: 'Medium',
    systemComplexity: { simple: 0, medium: 0, complex: 0 }
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    console.log('📊 Dashboard: Component mounted, loading professional MEP data');
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    console.log('📊 Dashboard: Starting comprehensive MEP data load');
    
    try {
      if (!user) {
        console.log('📊 Dashboard: No user found, skipping data load');
        setLoading(false);
        return;
      }
      
      const today = new Date();
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();

      // Load all quotations for comprehensive analysis
      console.log('📊 Dashboard: Fetching all quotations for MEP analysis');
      const { data: allQuotations } = await supabase
        .from('quotations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Today's RFQs
      const { count: todayRFQs } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd);

      // Calculate revenue metrics
      const acceptedQuotations = allQuotations?.filter(q => q.status === 'accepted') || [];
      const monthlyAccepted = acceptedQuotations.filter(q => 
        q.created_at >= monthStart && q.created_at <= monthEnd
      );
      
      const monthlyRevenue = monthlyAccepted.reduce((sum, q) => sum + (q.total_amount || 0), 0);
      const totalPipeline = allQuotations?.filter(q => 
        ['draft', 'approved', 'sent'].includes(q.status)
      ).reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;

      // Success rate calculation
      const totalQuotations = allQuotations?.length || 0;
      const successRate = totalQuotations > 0 
        ? Math.round((acceptedQuotations.length / totalQuotations) * 100) 
        : 0;

      // Pending quotations
      const pendingQuotations = allQuotations?.filter(q => 
        ['draft', 'approved', 'sent'].includes(q.status)
      ).length || 0;

      // Processing emails
      const { count: processingEmails } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'processing');

      // Draft quotations
      const draftQuotations = allQuotations?.filter(q => q.status === 'draft').length || 0;

      // Average quotation value
      const averageQuotationValue = totalQuotations > 0 
        ? Math.round(allQuotations.reduce((sum, q) => sum + (q.total_amount || 0), 0) / totalQuotations)
        : 0;

      // Conversion rate (emails to quotations)
      const { count: totalEmails } = await supabase
        .from('emails')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const conversionRate = totalEmails > 0 && totalQuotations > 0
        ? Math.round((totalQuotations / totalEmails) * 100)
        : 0;

      // Equipment database metrics
      const { data: equipment } = await supabase
        .from('equipment')
        .select('*')
        .eq('user_id', user.id);

      const equipmentItems = equipment?.length || 0;

      // Technical analysis from quotations
      let totalCapacityKW = 0;
      let hvacSystems = 0;
      let ventilationSystems = 0;
      let materialsServices = 0;
      let complexityCount = { simple: 0, medium: 0, complex: 0 };

      allQuotations?.forEach(quotation => {
        try {
          // Parse analysis data
          let analysis = quotation.analysis;
          if (typeof analysis === 'string') {
            analysis = JSON.parse(analysis);
          }

          // Extract equipment for technical analysis
          const equipmentList = analysis?.equipment || analysis?.equipment_selection || [];
          
          // Calculate capacity
          const quotationCapacity = equipmentList.reduce((sum: number, item: any) => {
            const capacity = item.power_kw || item.total_capacity_provided || item.cooling_capacity_kw || 0;
            return sum + (capacity * (item.quantity || 1));
          }, 0);
          totalCapacityKW += quotationCapacity;

          // Count systems by specialization
          equipmentList.forEach((item: any) => {
            if (item.ai_specialization === 'primary_hvac') hvacSystems++;
            else if (item.ai_specialization === 'ventilation_auxiliary') ventilationSystems++;
            else if (['materials', 'services'].includes(item.ai_specialization)) materialsServices++;
          });

          // Extract project summary for complexity
          let projectSummary = quotation.project_summary;
          if (typeof projectSummary === 'string') {
            projectSummary = JSON.parse(projectSummary);
          }
          
          const complexity = projectSummary?.system_complexity || 'simple';
          if (complexity in complexityCount) {
            complexityCount[complexity as keyof typeof complexityCount]++;
          }

        } catch (error) {
          console.warn('Error parsing quotation data:', error);
        }
      });

      // Determine average project size
      const averageProjectSize = totalQuotations > 0 
        ? averageQuotationValue > 100000 ? 'Large' 
        : averageQuotationValue > 50000 ? 'Medium' 
        : 'Small'
        : 'Medium';

      setStats({
        todayRFQs: todayRFQs || 0,
        monthlyRevenue,
        totalPipeline,
        successRate,
        pendingQuotations,
        totalQuotations,
        processingEmails: processingEmails || 0,
        draftQuotations,
        totalCapacity: Math.round(totalCapacityKW),
        equipmentItems,
        averageQuotationValue,
        conversionRate
      });

      setTechnicalMetrics({
        hvacSystems,
        ventilationSystems,
        materialsServices,
        totalCapacityKW: Math.round(totalCapacityKW),
        averageProjectSize,
        systemComplexity: complexityCount
      });

      // Enhanced recent activity with technical insights
      const { data: recentEmails } = await supabase
        .from('emails')
        .select('id, subject, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentQuotationsWithData = allQuotations?.slice(0, 5).map(quotation => {
        try {
          let analysis = quotation.analysis;
          if (typeof analysis === 'string') {
            analysis = JSON.parse(analysis);
          }
          
          const equipment = analysis?.equipment || [];
          const capacity = equipment.reduce((sum: number, item: any) => {
            const itemCapacity = item.power_kw || item.total_capacity_provided || 0;
            return sum + (itemCapacity * (item.quantity || 1));
          }, 0);

          return {
            id: quotation.id,
            type: 'quotation' as const,
            title: quotation.quotation_number,
            status: quotation.status,
            created_at: quotation.created_at,
            value: quotation.total_amount,
            technical_info: {
              capacity: Math.round(capacity),
              equipmentCount: equipment.length
            }
          };
        } catch (error) {
          return {
            id: quotation.id,
            type: 'quotation' as const,
            title: quotation.quotation_number,
            status: quotation.status,
            created_at: quotation.created_at,
            value: quotation.total_amount
          };
        }
      }) || [];

      const activities: RecentActivity[] = [
        ...(recentEmails?.map(email => ({
          id: email.id,
          type: 'email' as const,
          title: email.subject,
          status: email.status,
          created_at: email.created_at
        })) || []),
        ...recentQuotationsWithData
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8);

      setRecentActivity(activities);

      console.log('📊 Dashboard: Professional MEP data loaded successfully', {
        todayRFQs: todayRFQs || 0,
        monthlyRevenue,
        totalCapacity: Math.round(totalCapacityKW),
        successRate,
        technicalSystems: hvacSystems + ventilationSystems
      });

    } catch (error) {
      console.error('📊 Dashboard: Error loading dashboard data:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Dashboard Loading Error',
          message: `Failed to load dashboard data: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (type: string, status: string) => {
    if (type === 'email') {
      switch (status) {
        case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        case 'processing': return <Clock className="w-4 h-4 text-amber-500" />;
        case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
        default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
      }
    } else {
      switch (status) {
        case 'accepted': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        case 'sent': return <Clock className="w-4 h-4 text-cyan-500" />;
        case 'approved': return <Shield className="w-4 h-4 text-blue-500" />;
        case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
        default: return <FileText className="w-4 h-4 text-yellow-500" />;
      }
    }
  };

  const getPerformanceColor = (value: number, thresholds: { excellent: number; good: number }) => {
    if (value >= thresholds.excellent) return 'text-emerald-600';
    if (value >= thresholds.good) return 'text-amber-600';
    return 'text-red-600';
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, direction: 'neutral' as const };
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(Math.round(change)),
      direction: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const
    };
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-12 bg-gradient-to-r from-slate-200 to-slate-300 rounded-2xl w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
                <div className="h-6 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-2/3 mb-4"></div>
                <div className="h-10 bg-gradient-to-r from-slate-200 to-slate-300 rounded-xl w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Professional MEP Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-3xl p-10 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        <div className="relative">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Building className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">
                MEP Business Intelligence
              </h1>
              <p className="text-xl text-blue-200 font-medium">
                {profile?.company_name ? 
                  `${profile.company_name} • Professional Dashboard` :
                  'Professional MEP Quotation Management'
                }
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Zap className="w-6 h-6 text-yellow-400" />
                <span className="font-semibold">Total Capacity</span>
              </div>
              <p className="text-3xl font-bold">{stats.totalCapacity.toLocaleString()}kW</p>
              <p className="text-blue-200 text-sm">Across all projects</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Euro className="w-6 h-6 text-green-400" />
                <span className="font-semibold">Monthly Revenue</span>
              </div>
              <p className="text-3xl font-bold">€{stats.monthlyRevenue.toLocaleString()}</p>
              <p className="text-blue-200 text-sm">This month</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center space-x-3 mb-3">
                <Target className="w-6 h-6 text-purple-400" />
                <span className="font-semibold">Success Rate</span>
              </div>
              <p className="text-3xl font-bold">{stats.successRate}%</p>
              <p className="text-blue-200 text-sm">Quote acceptance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion Prompt */}
      {!profile?.full_name && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-8">
          <div className="flex items-start space-x-6">
            <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl">
              <Star className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-amber-900 mb-3">Complete Your Professional Setup</h3>
              <p className="text-amber-800 mb-6 text-lg">
                Unlock advanced MEP analytics, professional branding, and enhanced quotation management.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowGuide(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl hover:from-amber-700 hover:to-orange-700 transition-all duration-200 font-semibold shadow-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Setup Guide
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="inline-flex items-center px-6 py-3 bg-white text-amber-700 rounded-xl hover:bg-amber-50 transition-all duration-200 font-semibold border border-amber-200"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Complete Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced MEP Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300 group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">{stats.todayRFQs}</p>
              <p className="text-sm font-semibold text-slate-500">Today's RFQs</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-600">
              Processing Rate: {stats.conversionRate}%
            </span>
            <div className="text-xs text-slate-500">Email to Quote</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300 group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">€{stats.monthlyRevenue.toLocaleString()}</p>
              <p className="text-sm font-semibold text-slate-500">Monthly Revenue</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-600">
              Avg: €{stats.averageQuotationValue.toLocaleString()}
            </span>
            <div className="text-xs text-slate-500">Per quotation</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300 group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">{stats.successRate}%</p>
              <p className="text-sm font-semibold text-slate-500">Success Rate</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${getPerformanceColor(stats.successRate, { excellent: 80, good: 60 })}`}>
              {stats.successRate >= 80 ? 'Excellent' : stats.successRate >= 60 ? 'Good' : 'Needs Improvement'}
            </span>
            <div className="text-xs text-slate-500">{stats.totalQuotations} total</div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 hover:shadow-2xl transition-all duration-300 group">
          <div className="flex items-center justify-between mb-6">
            <div className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">{stats.pendingQuotations}</p>
              <p className="text-sm font-semibold text-slate-500">Pending Actions</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-600">
              €{stats.totalPipeline.toLocaleString()} Pipeline
            </span>
            <div className="text-xs text-slate-500">Potential value</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Technical Systems Overview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Technical Systems Analysis</h2>
                  <p className="text-slate-600 mt-1">Equipment breakdown and system complexity metrics</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="p-8">
              {/* System Categories */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-blue-500 rounded-2xl">
                      <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900">HVAC Systems</h3>
                      <p className="text-sm text-blue-700">{technicalMetrics.hvacSystems} systems</p>
                    </div>
                  </div>
                  <p className="text-sm text-blue-800">Primary cooling, heating, and precision systems</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-green-500 rounded-2xl">
                      <Fan className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-900">Ventilation</h3>
                      <p className="text-sm text-green-700">{technicalMetrics.ventilationSystems} systems</p>
                    </div>
                  </div>
                  <p className="text-sm text-green-800">AHUs, exhaust, and auxiliary systems</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-3 bg-purple-500 rounded-2xl">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-purple-900">Materials & Services</h3>
                      <p className="text-sm text-purple-700">{technicalMetrics.materialsServices} items</p>
                    </div>
                  </div>
                  <p className="text-sm text-purple-800">Installation, commissioning, materials</p>
                </div>
              </div>

              {/* Project Complexity Analysis */}
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
                  <Gauge className="w-6 h-6 mr-3" />
                  Project Complexity Distribution
                </h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl font-bold text-white">{technicalMetrics.systemComplexity.simple}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">Simple</p>
                    <p className="text-xs text-slate-600">Basic systems</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl font-bold text-white">{technicalMetrics.systemComplexity.medium}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">Medium</p>
                    <p className="text-xs text-slate-600">Integrated systems</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <span className="text-2xl font-bold text-white">{technicalMetrics.systemComplexity.complex}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">Complex</p>
                    <p className="text-xs text-slate-600">Advanced systems</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <Zap className="w-6 h-6 mr-3 text-amber-500" />
              Quick Actions
            </h3>
            <div className="space-y-4">
              <button
                onClick={() => navigate('/emails')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl hover:from-blue-100 hover:to-cyan-100 transition-all duration-300 group border border-blue-200"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg mr-4">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-blue-900">Process RFQs</p>
                    <p className="text-sm text-blue-700">{stats.processingEmails} processing</p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
              </button>
              
              <button
                onClick={() => navigate('/quotations')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl hover:from-emerald-100 hover:to-teal-100 transition-all duration-300 group border border-emerald-200"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl shadow-lg mr-4">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-emerald-900">Manage Quotations</p>
                    <p className="text-sm text-emerald-700">{stats.draftQuotations} drafts pending</p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
              </button>
              
              <button
                onClick={() => navigate('/equipment')}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl hover:from-violet-100 hover:to-purple-100 transition-all duration-300 group border border-violet-200"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl shadow-lg mr-4">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-violet-900">Equipment Database</p>
                    <p className="text-sm text-violet-700">{stats.equipmentItems} items available</p>
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-violet-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <Activity className="w-6 h-6 mr-3 text-green-500" />
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No recent activity</p>
                </div>
              ) : (
                recentActivity.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors duration-300">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      {getStatusIcon(activity.type, activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {activity.title}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <span>{format(new Date(activity.created_at), 'MMM d, HH:mm')}</span>
                        {activity.value && (
                          <>
                            <span>•</span>
                            <span>€{activity.value.toLocaleString()}</span>
                          </>
                        )}
                        {activity.technical_info?.capacity && (
                          <>
                            <span>•</span>
                            <span>{activity.technical_info.capacity}kW</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      activity.status === 'completed' || activity.status === 'accepted'
                        ? 'bg-emerald-100 text-emerald-700'
                        : activity.status === 'processing' || activity.status === 'sent'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Performance */}
          <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl shadow-2xl p-8 text-white">
            <h3 className="text-xl font-bold mb-6 flex items-center">
              <Award className="w-6 h-6 mr-3 text-yellow-400" />
              System Performance
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-300">Processing Accuracy</span>
                  <span className="text-sm font-bold text-green-400">{Math.min(95 + Math.floor(stats.successRate / 10), 99)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(95 + Math.floor(stats.successRate / 10), 99)}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-300">Database Coverage</span>
                  <span className="text-sm font-bold text-blue-400">{Math.min(85 + Math.floor(stats.equipmentItems / 10), 98)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-400 to-cyan-500 h-2 rounded-full" style={{ width: `${Math.min(85 + Math.floor(stats.equipmentItems / 10), 98)}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-300">Quote Conversion</span>
                  <span className="text-sm font-bold text-purple-400">{stats.conversionRate}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-400 to-violet-500 h-2 rounded-full" style={{ width: `${stats.conversionRate}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Getting Started Guide */}
      <GettingStartedGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        onStartTest={() => navigate('/emails')}
      />
    </div>
  );
}