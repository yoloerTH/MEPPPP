import React, { useState, useEffect, useRef } from 'react';
import { X, User, Building2, Mail, Phone, MapPin, Save, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface UserProfile {
  id?: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  job_title: string;
  website?: string;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
  onGlobalError?: (error: { title: string; message: string; type?: 'error' | 'timeout' | 'network' }) => void;
}

export default function UserProfileModal({ isOpen, onClose, onProfileUpdated, onGlobalError }: UserProfileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    full_name: '',
    company_name: '',
    email: user?.email || '',
    phone: '',
    address: '',
    job_title: '',
    website: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Close modal when clicking outside
  useOutsideClick(modalRef, onClose);

  useEffect(() => {
    console.log('👤 UserProfile: Modal opened/user changed', { isOpen, hasUser: !!user });
    if (isOpen && user) {
      loadUserProfile();
    }
  }, [isOpen, user]);

  const loadUserProfile = async () => {
    console.log('👤 UserProfile: Loading user profile for:', user?.id);
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (data && data.length > 0) {
        console.log('👤 UserProfile: Profile loaded successfully');
        setProfile(data[0]);
      } else if (error && error.code !== 'PGRST116') {
        console.error('👤 UserProfile: Error loading profile:', error);
        if (onGlobalError) {
          onGlobalError({
            title: 'Profile Loading Error',
            message: `Failed to load profile: ${error.message}`,
            type: 'network'
          });
        }
      }
    } catch (error) {
      console.error('👤 UserProfile: Error loading user profile:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Profile Loading Error',
          message: `Failed to load user profile: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      console.log('👤 UserProfile: Setting loading to false');
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('👤 UserProfile: Starting profile save');
    if (!user) return;

    setSaving(true);
    try {
      const profileData = {
        ...profile,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      console.log('👤 UserProfile: Upserting profile data');
      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData);

      if (error) throw error;

      console.log('👤 UserProfile: Profile saved successfully');
      if (onProfileUpdated) onProfileUpdated();
      onClose();
    } catch (error) {
      console.error('👤 UserProfile: Error saving profile:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Profile Save Error',
          message: `Failed to save profile: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      console.log('👤 UserProfile: Setting saving to false');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
              <p className="text-sm text-gray-600">Manage your professional information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Edit3 className="w-4 h-4 inline mr-2" />
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={profile.job_title}
                  onChange={(e) => setProfile(prev => ({ ...prev, job_title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Project Manager"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4 inline mr-2" />
                Company Name *
              </label>
              <input
                type="text"
                required
                value={profile.company_name}
                onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Company Ltd"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="john@company.com"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Business Address *
              </label>
              <textarea
                required
                rows={3}
                value={profile.address}
                onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123 Business Street, City, State, ZIP Code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Website
              </label>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://www.company.com"
              />
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}