import React, { useState, useRef } from 'react';
import { X, Mail, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface AddEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailAdded: () => void;
  onGlobalError?: (error: { title: string; message: string; type?: 'error' | 'timeout' | 'network' }) => void;
}

export default function AddEmailModal({ isOpen, onClose, onEmailAdded, onGlobalError }: AddEmailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    subject: '',
    from_email: '',
    from_name: '',
    body: '',
    gmail_id: ''
  });
  const [loading, setLoading] = useState(false);

  // Close modal when clicking outside
  useOutsideClick(modalRef, onClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📧 AddEmail: Starting email submission');
    setLoading(true);

    try {
      console.log('📧 AddEmail: Inserting email into database');
      const { error } = await supabase
        .from('emails')
        .insert({
          ...formData,
          gmail_id: formData.gmail_id || `manual-${Date.now()}`,
          attachments: [],
          status: 'new'
        });

      if (error) throw error;

      console.log('📧 AddEmail: Email added successfully');
      onEmailAdded();
      onClose();
      setFormData({
        subject: '',
        from_email: '',
        from_name: '',
        body: '',
        gmail_id: ''
      });
    } catch (error) {
      console.error('📧 AddEmail: Error adding email:', error);
      if (onGlobalError) {
        onGlobalError({
          title: 'Email Add Error',
          message: `Failed to add email: ${error.message}`,
          type: 'network'
        });
      }
    } finally {
      console.log('📧 AddEmail: Setting loading to false');
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Mail className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Add RFQ Email</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="RFQ for HVAC Equipment - Project ABC"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email *
              </label>
              <input
                type="email"
                required
                value={formData.from_email}
                onChange={(e) => setFormData(prev => ({ ...prev, from_email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="client@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Name
              </label>
              <input
                type="text"
                value={formData.from_name}
                onChange={(e) => setFormData(prev => ({ ...prev, from_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gmail ID (Optional)
            </label>
            <input
              type="text"
              value={formData.gmail_id}
              onChange={(e) => setFormData(prev => ({ ...prev, gmail_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Leave empty for auto-generation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body
            </label>
            <textarea
              rows={6}
              value={formData.body}
              onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Dear Aristides S. Air Control Services,

We are requesting a quotation for the following HVAC equipment:
- 2x Air conditioning units for office space (500 sqm)
- 1x Heating system for warehouse (1000 sqm)
- Associated plumbing and electrical work

Please provide your best pricing and delivery timeline.

Best regards,
John Doe"
            />
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Drag and drop files here, or click to select
              </p>
              <p className="text-xs text-gray-500 mt-1">
                (Attachments will be supported in future updates)
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding...' : 'Add Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}