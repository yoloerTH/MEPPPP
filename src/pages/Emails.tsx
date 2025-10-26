import React, { useEffect, useState, useMemo } from 'react';
import { 
  Mail, 
  Paperclip, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
  Search,
  Calendar,
  Eye,
  User,
  Building,
  Tag,
  Zap,
  Brain,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Users,
  MessageSquare,
  Settings,
  X,
  Filter,
  Reply,
  CornerDownRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { gmailService } from '../lib/gmail';
import { useGmailAuth } from '../hooks/useGmailAuth';
import { format, differenceInDays, isToday, isYesterday } from 'date-fns';
import ProcessingModal from '../components/ProcessingModal';
import AddEmailModal from '../components/AddEmailModal';
import ErrorModal from '../components/ErrorModal';
import EmailPreviewModal from '../components/EmailPreviewModal';

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
  priority_score?: number;
  response_deadline?: string;
  tags?: string[];
  emailType?: {
    isReply: boolean;
    isOriginal: boolean;
    replyType: string | null;
  };
}

interface EmailThread {
  thread_id: string;
  emails: Email[];
  latest_email: Email;
  total_count: number;
  unread_count: number;
  has_rfq: boolean;
}

interface ClientGroup {
  client_email: string;
  client_name?: string;
  company?: string;
  emails: Email[];
  latest_date: string;
  unread_count: number;
}

// Consolidated filters state
interface Filters {
  search: string;
  status: string;
  priority: string;
  client: string;
  dateRange: string;
  unreadOnly: boolean;
  hasAttachments: boolean;
  emailType: string; // 'all', 'original', 'replies'
}

export default function Emails() {
  // Core state
  const [emails, setEmails] = useState<Email[]>([]);
  const [gmailEmails, setGmailEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [gmailLoading, setGmailLoading] = useState(false);
  
  // Processing state
  const [processingEmailId, setProcessingEmailId] = useState<string | null>(null);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [selectedEmailForPreview, setSelectedEmailForPreview] = useState<Email | null>(null);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'error' | 'timeout' | 'network';
    onRetry?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error'
  });
  
  // UI state - consolidated filters
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    priority: 'all',
    client: 'all',
    dateRange: 'all',
    unreadOnly: false,
    hasAttachments: false,
    emailType: 'all'
  });
  
  const [viewMode, setViewMode] = useState<'list' | 'thread' | 'client'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);

  const { 
    isGmailConnected, 
    isLoading: gmailAuthLoading, 
    error: gmailError,
    connectGmail,
    userEmail,
    accessToken
  } = useGmailAuth();

  useEffect(() => {
    loadEmails();
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (isGmailConnected && !gmailAuthLoading) {
      loadGmailEmails();
    }
  }, [isGmailConnected, gmailAuthLoading]);

  useEffect(() => {
    if (autoRefresh && isGmailConnected) {
      const interval = setInterval(loadGmailEmails, 120000); // 2 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isGmailConnected]);

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
    } else {
      setCurrentUser(user);
    }
  };

  const loadEmails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEmails([]);
        return;
      }

      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const enhancedEmails = (data || []).map(email => ({
        ...email,
        ...generateEmailInsights(email),
        tags: generateSmartTags(email)
      }));
      
      // Add email type detection after all emails are loaded
      const emailsWithTypes = enhancedEmails.map(email => ({
        ...email,
        emailType: detectEmailType(email, enhancedEmails)
      }));
      
      setEmails(emailsWithTypes);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGmailEmails = async () => {
    if (!isGmailConnected) return;
    
    setGmailLoading(true);
    try {
      const gmailData = await gmailService.fetchRFQEmails(50);
      
      const convertedEmails: Email[] = gmailData.map(gmail => ({
        id: `gmail-${gmail.gmail_id}`,
        gmail_id: gmail.gmail_id,
        subject: gmail.subject,
        from_email: gmail.from_email,
        from_name: gmail.from_name,
        body: gmail.body,
        snippet: gmail.snippet,
        attachments: gmail.attachments,
        status: 'new' as const,
        created_at: gmail.received_date,
        is_gmail: true,
        is_unread: gmail.is_unread,
        thread_id: gmail.thread_id,
        ...generateEmailInsights(gmail),
        tags: generateSmartTags(gmail)
      }));

      // Add email type detection after all emails are converted
      const emailsWithTypes = convertedEmails.map(email => ({
        ...email,
        emailType: detectEmailType(email, convertedEmails)
      }));

      setGmailEmails(emailsWithTypes);
    } catch (error) {
      console.error('Error loading Gmail emails:', error);
      if (!error.message.includes('quota') && !error.message.includes('timeout')) {
        setErrorModal({
          isOpen: true,
          title: 'Gmail Connection Error',
          message: `Unable to fetch emails from Gmail: ${error.message}`,
          type: 'network',
          onRetry: () => {
            setErrorModal(prev => ({ ...prev, isOpen: false }));
            loadGmailEmails();
          }
        });
      }
    } finally {
      setGmailLoading(false);
    }
  };

  // Simplified AI insights generation (without money estimation)
  const generateEmailInsights = (email: any) => {
    const content = (email.subject + ' ' + (email.body || email.snippet || '')).toLowerCase();
    
    // Priority scoring based on content and urgency
    let priorityScore = 0;
    const urgencyKeywords = ['urgent', 'asap', 'rush', 'emergency', 'immediate'];
    const rfqKeywords = ['rfq', 'quotation', 'quote', 'tender', 'proposal'];
    const importantKeywords = ['deadline', 'critical', 'important', 'priority'];
    
    urgencyKeywords.forEach(keyword => {
      if (content.includes(keyword)) priorityScore += 3;
    });
    
    rfqKeywords.forEach(keyword => {
      if (content.includes(keyword)) priorityScore += 4;
    });
    
    importantKeywords.forEach(keyword => {
      if (content.includes(keyword)) priorityScore += 2;
    });
    
    if (email.attachments?.length > 0) priorityScore += 2;
    if (email.is_unread) priorityScore += 1;
    
    // Response deadline calculation
    const deadlineKeywords = ['deadline', 'due', 'need by', 'required by'];
    const hasDeadline = deadlineKeywords.some(keyword => content.includes(keyword));
    const responseDeadline = hasDeadline ? 
      new Date(Date.now() + (urgencyKeywords.some(k => content.includes(k)) ? 1 : 3) * 24 * 60 * 60 * 1000).toISOString() : 
      undefined;
    
    return {
      priority_score: priorityScore,
      response_deadline: responseDeadline
    };
  };

  // Simplified smart tagging system
  const generateSmartTags = (email: any) => {
    const content = (email.subject + ' ' + (email.body || email.snippet || '')).toLowerCase();
    const tags = [];
    
    // Technical tags
    if (content.match(/hvac|air.conditioning|heating|cooling|ventilation/)) tags.push('HVAC');
    if (content.match(/electrical|wiring|power|lighting/)) tags.push('Electrical');
    if (content.match(/plumbing|water|drainage|pipes/)) tags.push('Plumbing');
    
    // Project type tags
    if (content.match(/office|commercial|business/)) tags.push('Commercial');
    if (content.match(/residential|apartment|home|house/)) tags.push('Residential');
    if (content.match(/industrial|factory|warehouse|manufacturing/)) tags.push('Industrial');
    
    // Urgency and status tags
    if (content.match(/urgent|asap|rush|emergency|immediate/)) tags.push('Urgent');
    if (content.match(/rfq|quotation|quote|tender|proposal/)) tags.push('RFQ');
    if (email.attachments?.length > 0) tags.push('Has-Attachments');
    
    return tags;
  };

  // Smart email type detection
  const detectEmailType = (email: any, allEmails: Email[]) => {
    const subject = email.subject || '';
    
    // Check for reply indicators in subject
    const isReplyBySubject = /^(re:|reply:|fwd?:|fw:)/i.test(subject.trim());
    
    // Check if this email is part of a thread with earlier emails
    const threadEmails = allEmails.filter(e => 
      e.thread_id === email.thread_id && e.thread_id !== undefined
    ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const isReplyByThread = threadEmails.length > 1 && 
      threadEmails.findIndex(e => e.gmail_id === email.gmail_id) > 0;
    
    // Check for reply content patterns
    const content = (email.body || email.snippet || '').toLowerCase();
    const hasReplyPatterns = content.includes('wrote:') || 
      content.includes('on ') && content.includes('at ') && content.includes('wrote:') ||
      content.includes('-----original message-----') ||
      content.includes('from:') && content.includes('sent:') && content.includes('to:');
    
    const isReply = isReplyBySubject || isReplyByThread || hasReplyPatterns;
    
    return {
      isReply,
      isOriginal: !isReply,
      replyType: isReplyBySubject ? 'subject' : isReplyByThread ? 'thread' : hasReplyPatterns ? 'content' : null
    };
  };

  // Combined and filtered emails
  const allEmails = useMemo(() => [...emails, ...gmailEmails], [emails, gmailEmails]);

  // Simplified filtering logic
  const filteredEmails = useMemo(() => {
    let filtered = allEmails;
    
    // Text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(email => 
        email.subject.toLowerCase().includes(searchLower) ||
        email.from_email.toLowerCase().includes(searchLower) ||
        email.from_name?.toLowerCase().includes(searchLower) ||
        (email.body || email.snippet || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(email => email.status === filters.status);
    }
    
    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(email => {
        const score = email.priority_score || 0;
        switch (filters.priority) {
          case 'critical': return score >= 15;
          case 'high': return score >= 10 && score < 15;
          case 'medium': return score >= 5 && score < 10;
          case 'low': return score < 5;
          default: return true;
        }
      });
    }
    
    // Client filter
    if (filters.client !== 'all') {
      filtered = filtered.filter(email => email.from_email === filters.client);
    }
    
    // Date filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(email => {
        const emailDate = new Date(email.created_at);
        switch (filters.dateRange) {
          case 'today': return isToday(emailDate);
          case 'yesterday': return isYesterday(emailDate);
          case 'week': return differenceInDays(now, emailDate) <= 7;
          case 'month': return differenceInDays(now, emailDate) <= 30;
          default: return true;
        }
      });
    }
    
    // Unread filter
    if (filters.unreadOnly) {
      filtered = filtered.filter(email => email.is_unread);
    }
    
    // Attachments filter
    if (filters.hasAttachments) {
      filtered = filtered.filter(email => email.attachments.length > 0);
    }
    
    // Email type filter (original vs replies)
    if (filters.emailType !== 'all') {
      filtered = filtered.filter(email => {
        if (filters.emailType === 'original') {
          return email.emailType?.isOriginal;
        } else if (filters.emailType === 'replies') {
          return email.emailType?.isReply;
        }
        return true;
      });
    }
    
    // Sort by date first (most recent first), then by unread status
    return filtered.sort((a, b) => {
      // Primary sort: Most recent first
      const dateDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (dateDiff !== 0) return dateDiff;
      
      // Secondary sort: Unread emails first if same date
      if (a.is_unread && !b.is_unread) return -1;
      if (b.is_unread && !a.is_unread) return 1;
      
      // Tertiary sort: Higher priority first if same date and read status
      return (b.priority_score || 0) - (a.priority_score || 0);
    });
  }, [allEmails, filters]);

  // Get unique clients for filter dropdown
  const uniqueClients = useMemo(() => {
    const clientsMap = new Map<string, { name?: string; count: number }>();
    allEmails.forEach(email => {
      const key = email.from_email;
      if (!clientsMap.has(key)) {
        clientsMap.set(key, { name: email.from_name, count: 0 });
      }
      clientsMap.get(key)!.count++;
    });
    
    return Array.from(clientsMap.entries())
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [allEmails]);

  // Threading logic
  const groupEmailsByThread = (emails: Email[]): EmailThread[] => {
    const threads = new Map<string, Email[]>();
    
    emails.forEach(email => {
      const threadId = email.thread_id || email.gmail_id;
      if (!threads.has(threadId)) {
        threads.set(threadId, []);
      }
      threads.get(threadId)!.push(email);
    });
    
    return Array.from(threads.entries()).map(([thread_id, threadEmails]) => {
      const sortedEmails = threadEmails.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      return {
        thread_id,
        emails: sortedEmails,
        latest_email: sortedEmails[0],
        total_count: sortedEmails.length,
        unread_count: sortedEmails.filter(e => e.is_unread).length,
        has_rfq: sortedEmails.some(e => e.tags?.includes('RFQ'))
      };
    });
  };

  // Client grouping logic
  const groupEmailsByClient = (emails: Email[]): ClientGroup[] => {
    const clients = new Map<string, Email[]>();
    
    emails.forEach(email => {
      const clientKey = email.from_email;
      if (!clients.has(clientKey)) {
        clients.set(clientKey, []);
      }
      clients.get(clientKey)!.push(email);
    });
    
    return Array.from(clients.entries()).map(([client_email, clientEmails]) => {
      const sortedEmails = clientEmails.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      return {
        client_email,
        client_name: sortedEmails[0].from_name,
        company: extractCompanyFromEmails(clientEmails),
        emails: sortedEmails,
        latest_date: sortedEmails[0].created_at,
        unread_count: clientEmails.filter(e => e.is_unread).length
      };
    }).sort((a, b) => new Date(b.latest_date).getTime() - new Date(a.latest_date).getTime());
  };

  const extractCompanyFromEmails = (emails: Email[]): string | undefined => {
    for (const email of emails) {
      const content = email.body || email.snippet || '';
      const companyMatch = content.match(/([A-Z][a-zA-Z\s&]+(?:Ltd|LLC|Inc|Corp|Company|Co\.|Limited))/);
      if (companyMatch) return companyMatch[1];
    }
    return undefined;
  };

  const processRFQ = async (email: Email) => {
    setProcessingEmailId(email.gmail_id);
    setShowProcessingModal(true);
    setProcessingResult(null);
    setProcessingError(null);
    
    try {
      if (!accessToken) {
        throw new Error('Gmail access token not available. Please reconnect Gmail.');
      }

      if (!currentUser) {
        throw new Error('User authentication required. Please sign in again.');
      }

      const requestPayload = { 
        emailId: email.gmail_id,
        isGmailEmail: email.is_gmail || true,
        accessToken: accessToken,
        userId: currentUser.id,
        connectedGmail: userEmail,
        emailData: {
          subject: email.subject,
          from_email: email.from_email,
          from_name: email.from_name || '',
          body: email.body || email.snippet || '',
          snippet: email.snippet || '',
          attachments: email.attachments || [],
          created_at: email.created_at,
          is_unread: email.is_unread,
          thread_id: email.thread_id
        }
      };
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 160000);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-rfq`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });

      clearTimeout(timeout);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Processing failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      setProcessingResult(result);
      
      if (!result.success) {
        setProcessingError(result.error);
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        setProcessingError('Analysis timed out. Please try again.');
      } else {
        setProcessingError(error.message || 'An unexpected error occurred. Please try again.');
      }
    }
  };

  const closeProcessingModal = () => {
    setProcessingEmailId(null);
    setProcessingResult(null);
    setProcessingError(null);
    setShowProcessingModal(false);
    loadEmails();
    if (isGmailConnected) {
      loadGmailEmails();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'clarification_sent':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getPriorityBadge = (score: number) => {
    if (score >= 15) return { level: 'Critical', color: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500' };
    if (score >= 10) return { level: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300', dot: 'bg-orange-500' };
    if (score >= 5) return { level: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500' };
    return { level: 'Low', color: 'bg-green-100 text-green-800 border-green-300', dot: 'bg-green-500' };
  };

  const formatRelativeDate = (date: string) => {
    const emailDate = new Date(date);
    if (isToday(emailDate)) return 'Today';
    if (isYesterday(emailDate)) return 'Yesterday';
    const days = differenceInDays(new Date(), emailDate);
    if (days <= 7) return `${days} days ago`;
    return format(emailDate, 'MMM d, yyyy');
  };

  const updateFilters = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      priority: 'all',
      client: 'all',
      dateRange: 'all',
      unreadOnly: false,
      hasAttachments: false,
      emailType: 'all'
    });
  };

  const previewEmail = (email: Email) => {
    setSelectedEmailForPreview(email);
    setShowEmailPreview(true);
  };

  const renderEmailCard = (email: Email, isInThread = false) => {
    const priority = getPriorityBadge(email.priority_score || 0);
    const isOverdue = email.response_deadline && new Date(email.response_deadline) < new Date();
    const isReply = email.emailType?.isReply || false;
    const isUnread = email.is_unread || false;
    
    // Dynamic styling based on email type and read status
    const getCardStyling = () => {
      if (isReply && isUnread) {
        return 'border-purple-300 bg-gradient-to-r from-purple-50 to-violet-50 ring-2 ring-purple-100';
      } else if (isReply) {
        return 'border-purple-200 bg-purple-50';
      } else if (isUnread) {
        return 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 ring-2 ring-blue-100';
      } else {
        return 'border-gray-200 hover:border-gray-300';
      }
    };
    
    return (
      <div 
        key={email.id} 
        className={`bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-xl group ${getCardStyling()} ${isInThread ? 'ml-8 mt-3' : 'p-6'}`}
      >
        <div className={`${isInThread ? 'p-4' : ''}`}>
          {/* Email Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                {/* Email Type Icon */}
                {isReply ? (
                  <div className="flex items-center space-x-1">
                    <CornerDownRight className="w-5 h-5 text-purple-600" />
                    {getStatusIcon(email.status)}
                  </div>
                ) : (
                  getStatusIcon(email.status)
                )}
                
                {/* Subject with Reply Indicator */}
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">
                    {isReply && !email.subject.toLowerCase().startsWith('re:') ? 'Re: ' : ''}
                    {email.subject}
                  </h3>
                  
                  {/* Email Type Badge */}
                  {isReply && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      <Reply className="w-3 h-3 mr-1" />
                      Reply
                    </span>
                  )}
                  
                  {/* Unread Indicator */}
                  {isUnread && (
                    <div className={`w-3 h-3 rounded-full ${isReply ? 'bg-purple-500' : 'bg-blue-500'} animate-pulse`} title="Unread"></div>
                  )}
                </div>
                
                {/* Priority Badge */}
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold border ${priority.color}`}>
                  <div className={`w-2 h-2 rounded-full ${priority.dot}`}></div>
                  <span>{priority.level}</span>
                </div>
                
                {isOverdue && (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                    <AlertTriangle className="w-3 h-3" />
                    <span>OVERDUE</span>
                  </div>
                )}
              </div>
              
              {/* Email Info */}
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span className={`font-medium ${isUnread ? 'text-gray-900' : ''}`}>
                    {email.from_name ? `${email.from_name}` : email.from_email}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span className={isUnread ? 'text-gray-900 font-medium' : ''}>{formatRelativeDate(email.created_at)}</span>
                </div>
                {email.attachments.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Paperclip className="w-4 h-4" />
                    <span>{email.attachments.length}</span>
                  </div>
                )}
                {/* Email Type Indicator */}
                {isReply && email.emailType?.replyType && (
                  <div className="flex items-center space-x-1 text-purple-600">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {email.emailType.replyType === 'thread' ? 'Thread Reply' : 
                       email.emailType.replyType === 'subject' ? 'Subject Reply' : 'Content Reply'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {email.status === 'new' && (
                <button
                  onClick={() => processRFQ(email)}
                  disabled={processingEmailId === email.gmail_id}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg"
                >
                  {processingEmailId === email.gmail_id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="w-4 h-4 mr-2" />
                  )}
                  AI Process
                </button>
              )}
              
              <button
                onClick={() => previewEmail(email)}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </button>
            </div>
          </div>
          
          {/* Smart Tags */}
          {email.tags && email.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {email.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {/* Email Preview */}
          {(email.snippet || email.body) && (
            <div className={`rounded-xl p-4 border ${
              isReply ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-200'
            }`}>
              <p className={`text-sm leading-relaxed line-clamp-3 ${
                isUnread ? 'text-gray-800 font-medium' : 'text-gray-700'
              }`}>
                {email.snippet || email.body?.substring(0, 200)}
                {(email.body?.length || 0) > 200 && '...'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderThreadView = () => {
    const threads = groupEmailsByThread(filteredEmails);
    
    return (
      <div className="space-y-6">
        {threads.map(thread => (
          <div key={thread.thread_id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Thread Header */}
            <div 
              className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 cursor-pointer hover:from-gray-100 hover:to-blue-100 transition-all"
              onClick={() => {
                const newExpanded = new Set(expandedThreads);
                if (newExpanded.has(thread.thread_id)) {
                  newExpanded.delete(thread.thread_id);
                } else {
                  newExpanded.add(thread.thread_id);
                }
                setExpandedThreads(newExpanded);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {expandedThreads.has(thread.thread_id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{thread.latest_email.subject}</h3>
                    <p className="text-sm text-gray-600">
                      {thread.total_count} email{thread.total_count !== 1 ? 's' : ''} • 
                      {thread.unread_count > 0 && ` ${thread.unread_count} unread • `}
                      Latest: {formatRelativeDate(thread.latest_email.created_at)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {thread.has_rfq && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                      RFQ Thread
                    </span>
                  )}
                  {thread.unread_count > 0 && (
                    <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold">
                      {thread.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Thread Emails */}
            {expandedThreads.has(thread.thread_id) && (
              <div className="p-6 space-y-4">
                {thread.emails.map(email => renderEmailCard(email, true))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderClientView = () => {
    const clientGroups = groupEmailsByClient(filteredEmails);
    
    return (
      <div className="space-y-6">
        {clientGroups.map(client => (
          <div key={client.client_email} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Client Header */}
            <div 
              className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200 cursor-pointer hover:from-emerald-100 hover:to-teal-100 transition-all"
              onClick={() => {
                const newExpanded = new Set(expandedClients);
                if (newExpanded.has(client.client_email)) {
                  newExpanded.delete(client.client_email);
                } else {
                  newExpanded.add(client.client_email);
                }
                setExpandedClients(newExpanded);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {expandedClients.has(client.client_email) ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <Users className="w-6 h-6 text-emerald-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {client.client_name || client.client_email}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>{client.emails.length} email{client.emails.length !== 1 ? 's' : ''}</span>
                      {client.company && <span>{client.company}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">
                    Latest: {formatRelativeDate(client.latest_date)}
                  </span>
                  {client.unread_count > 0 && (
                    <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold">
                      {client.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Client Emails */}
            {expandedClients.has(client.client_email) && (
              <div className="p-6 space-y-4">
                {client.emails.map(email => renderEmailCard(email, true))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading || gmailAuthLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
            Email Management
          </h1>
          <p className="text-gray-600 mt-2">AI-powered RFQ processing and email organization</p>
          {userEmail && (
            <p className="text-sm text-blue-600 flex items-center mt-2">
              <User className="w-4 h-4 mr-1" />
              Connected as: {userEmail}
            </p>
          )}
        </div>
        <div className="flex space-x-3">
          {isGmailConnected ? (
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Auto-refresh</span>
              </label>
              <button
                onClick={loadGmailEmails}
                disabled={gmailLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {gmailLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 mr-2" />
                )}
                Refresh Gmail
              </button>
            </div>
          ) : (
            <button
              onClick={connectGmail}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg"
            >
              <Mail className="w-5 h-5 mr-2" />
              Connect Gmail
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Email
          </button>
        </div>
      </div>

      {/* Gmail Connection Status */}
      <div className={`p-6 rounded-2xl border-2 ${
        isGmailConnected 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' 
          : 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isGmailConnected ? (
              <Wifi className="w-8 h-8 text-green-600" />
            ) : (
              <WifiOff className="w-8 h-8 text-orange-600" />
            )}
            <div>
              <p className={`text-xl font-bold ${
                isGmailConnected ? 'text-green-900' : 'text-orange-900'
              }`}>
                Gmail Integration {isGmailConnected ? '✅ Connected' : '❌ Disconnected'}
              </p>
              <p className={`text-sm ${
                isGmailConnected ? 'text-green-700' : 'text-orange-700'
              }`}>
                {isGmailConnected 
                  ? `Found ${gmailEmails.length} RFQ emails ready for processing`
                  : 'Connect Gmail to automatically fetch and process RFQ emails'
                }
              </p>
            </div>
          </div>
          {gmailError && (
            <div className="text-sm text-red-600 bg-red-100 px-3 py-1 rounded">
              ⚠️ {gmailError}
            </div>
          )}
        </div>
      </div>

      {/* Analytics */}
      {isGmailConnected && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-blue-600">Total Emails</p>
                <p className="text-2xl font-black text-blue-900">{allEmails.length}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-2xl border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-orange-600">Unread</p>
                <p className="text-2xl font-black text-orange-900">
                  {allEmails.filter(e => e.is_unread).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-2xl border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-purple-600">Replies</p>
                <p className="text-2xl font-black text-purple-900">
                  {allEmails.filter(e => e.emailType?.isReply).length}
                </p>
              </div>
              <Reply className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-green-600">Processed</p>
                <p className="text-2xl font-black text-green-900">
                  {emails.filter(e => e.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-2xl border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-indigo-600">Unique Clients</p>
                <p className="text-2xl font-black text-indigo-900">{uniqueClients.length}</p>
              </div>
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900 flex items-center">
            <Search className="w-5 h-5 mr-2 text-blue-600" />
            Search & Filters
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <button
              onClick={clearAllFilters}
              className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors text-sm"
            >
              <X className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search emails by subject, sender, or content..."
            value={filters.search}
            onChange={(e) => updateFilters('search', e.target.value)}
            className="w-full pl-12 pr-6 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 text-lg bg-white shadow-sm"
          />
        </div>
        
        {/* Filter Controls */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <select
              value={filters.status}
              onChange={(e) => updateFilters('status', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => updateFilters('priority', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={filters.emailType}
              onChange={(e) => updateFilters('emailType', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Types</option>
              <option value="original">Original Emails</option>
              <option value="replies">Replies Only</option>
            </select>

            <select
              value={filters.client}
              onChange={(e) => updateFilters('client', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clients</option>
              {uniqueClients.slice(0, 10).map(client => (
                <option key={client.email} value={client.email}>
                  {client.name || client.email} ({client.count})
                </option>
              ))}
            </select>

            <select
              value={filters.dateRange}
              onChange={(e) => updateFilters('dateRange', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            <label className="flex items-center space-x-2 px-3 py-2">
              <input
                type="checkbox"
                checked={filters.unreadOnly}
                onChange={(e) => updateFilters('unreadOnly', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Unread only</span>
            </label>

            <label className="flex items-center space-x-2 px-3 py-2">
              <input
                type="checkbox"
                checked={filters.hasAttachments}
                onChange={(e) => updateFilters('hasAttachments', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Has attachments</span>
            </label>
          </div>
        )}
        
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            Showing {filteredEmails.length} of {allEmails.length} emails
          </div>
          
          {/* View Mode Selector */}
          <div className="flex rounded-xl border border-gray-300 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Mail className="w-4 h-4 inline mr-2" />
              List
            </button>
            <button
              onClick={() => setViewMode('thread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'thread' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Threads
            </button>
            <button
              onClick={() => setViewMode('client')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'client' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Clients
            </button>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="space-y-6">
        {filteredEmails.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-16 text-center">
            {!isGmailConnected ? (
              <>
                <Mail className="w-20 h-20 text-blue-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Connect Gmail to Get Started</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                  Connect your Gmail account to automatically fetch and process RFQ emails with AI.
                </p>
                <button
                  onClick={connectGmail}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg"
                >
                  <Mail className="w-6 h-6 mr-3" />
                  Connect Gmail
                </button>
              </>
            ) : (
              <>
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-gray-900 mb-4">No emails found</h3>
                <p className="text-gray-600 mb-8">
                  Try adjusting your search or filters, or refresh Gmail to check for new emails.
                </p>
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={clearAllFilters}
                    className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={loadGmailEmails}
                    disabled={gmailLoading}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    {gmailLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-5 h-5 mr-2" />
                    )}
                    Refresh Gmail
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {viewMode === 'list' && filteredEmails.map(email => (
              <div key={email.id} className="group">
                {renderEmailCard(email)}
              </div>
            ))}
            
            {viewMode === 'thread' && renderThreadView()}
            
            {viewMode === 'client' && renderClientView()}
          </div>
        )}
      </div>

      {/* Modals */}
      {showProcessingModal && processingEmailId && (
        <ProcessingModal
          isOpen={true}
          onClose={closeProcessingModal}
          emailId={processingEmailId}
          processingResult={processingResult}
          processingError={processingError}
          onProcessingComplete={(result) => {
            setProcessingResult(result);
          }}
        />
      )}

      {showAddModal && (
        <AddEmailModal
          isOpen={true}
          onClose={() => setShowAddModal(false)}
          onEmailAdded={loadEmails}
        />
      )}
      
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        message={errorModal.message}
        type={errorModal.type}
        onRetry={errorModal.onRetry}
      />

      <EmailPreviewModal
        isOpen={showEmailPreview}
        onClose={() => {
          setShowEmailPreview(false);
          setSelectedEmailForPreview(null);
        }}
        email={selectedEmailForPreview}
        onProcessRFQ={processRFQ}
        onReply={(email) => {
          console.log('Reply to:', email.from_email);
          setShowEmailPreview(false);
        }}
      />
    </div>
  );
}