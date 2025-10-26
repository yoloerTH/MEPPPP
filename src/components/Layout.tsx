import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Mail, 
  FileText, 
  Settings, 
  BarChart3, 
  Package,
  LogOut,
  Building2,
  User,
  Bell,
  Edit,
  ChevronDown,
  Zap,
  Shield,
  Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import UserProfileModal from './UserProfileModal';

interface GlobalError {
  title: string;
  message: string;
  type?: 'error' | 'timeout' | 'network';
}

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: BarChart3,
    description: 'Overview & Analytics',
    gradient: 'from-blue-500 to-cyan-500'
  },
  { 
    name: 'Emails', 
    href: '/emails', 
    icon: Mail,
    description: 'RFQ Processing',
    gradient: 'from-emerald-500 to-teal-500'
  },
   { 
     name: 'Quotations', 
    href: '/quotations', 
     icon: FileText,
     description: 'Quote Management',
     gradient: 'from-violet-500 to-purple-500'
   },
   { 
     name: 'Equipment', 
     href: '/equipment', 
     icon: Package,
     description: 'Inventory & Pricing',
     gradient: 'from-orange-500 to-red-500'
   },
  { 
    name: 'Settings', 
    href: '/settings', 
    icon: Settings,
    description: 'System Configuration',
    gradient: 'from-slate-500 to-slate-600'
  },
];

interface LayoutProps {
  children: React.ReactNode;
  onGlobalError?: (error: GlobalError) => void;
}

export default function Layout({ children, onGlobalError }: LayoutProps) {
  const location = useLocation();
  const { user, profile, refreshProfile } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Log route transitions for debugging
  useEffect(() => {
    console.log('🔄 Route transition to:', location.pathname);
  }, [location.pathname]);

  const handleSignOut = async () => {
    console.log('🚪 User signing out');
    await supabase.auth.signOut();
  };

  const currentPage = navigation.find(item => item.href === location.pathname);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-slate-200/50">
        <div className="flex flex-col h-full">
          {/* Logo and Company Header */}
          <div className="px-8 py-8 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-blue-50/50">
            <div className="flex items-center space-x-5">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                  <Activity className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  MEP Dashboard
                </h1>
                <p className="text-sm font-semibold text-blue-600 mt-1">Professional Solutions</p>
              </div>
            </div>
            
            {/* Company Information */}
            {profile?.company_name && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{profile.company_name}</p>
                    <p className="text-xs text-blue-600 font-medium">Enterprise Account</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-8 space-y-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-5 py-4 text-sm font-medium rounded-2xl transition-all duration-300 transform ${
                    isActive
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-xl shadow-${item.gradient.split('-')[1]}-500/25 scale-[1.02]`
                      : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 hover:text-slate-800 hover:scale-[1.01]'
                  }`}
                >
                  <div className={`p-2 rounded-xl mr-4 transition-all duration-300 ${
                    isActive 
                      ? 'bg-white/20' 
                      : 'bg-slate-100 group-hover:bg-white group-hover:shadow-md'
                  }`}>
                    <item.icon className={`w-5 h-5 transition-transform duration-300 ${
                      isActive ? 'scale-110' : 'group-hover:scale-110'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className={`text-xs mt-0.5 ${
                      isActive ? 'text-white/80' : 'text-slate-500 group-hover:text-slate-600'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                  {isActive && (
                    <div className="w-2 h-2 bg-white rounded-full opacity-75 animate-pulse"></div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-6 border-t border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-blue-50/50">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center space-x-4 p-4 rounded-2xl hover:bg-white/80 transition-all duration-200 group"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Edit className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-900">
                    {profile?.full_name || user?.email?.split('@')[0] || 'Professional User'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {profile?.job_title || 'MEP Specialist'}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  showUserMenu ? 'rotate-180' : ''
                }`} />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-200/50 backdrop-blur-xl overflow-hidden">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-700 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-200 group"
                    >
                      <Edit className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-700 rounded-xl hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 transition-all duration-200 group"
                    >
                      <Bell className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                      Notifications
                    </button>
                    <div className="border-t border-slate-200/50 my-2"></div>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 hover:text-red-700 transition-all duration-200 group"
                    >
                      <LogOut className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform duration-200" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* System Status */}
            <div className="mt-4 flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-200"></div>
                </div>
                <span className="text-xs font-semibold text-green-700">System Online</span>
              </div>
              <div className="flex space-x-1">
                <Shield className="w-3 h-3 text-green-600" />
                <Zap className="w-3 h-3 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-80">
        <main className="min-h-screen">
          {/* Enhanced Top Bar */}
          <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-slate-200/50 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-4 mb-2">
                  <div className={`p-3 rounded-2xl bg-gradient-to-r ${
                    currentPage?.gradient || 'from-slate-500 to-slate-600'
                  } shadow-lg`}>
                    {currentPage?.icon ? (
                      <currentPage.icon className="w-6 h-6 text-white" />
                    ) : (
                      <BarChart3 className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {location.pathname === '/' ? 'Dashboard' : location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2)}
                    </h2>
                    <p className="text-sm text-slate-600 font-medium">
                      {currentPage?.description || 'Professional MEP Management'}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              
              {/* Top Bar Actions */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg"></div>
                  <span className="text-sm font-semibold text-green-700">All Systems Operational</span>
                </div>
                
                <button className="relative p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-slate-200/50 group">
                  <Bell className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors duration-200" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                </button>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileUpdated={refreshProfile}
        onGlobalError={onGlobalError}
      />
      
      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        ></div>
      )}
    </div>
  );
}