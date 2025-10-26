import React, { useMemo, useRef } from 'react';
import { 
  X, 
  Mail, 
  User, 
  Calendar, 
  Building, 
  MapPin, 
  Phone, 
  Paperclip,
  Clock,
  FileText,
  AlertCircle,
  Star,
  Tag,
  DollarSign,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Award,
  MessageSquare,
  Send,
  Eye,
  CheckCircle2,
  Timer,
  Thermometer,
  Wind,
  Wrench,
  Factory,
  Home,
  Users
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface Email {
  id: string;
  gmail_id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  body?: string;
  snippet?: string;
  attachments: any[];
  status: 'new' | 'processing' | 'completed' | 'failed' | 'clarification_sent';
  processing_started_at?: string;
  processing_completed_at?: string;
  created_at: string;
  is_gmail?: boolean;
  is_unread?: boolean;
  thread_id?: string;
  ai_analysis?: any;
  client_info?: any;
}

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: Email | null;
  onProcessRFQ?: (email: Email) => void;
  onReply?: (email: Email) => void;
}

export default function EmailPreviewModal({ isOpen, onClose, email, onProcessRFQ, onReply }: EmailPreviewModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Close modal when clicking outside
  useOutsideClick(modalRef, onClose);
  
  // Always call useMemo at the top level to avoid hooks rule violation
  const emailAnalysis = useMemo(() => {
    if (!email) return null;
    
    const emailContent = email.body || email.snippet || '';
    const emailContentLower = emailContent.toLowerCase();
    
    // Enhanced information extraction with better contact detection
    const extractInfo = () => {
      // Enhanced phone detection
      const phoneRegex = /(?:\+?[\d\s\-\(\)\.]{10,})|(?:tel[\s:]*[\+]?[\d\s\-\(\)\.]{8,})/gi;
      
      // Enhanced email detection
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      
      // Address detection
      const addressRegex = /\b\d+\s+[a-zA-Z0-9\s,.-]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|place|pl|court|ct|circle|cir)\b[a-zA-Z0-9\s,.-]*/gi;
      
      // Enhanced company detection with common business suffixes
      const companyRegex = /\b[A-Z][a-zA-Z0-9\s&]+(?:ltd|llc|inc|corp|company|co\.|limited|group|enterprises|solutions|systems|services|technologies|developments|construction|engineering)\b/gi;
      
      // Name and title detection - looking for structured contact info
      const nameWithTitleRegex = /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+((?:Project\s+Manager|Manager|Director|Engineer|Architect|Coordinator|Supervisor|Executive|President|CEO|CTO|VP|Vice\s+President)[^\n\r]*)/gi;
      
      // Budget detection
      const budgetRegex = /\$\s*[\d,]+(?:\.\d{2})?|\b\d+k?\s*(?:budget|dollars?)\b/gi;
      
      // Deadline detection
      const deadlineRegex = /(?:deadline|due date|need by|required by|asap|urgent|rush)[\s:]*([^.\n]{1,50})/gi;
      
      // Square footage detection
      const squareFootageRegex = /(\d{1,3}(?:,\d{3})*)\s*(?:sq\.?\s*ft\.?|square\s*feet)/gi;

      // Extract structured contact blocks (name, title, company pattern)
      const contactBlocks = [];
      const contactBlockRegex = /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\n?\s*((?:Project\s+Manager|Manager|Director|Engineer|Architect|Coordinator|Supervisor)[^\n]*)\s*\n?\s*([A-Z][a-zA-Z0-9\s&]+(?:Ltd|LLC|Inc|Corp|Company|Co\.|Limited|Group|Developments|Construction|Engineering)[^\n]*)\s*\n?\s*(?:Tel[\s:]*([+]?[\d\s\-\(\)\.]+))?\s*\n?\s*(?:Email[\s:]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))?/gi;
      
      let match;
      while ((match = contactBlockRegex.exec(emailContent)) !== null) {
        contactBlocks.push({
          name: match[1],
          title: match[2],
          company: match[3],
          phone: match[4] || null,
          email: match[5] || null
        });
      }

      return {
        phones: [...new Set((emailContent.match(phoneRegex) || []).map(p => p.replace(/tel[\s:]*/gi, '').trim()))].slice(0, 3),
        emails: [...new Set((emailContent.match(emailRegex) || []).filter(e => e !== email.from_email))].slice(0, 3),
        addresses: [...new Set((emailContent.match(addressRegex) || []))].slice(0, 2),
        companies: [...new Set((emailContent.match(companyRegex) || []))].slice(0, 3),
        budgets: [...new Set((emailContent.match(budgetRegex) || []))].slice(0, 3),
        deadlines: [...new Set((emailContent.match(deadlineRegex) || []))].slice(0, 2),
        squareFootage: [...new Set((emailContent.match(squareFootageRegex) || []))].slice(0, 2),
        contactBlocks: contactBlocks.slice(0, 3), // Limit to 3 structured contacts
        nameWithTitle: [...new Set((emailContent.match(nameWithTitleRegex) || []))].slice(0, 3)
      };
    };

    const extractedInfo = extractInfo();

    // Enhanced RFQ and MEP keyword detection
    const rfqKeywords = [
      { word: 'quotation', weight: 3, category: 'request' },
      { word: 'quote', weight: 3, category: 'request' },
      { word: 'pricing', weight: 2, category: 'request' },
      { word: 'estimate', weight: 2, category: 'request' },
      { word: 'proposal', weight: 3, category: 'request' },
      { word: 'tender', weight: 3, category: 'request' },
      { word: 'rfq', weight: 4, category: 'request' },
      { word: 'hvac', weight: 4, category: 'mep' },
      { word: 'air conditioning', weight: 3, category: 'mep' },
      { word: 'heating', weight: 3, category: 'mep' },
      { word: 'cooling', weight: 3, category: 'mep' },
      { word: 'ventilation', weight: 3, category: 'mep' },
      { word: 'plumbing', weight: 4, category: 'mep' },
      { word: 'electrical', weight: 4, category: 'mep' },
      { word: 'mechanical', weight: 3, category: 'mep' },
      { word: 'ductwork', weight: 2, category: 'mep' },
      { word: 'chiller', weight: 2, category: 'equipment' },
      { word: 'boiler', weight: 2, category: 'equipment' },
      { word: 'pump', weight: 1, category: 'equipment' },
      { word: 'fan', weight: 1, category: 'equipment' }
    ];

    const foundKeywords = rfqKeywords.filter(kw => 
      emailContentLower.includes(kw.word)
    );

    // Urgency detection
    const urgencyKeywords = ['urgent', 'asap', 'rush', 'emergency', 'immediately', 'soon as possible'];
    const urgencyLevel = urgencyKeywords.some(word => emailContentLower.includes(word)) ? 'High' : 'Normal';

    // Project type detection
    const projectTypes = [
      { type: 'Commercial Office', keywords: ['office', 'commercial', 'corporate', 'business'] },
      { type: 'Industrial', keywords: ['warehouse', 'industrial', 'manufacturing', 'factory'] },
      { type: 'Residential', keywords: ['residential', 'apartment', 'condo', 'home', 'villa', 'house'] },
      { type: 'Healthcare', keywords: ['hospital', 'medical', 'clinic', 'healthcare'] },
      { type: 'Educational', keywords: ['school', 'university', 'college', 'education'] },
      { type: 'Retail', keywords: ['retail', 'store', 'shopping', 'mall'] }
    ];

    const detectedProjectType = projectTypes.find(pt => 
      pt.keywords.some(keyword => emailContentLower.includes(keyword))
    )?.type || 'General';

    // Calculate comprehensive priority score
    const priorityScore = 
      foundKeywords.reduce((sum, kw) => sum + kw.weight, 0) +
      (email.is_unread ? 3 : 0) + 
      (email.attachments.length > 0 ? 2 : 0) +
      (extractedInfo.companies.length > 0 ? 2 : 0) +
      (extractedInfo.budgets.length > 0 ? 3 : 0) +
      (urgencyLevel === 'High' ? 4 : 0) +
      (extractedInfo.deadlines.length > 0 ? 3 : 0);

    const getPriorityLevel = (score: number) => {
      if (score >= 15) return { level: 'Critical', color: 'text-red-700 bg-red-100 border-red-300', bgGrad: 'from-red-50 to-red-100' };
      if (score >= 10) return { level: 'High', color: 'text-orange-700 bg-orange-100 border-orange-300', bgGrad: 'from-orange-50 to-orange-100' };
      if (score >= 5) return { level: 'Medium', color: 'text-yellow-700 bg-yellow-100 border-yellow-300', bgGrad: 'from-yellow-50 to-yellow-100' };
      return { level: 'Low', color: 'text-green-700 bg-green-100 border-green-300', bgGrad: 'from-green-50 to-green-100' };
    };

    const priority = getPriorityLevel(priorityScore);

    // Email age and response time analysis
    const emailAge = differenceInDays(new Date(), new Date(email.created_at));
    const responseTimeTarget = urgencyLevel === 'High' ? 1 : 3; // days
    const isOverdue = emailAge > responseTimeTarget;

    return {
      extractedInfo,
      foundKeywords,
      urgencyLevel,
      detectedProjectType,
      priority,
      priorityScore,
      emailAge,
      isOverdue,
      responseTimeTarget
    };
  }, [email]);
  
  if (!isOpen || !email) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Enhanced Header with Action Buttons */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 rounded-t-3xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Smart Email Analysis</h2>
                  <p className="text-blue-100">Intelligent RFQ parsing & insights</p>
                </div>
                {emailAnalysis.priority.level === 'Critical' && (
                  <div className="animate-pulse">
                    <div className="px-4 py-2 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center space-x-2">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm font-bold">URGENT</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5">
                <h3 className="text-xl font-semibold mb-3">{email.subject}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-100">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5" />
                    <div>
                      <p className="text-xs opacity-80">From</p>
                      <p className="font-medium">{email.from_name ? `${email.from_name}` : email.from_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5" />
                    <div>
                      <p className="text-xs opacity-80">Received</p>
                      <p className="font-medium">{format(new Date(email.created_at), 'MMM d, yyyy HH:mm')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 ml-6">
              {onProcessRFQ && email.status === 'new' && (
                <button
                  onClick={() => {
                    onProcessRFQ(email);
                    onClose(); // Close the preview modal when processing starts
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl font-semibold transition-all hover:scale-105 flex items-center space-x-2"
                >
                  <Zap className="w-5 h-5" />
                  <span>Process RFQ</span>
                </button>
              )}
              {onReply && (
                <button
                  onClick={() => onReply(email)}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-2xl font-semibold transition-all hover:scale-105 flex items-center space-x-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Reply</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-3 hover:bg-white/10 rounded-2xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Enhanced Analysis Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Priority Score */}
            <div className={`p-6 rounded-2xl border-2 bg-gradient-to-br ${emailAnalysis.priority.bgGrad} ${emailAnalysis.priority.color} relative overflow-hidden`}>
              <div className="absolute top-2 right-2">
                <Target className="w-5 h-5 opacity-50" />
              </div>
              <AlertCircle className="w-8 h-8 mb-3" />
              <p className="text-sm font-bold opacity-80">Priority</p>
              <p className="text-2xl font-black">{emailAnalysis.priority.level}</p>
              <p className="text-xs opacity-60">Score: {emailAnalysis.priorityScore}</p>
            </div>

            {/* Response Time */}
            <div className={`p-6 rounded-2xl border-2 relative overflow-hidden ${
              emailAnalysis.isOverdue 
                ? 'bg-gradient-to-br from-red-50 to-red-100 text-red-700 border-red-300' 
                : 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-green-300'
            }`}>
              <div className="absolute top-2 right-2">
                <Timer className="w-5 h-5 opacity-50" />
              </div>
              <Clock className="w-8 h-8 mb-3" />
              <p className="text-sm font-bold opacity-80">Age</p>
              <p className="text-2xl font-black">{emailAnalysis.emailAge}d</p>
              <p className="text-xs opacity-60">Target: {emailAnalysis.responseTimeTarget}d</p>
            </div>

            {/* Project Type */}
            <div className="p-6 rounded-2xl border-2 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 border-purple-300 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Building className="w-5 h-5 opacity-50" />
              </div>
              <Factory className="w-8 h-8 mb-3" />
              <p className="text-sm font-bold opacity-80">Project Type</p>
              <p className="text-lg font-black text-xs leading-tight">{emailAnalysis.detectedProjectType}</p>
            </div>

            {/* MEP Keywords */}
            <div className="p-6 rounded-2xl border-2 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-300 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Wrench className="w-5 h-5 opacity-50" />
              </div>
              <Tag className="w-8 h-8 mb-3" />
              <p className="text-sm font-bold opacity-80">MEP Keywords</p>
              <p className="text-2xl font-black">{emailAnalysis.foundKeywords.filter(k => k.category === 'mep').length}</p>
            </div>

            {/* Budget Mentioned */}
            <div className="p-6 rounded-2xl border-2 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-300 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <TrendingUp className="w-5 h-5 opacity-50" />
              </div>
              <DollarSign className="w-8 h-8 mb-3" />
              <p className="text-sm font-bold opacity-80">Budget Info</p>
              <p className="text-2xl font-black">{emailAnalysis.extractedInfo.budgets.length > 0 ? '✓' : '—'}</p>
            </div>

            {/* Attachments */}
            <div className="p-6 rounded-2xl border-2 bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border-orange-300 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <FileText className="w-5 h-5 opacity-50" />
              </div>
              <Paperclip className="w-8 h-8 mb-3" />
              <p className="text-sm font-bold opacity-80">Files</p>
              <p className="text-2xl font-black">{email.attachments.length}</p>
            </div>
          </div>

          {/* Intelligent Insights Section */}
          <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 rounded-3xl p-8 border-2 border-indigo-200">
            <h3 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center">
              <Target className="w-7 h-7 mr-3 text-indigo-600" />
              Smart Insights & Recommendations
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Action Items */}
              <div className="bg-white rounded-2xl p-6 border border-indigo-200">
                <h4 className="text-lg font-bold text-indigo-900 mb-4 flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-green-600" />
                  Recommended Actions
                </h4>
                <div className="space-y-3">
                  {emailAnalysis.isOverdue && (
                    <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-xl border border-red-200">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900">Urgent Response Required</p>
                        <p className="text-sm text-red-700">This email is {emailAnalysis.emailAge - emailAnalysis.responseTimeTarget} days overdue</p>
                      </div>
                    </div>
                  )}
                  
                  {email.status === 'new' && (
                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-blue-900">Process RFQ with AI</p>
                        <p className="text-sm text-blue-700">Automatically extract requirements and generate quote</p>
                      </div>
                    </div>
                  )}

                  {emailAnalysis.foundKeywords.length > 3 && (
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-xl border border-green-200">
                      <Award className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900">High-Quality Lead</p>
                        <p className="text-sm text-green-700">Multiple MEP keywords detected - strong RFQ potential</p>
                      </div>
                    </div>
                  )}

                  {emailAnalysis.extractedInfo.budgets.length > 0 && (
                    <div className="flex items-start space-x-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <DollarSign className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-900">Budget Information Available</p>
                        <p className="text-sm text-emerald-700">Client has provided budget details - prioritize response</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Insights */}
              <div className="bg-white rounded-2xl p-6 border border-indigo-200">
                <h4 className="text-lg font-bold text-indigo-900 mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-purple-600" />
                  Key Insights
                </h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">Detected Keywords by Category</p>
                    <div className="flex flex-wrap gap-2">
                      {['request', 'mep', 'equipment'].map(category => {
                        const categoryKeywords = emailAnalysis.foundKeywords.filter(k => k.category === category);
                        return categoryKeywords.length > 0 && (
                          <div key={category} className="text-xs">
                            <span className="font-semibold capitalize text-indigo-700">{category}:</span>
                            <span className="ml-1 text-indigo-600">{categoryKeywords.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {emailAnalysis.urgencyLevel === 'High' && (
                    <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                      <p className="text-sm font-semibold text-orange-900">⚡ Urgent Language Detected</p>
                      <p className="text-xs text-orange-700">Email contains urgent keywords - expedite response</p>
                    </div>
                  )}

                  {emailAnalysis.extractedInfo.squareFootage.length > 0 && (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                      <p className="text-sm font-semibold text-purple-900">📐 Project Size Information</p>
                      <p className="text-xs text-purple-700">Square footage mentioned: {emailAnalysis.extractedInfo.squareFootage.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Information Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Client Intelligence */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl p-8 border-2 border-cyan-200">
              <h3 className="text-2xl font-bold text-cyan-900 mb-6 flex items-center">
                <Users className="w-7 h-7 mr-3 text-cyan-600" />
                Client Intelligence
              </h3>
              
              <div className="space-y-6">
                {/* Structured Contact Information */}
                {emailAnalysis.extractedInfo.contactBlocks.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-cyan-200">
                    <h4 className="text-lg font-bold text-cyan-900 mb-4">Key Contacts</h4>
                    <div className="space-y-4">
                      {emailAnalysis.extractedInfo.contactBlocks.map((contact, index) => (
                        <div key={index} className="p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-cyan-100 rounded-xl">
                              <User className="w-6 h-6 text-cyan-600" />
                            </div>
                            <div className="flex-1">
                              <h5 className="text-lg font-bold text-cyan-900">{contact.name}</h5>
                              <p className="text-cyan-700 font-medium mb-2">{contact.title}</p>
                              <p className="text-cyan-800 font-medium">{contact.company}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Primary Contact (if no structured contacts found) */}
                {emailAnalysis.extractedInfo.contactBlocks.length === 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-cyan-200">
                    <h4 className="text-lg font-bold text-cyan-900 mb-4">Primary Contact</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-cyan-100 rounded-lg">
                          <Mail className="w-4 h-4 text-cyan-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{email.from_email}</p>
                          {email.from_name && <p className="text-sm text-gray-600">{email.from_name}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Names with Titles (if found separately) */}
                {emailAnalysis.extractedInfo.nameWithTitle.length > 0 && emailAnalysis.extractedInfo.contactBlocks.length === 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-cyan-200">
                    <h4 className="text-lg font-bold text-cyan-900 mb-4">Mentioned Personnel</h4>
                    <div className="space-y-2">
                      {emailAnalysis.extractedInfo.nameWithTitle.map((nameTitle, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="p-2 bg-cyan-100 rounded-lg">
                            <User className="w-4 h-4 text-cyan-600" />
                          </div>
                          <span className="font-medium text-gray-900">{nameTitle}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Contacts */}
                {emailAnalysis.extractedInfo.phones.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-cyan-200">
                    <h4 className="text-lg font-bold text-cyan-900 mb-4">Phone Numbers</h4>
                    <div className="space-y-2">
                      {emailAnalysis.extractedInfo.phones.map((phone, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="p-2 bg-cyan-100 rounded-lg">
                            <Phone className="w-4 h-4 text-cyan-600" />
                          </div>
                          <span className="font-medium text-gray-900">{phone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Company Information */}
                {emailAnalysis.extractedInfo.companies.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-cyan-200">
                    <h4 className="text-lg font-bold text-cyan-900 mb-4">Organizations</h4>
                    <div className="space-y-2">
                      {emailAnalysis.extractedInfo.companies.map((company, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="p-2 bg-cyan-100 rounded-lg">
                            <Building className="w-4 h-4 text-cyan-600" />
                          </div>
                          <span className="font-medium text-gray-900">{company}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location Information */}
                {emailAnalysis.extractedInfo.addresses.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-cyan-200">
                    <h4 className="text-lg font-bold text-cyan-900 mb-4">Project Locations</h4>
                    <div className="space-y-3">
                      {emailAnalysis.extractedInfo.addresses.map((address, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="p-2 bg-cyan-100 rounded-lg mt-1">
                            <MapPin className="w-4 h-4 text-cyan-600" />
                          </div>
                          <span className="font-medium text-gray-900 flex-1">{address}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Project Intelligence */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 border-2 border-emerald-200">
              <h3 className="text-2xl font-bold text-emerald-900 mb-6 flex items-center">
                <Building className="w-7 h-7 mr-3 text-emerald-600" />
                Project Intelligence
              </h3>
              
              <div className="space-y-6">
                {/* Project Classification */}
                <div className="bg-white rounded-2xl p-6 border border-emerald-200">
                  <h4 className="text-lg font-bold text-emerald-900 mb-4">Project Classification</h4>
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-emerald-100 rounded-xl">
                      <Factory className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-900">{emailAnalysis.detectedProjectType}</p>
                      <p className="text-sm text-emerald-600">Auto-detected project category</p>
                    </div>
                  </div>
                </div>

                {/* MEP Services Requested */}
                <div className="bg-white rounded-2xl p-6 border border-emerald-200">
                  <h4 className="text-lg font-bold text-emerald-900 mb-4">MEP Services Detected</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {emailAnalysis.foundKeywords.filter(k => k.category === 'mep').map((keyword, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-emerald-50 rounded-lg">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <span className="text-sm font-medium text-emerald-800 capitalize">{keyword.word}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget & Financial Info */}
                {emailAnalysis.extractedInfo.budgets.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-emerald-200">
                    <h4 className="text-lg font-bold text-emerald-900 mb-4">Budget Information</h4>
                    <div className="space-y-2">
                      {emailAnalysis.extractedInfo.budgets.map((budget, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="font-medium text-gray-900">{budget}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline & Deadlines */}
                {emailAnalysis.extractedInfo.deadlines.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-emerald-200">
                    <h4 className="text-lg font-bold text-emerald-900 mb-4">Timeline & Deadlines</h4>
                    <div className="space-y-2">
                      {emailAnalysis.extractedInfo.deadlines.map((deadline, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="p-2 bg-emerald-100 rounded-lg mt-1">
                            <Timer className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className="font-medium text-gray-900 flex-1">{deadline}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments Analysis */}
                {email.attachments.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-emerald-200">
                    <h4 className="text-lg font-bold text-emerald-900 mb-4">Project Documents</h4>
                    <div className="space-y-3">
                      {email.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <Paperclip className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-emerald-900">{attachment.filename || `Document ${index + 1}`}</p>
                            <p className="text-xs text-emerald-600">{attachment.mimeType || 'Unknown format'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing Status */}
                {email.status === 'completed' && (
                  <div className="bg-white rounded-2xl p-6 border border-emerald-200">
                    <h4 className="text-lg font-bold text-emerald-900 mb-4">Processing Complete</h4>
                    <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-xl">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-900">RFQ Processing Complete</p>
                        <p className="text-sm text-emerald-700">This email has been successfully processed</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Email Content Viewer */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 border-2 border-slate-300 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-6">
              <h3 className="text-2xl font-bold flex items-center">
                <FileText className="w-7 h-7 mr-3" />
                Original Email Content
                <span className="ml-auto text-sm opacity-75">
                  {(email.body || email.snippet || '').length} characters
                </span>
              </h3>
            </div>
            
            <div className="p-8">
              {(email.body || email.snippet) ? (
                <div className="bg-white rounded-2xl p-8 shadow-inner border-2 border-slate-200">
                  <div className="prose prose-slate max-w-none">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 font-mono bg-gray-50 p-6 rounded-xl border border-gray-200">
{email.body || email.snippet}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <FileText className="w-20 h-20 text-slate-400 mx-auto mb-6" />
                  <h4 className="text-xl font-bold text-slate-700 mb-2">No Content Available</h4>
                  <p className="text-slate-600">Only metadata is available for this email</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}