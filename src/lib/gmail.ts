interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    parts?: Array<{
      mimeType: string;
      body: { data?: string; size?: number; attachmentId?: string };
      parts?: any[];
      filename?: string;
    }>;
    body: { data?: string; size?: number };
  };
  internalDate: string;
}

interface ProcessedEmail {
  gmail_id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  body?: string;
  attachments: any[];
  received_date: string;
  is_unread: boolean;
  thread_id: string;
  snippet: string;
}

interface GmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

class GmailService {
  private accessToken: string | null = null;
  private isInitialized = false;

  constructor() {
    // Initialize when the script loads
    this.initializeWhenReady();
  }

  private async initializeWhenReady() {
    // Wait for gapi to be available
    if (typeof window !== 'undefined' && window.gapi) {
      try {
        await this.initializeGapi();
        this.isInitialized = true;
      } catch (error) {
        console.warn('Gmail API initialization deferred:', error);
      }
    }
  }

  async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    
    // Wait for gapi to be available
    let attempts = 0;
    while (!window.gapi && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.gapi) {
      throw new Error('Google API not available');
    }

    await this.initializeGapi();
    this.isInitialized = true;
  }

  async initializeGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.gapi) {
        reject(new Error('Google API not loaded'));
        return;
      }

      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest'],
            clientId: '97032845059-016f0bcun31cmdcbklarfci9mu3n0hmk.apps.googleusercontent.com'
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    if (window.gapi?.client) {
      window.gapi.client.setToken({ access_token: token });
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      if (!this.accessToken) return false;
      
      const response = await window.gapi.client.gmail.users.getProfile({
        userId: 'me'
      });
      
      return !!response.result;
    } catch (error) {
      console.error('Gmail connection test failed:', error);
      return false;
    }
  }

  async fetchRFQEmails(maxResults: number = 50): Promise<ProcessedEmail[]> {
    if (!this.accessToken) {
      throw new Error('Gmail access token not available');
    }

    try {
      await this.ensureInitialized();
      
      console.log('🔍 Starting enhanced RFQ detection with optimized search...');
      
      // 🚀 OPTIMIZED SEARCH STRATEGIES - More comprehensive and flexible
      const searchStrategies = [
        {
          name: 'Direct RFQ Keywords',
          query: '(RFQ OR "request for quotation" OR "urgent rfq" OR "quotation request" OR "quote request" OR tender OR "proposal request" OR "bid request" OR "estimate request" OR "price quote" OR "cost estimate")',
          priority: 1
        },
        {
          name: 'HVAC + Request Terms',
          query: '(HVAC OR "air conditioning" OR heating OR cooling OR ventilation OR "mechanical systems") AND (quotation OR quote OR request OR estimate OR proposal OR bid OR tender OR "need quote" OR "please provide" OR "looking for")',
          priority: 1
        },
        {
          name: 'Building/Facility Projects',
          query: '(building OR facility OR office OR commercial OR industrial OR plant OR manufacturing OR warehouse OR "business district" OR retrofit OR renovation OR construction) AND (HVAC OR "air conditioning" OR mechanical OR electrical OR MEP OR "building services" OR quotation OR quote)',
          priority: 2
        },
        {
          name: 'Equipment Specific',
          query: '("fan coil" OR "air handling" OR "air handler" OR "refrigeration unit" OR "cooling system" OR "heating system" OR "ventilation system" OR "HVAC system" OR "mechanical equipment" OR chiller OR boiler OR "heat pump" OR "cassette unit")',
          priority: 2
        },
        {
          name: 'Technical Requirements',
          query: '("technical requirements" OR "technical specifications" OR "energy efficient" OR "zone control" OR "temperature control" OR "humidity control" OR "fresh air" OR "server room cooling" OR "precision cooling" OR "24/7 cooling")',
          priority: 2
        },
        {
          name: 'Budget and Timeline',
          query: '(budget OR "around €" OR "approximately €" OR "$" OR "tight deadline" OR "ASAP" OR "urgent" OR "quick turnaround" OR "need by" OR "quotes by" OR "deadline") AND (HVAC OR mechanical OR "air conditioning" OR building OR facility)',
          priority: 3
        },
        {
          name: 'Business Context',
          query: '("facilities manager" OR "facility manager" OR "project manager" OR "maintenance manager" OR "building manager") AND (HVAC OR "air conditioning" OR mechanical OR quotation OR quote OR request)',
          priority: 3
        }
      ];

      const allMessageIds = new Set<string>();
      const searchResults = new Map<string, { priority: number; strategy: string }>();
      
      // Execute all search strategies
      for (const strategy of searchStrategies) {
        const fullQuery = `${strategy.query} -label:sent -from:me`;
        console.log(`📧 ${strategy.name} (Priority ${strategy.priority}):`, fullQuery);
        
        try {
          const response = await window.gapi.client.gmail.users.messages.list({
            userId: 'me',
            q: fullQuery,
            labelIds: ['INBOX'],
            maxResults: Math.ceil(maxResults / 2), // Get more results per strategy
          });

          if (response.result.messages && response.result.messages.length > 0) {
            console.log(`✅ ${strategy.name} found ${response.result.messages.length} emails`);
            response.result.messages.forEach((msg: { id: string }) => {
              allMessageIds.add(msg.id);
              // Track which strategy found each email (for debugging)
              if (!searchResults.has(msg.id) || searchResults.get(msg.id)!.priority > strategy.priority) {
                searchResults.set(msg.id, { priority: strategy.priority, strategy: strategy.name });
              }
            });
          } else {
            console.log(`📭 ${strategy.name} found no emails`);
          }
        } catch (searchError) {
          console.warn(`⚠️ ${strategy.name} failed:`, searchError);
        }
        
        // Small delay between searches
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // 🎯 FALLBACK SEARCH - Cast wider net for recent emails
      console.log('🕷️ Running fallback broad search for recent emails...');
      try {
        const recentDate = new Date();
        recentDate.setMonth(recentDate.getMonth() - 1); // Last month
        const dateString = recentDate.toISOString().split('T')[0].replace(/-/g, '/');
        
        const fallbackQuery = `(subject:(HVAC OR quotation OR RFQ OR quote OR request OR facility OR building OR office OR retrofit OR renovation OR mechanical OR "air conditioning") OR body:(HVAC OR quotation OR RFQ OR quote OR request OR facility OR building OR office OR retrofit OR renovation OR mechanical OR "air conditioning")) -label:sent -from:me after:${dateString}`;
        
        const fallbackResponse = await window.gapi.client.gmail.users.messages.list({
          userId: 'me',
          q: fallbackQuery,
          labelIds: ['INBOX'],
          maxResults: 20,
        });

        if (fallbackResponse.result.messages && fallbackResponse.result.messages.length > 0) {
          console.log(`🎯 Fallback search found ${fallbackResponse.result.messages.length} additional emails`);
          fallbackResponse.result.messages.forEach((msg: { id: string }) => {
            allMessageIds.add(msg.id);
            if (!searchResults.has(msg.id)) {
              searchResults.set(msg.id, { priority: 4, strategy: 'Fallback Recent' });
            }
          });
        }
      } catch (fallbackError) {
        console.warn('⚠️ Fallback search failed:', fallbackError);
      }

      const uniqueMessageIds = Array.from(allMessageIds);
      console.log(`🎯 Total unique emails found: ${uniqueMessageIds.length}`);
      
      // Sort by priority (lower number = higher priority)
      const sortedMessageIds = uniqueMessageIds.sort((a, b) => {
        const aPriority = searchResults.get(a)?.priority || 5;
        const bPriority = searchResults.get(b)?.priority || 5;
        return aPriority - bPriority;
      });
      
      if (sortedMessageIds.length === 0) {
        console.log('📭 No potential RFQ emails found with any search strategy');
        return [];
      }

      // Debug: Show which strategy found each email
      console.log('📊 Email sources:', 
        Array.from(searchResults.entries()).map(([id, info]) => 
          `${id.substring(0, 8)}... (${info.strategy})`
        )
      );

      // Fetch detailed information for each message
      const batchSize = 6; // Even smaller batches for better reliability
      const allEmails: ProcessedEmail[] = [];

      for (let i = 0; i < sortedMessageIds.length; i += batchSize) {
        const batch = sortedMessageIds.slice(i, i + batchSize);
        
        console.log(`📥 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(sortedMessageIds.length/batchSize)} (${batch.length} emails)`);
        
        const emailPromises = batch.map(async (messageId: string) => {
          try {
            console.log(`📧 Fetching Gmail message: ${messageId} (${searchResults.get(messageId)?.strategy})`);
            
            const emailResponse = await window.gapi.client.gmail.users.messages.get({
              userId: 'me',
              id: messageId,
              format: 'full',
            });
            
            const processedEmail = this.formatEmailData(emailResponse.result);
            
            // 🎯 ENHANCED CONTENT FILTERING with more lenient rules
            if (this.isLikelyRFQEmail(processedEmail)) {
              console.log(`✅ Confirmed RFQ email: "${processedEmail.subject}" from ${processedEmail.from_email}`);
              return processedEmail;
            } else {
              console.log(`⚠️ Email filtered out: "${processedEmail.subject}" - Not enough RFQ indicators`);
              return null;
            }
          } catch (error) {
            console.error(`❌ Error fetching email ${messageId}:`, error);
            return null;
          }
        });

        const batchEmails = await Promise.all(emailPromises);
        const validEmails = batchEmails.filter((email): email is ProcessedEmail => email !== null);
        allEmails.push(...validEmails);

        // Progressive delay - longer for later batches
        if (i + batchSize < sortedMessageIds.length) {
          const delay = Math.min(200 + (i / batchSize * 100), 500);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      console.log(`✅ Final RFQ emails processed: ${allEmails.length}`);
      console.log('📧 Final email list:');
      allEmails.forEach((email, index) => {
        console.log(`  ${index + 1}. "${email.subject}" from ${email.from_email} (${email.gmail_id})`);
      });
      
      return allEmails;
      
    } catch (error) {
      console.error('❌ Error fetching Gmail emails:', error);
      
      if (error.status === 401) {
        throw new Error('Gmail access token expired. Please reconnect your account.');
      } else if (error.status === 403) {
        throw new Error('Gmail API quota exceeded. Please try again later.');
      } else if (error.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
      
      throw new Error(`Failed to fetch emails from Gmail: ${error.message}`);
    }
  }

  // 🎯 ENHANCED CONTENT ANALYSIS - More lenient and comprehensive
  private isLikelyRFQEmail(email: ProcessedEmail): boolean {
    const subject = email.subject.toLowerCase();
    const body = (email.body || '').toLowerCase();
    const snippet = email.snippet.toLowerCase();
    const fullText = `${subject} ${body} ${snippet}`;
    
    console.log(`🔍 Analyzing email: "${email.subject}"`);
    console.log(`📝 Content sample: "${fullText.substring(0, 200)}..."`);
    
    // 🚨 SUPER STRONG INDICATORS - Auto-approve if found
    const superStrongIndicators = [
      'rfq',
      'request for quotation',
      'urgent rfq',
      'quotation request',
      'need quotation',
      'require quotation',
      'please provide quotation',
      'need quote',
      'require quote',
      'please provide quote'
    ];

    const hasSuperStrong = superStrongIndicators.some(term => fullText.includes(term));
    if (hasSuperStrong) {
      console.log(`🎯 SUPER STRONG RFQ indicator found! Auto-approved.`);
      return true;
    }

    // 💪 STRONG INDICATORS
    const strongIndicators = [
      'quotation',
      'quote',
      'tender',
      'proposal request',
      'bid request',
      'estimate request',
      'price estimate',
      'cost estimate',
      'please provide',
      'looking for',
      'need by',
      'quotes by',
      'deadline',
      'asap',
      'urgent',
      'budget',
      'around €',
      'approximately €',
      'facilities manager',
      'facility manager',
      'project manager'
    ];

    // 🔧 HVAC/MEP TERMS
    const hvacTerms = [
      'hvac',
      'air conditioning',
      'heating',
      'cooling',
      'ventilation',
      'mechanical systems',
      'electrical systems',
      'plumbing',
      'mep',
      'refrigeration',
      'fan coil',
      'air handling',
      'air handler',
      'chiller',
      'boiler',
      'heat pump',
      'ductwork',
      'building services',
      'mechanical equipment',
      'cassette unit',
      'server room cooling',
      'precision cooling',
      'zone control',
      'temperature control',
      'humidity control',
      'fresh air',
      'energy efficient'
    ];

    // 🏢 PROJECT/FACILITY TERMS
    const projectTerms = [
      'facility',
      'facilities',
      'building',
      'office building',
      'commercial building',
      'plant',
      'factory',
      'manufacturing',
      'industrial',
      'warehouse',
      'office',
      'commercial',
      'business district',
      'project',
      'installation',
      'construction',
      'renovation',
      'retrofit',
      'upgrade',
      'replacement',
      'new system',
      'modern system'
    ];

    // Count matches in each category
    const strongCount = strongIndicators.filter(term => fullText.includes(term)).length;
    const hvacCount = hvacTerms.filter(term => fullText.includes(term)).length;
    const projectCount = projectTerms.filter(term => fullText.includes(term)).length;

    console.log(`📊 Scoring - Strong: ${strongCount}, HVAC: ${hvacCount}, Project: ${projectCount}`);

    // 🎯 FLEXIBLE SCORING SYSTEM
    let score = 0;
    let reasons = [];

    // Score based on matches
    if (strongCount >= 2) { score += 3; reasons.push(`Strong indicators: ${strongCount}`); }
    else if (strongCount >= 1) { score += 2; reasons.push(`Strong indicator: ${strongCount}`); }

    if (hvacCount >= 2) { score += 2; reasons.push(`HVAC terms: ${hvacCount}`); }
    else if (hvacCount >= 1) { score += 1; reasons.push(`HVAC term: ${hvacCount}`); }

    if (projectCount >= 2) { score += 2; reasons.push(`Project terms: ${projectCount}`); }
    else if (projectCount >= 1) { score += 1; reasons.push(`Project term: ${projectCount}`); }

    // Bonus points for specific patterns
    if (subject.includes('rfq') || subject.includes('quotation') || subject.includes('quote')) {
      score += 2;
      reasons.push('RFQ in subject');
    }

    if (fullText.includes('please provide') || fullText.includes('need quote') || fullText.includes('looking for')) {
      score += 1;
      reasons.push('Request language');
    }

    if (fullText.includes('budget') || fullText.includes('€') || fullText.includes('$')) {
      score += 1;
      reasons.push('Budget mentioned');
    }

    if (fullText.includes('deadline') || fullText.includes('asap') || fullText.includes('urgent')) {
      score += 1;
      reasons.push('Urgency indicators');
    }

    // Decision threshold
    const isRFQ = score >= 3;
    
    console.log(`🎯 Final Score: ${score}/10 - ${isRFQ ? 'APPROVED' : 'REJECTED'}`);
    console.log(`📋 Reasons: ${reasons.join(', ')}`);
    
    return isRFQ;
  }

  private formatEmailData(gmailMessage: GmailMessage): ProcessedEmail {
    const headers = gmailMessage.payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const from = headers.find(h => h.name === 'From')?.value || '';
    const date = headers.find(h => h.name === 'Date')?.value || gmailMessage.internalDate;

    // Parse sender email and name
    const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) || from.match(/^(.+)$/);
    const from_name = fromMatch && fromMatch.length > 2 ? fromMatch[1].trim().replace(/"/g, '') : undefined;
    const from_email = fromMatch && fromMatch.length > 2 ? fromMatch[2].trim() : fromMatch?.[1]?.trim() || '';

    // Extract email body
    const body = this.extractEmailBody(gmailMessage.payload);

    // Check for attachments
    const attachments = this.extractAttachments(gmailMessage.payload);

    // Check if email is unread
    const is_unread = gmailMessage.labelIds?.includes('UNREAD') || false;

    console.log(`📧 Processing: "${subject}" from ${from_email} (ID: ${gmailMessage.id})`);
    
    return {
      gmail_id: gmailMessage.id,
      subject,
      from_email,
      from_name,
      body,
      attachments,
      received_date: new Date(parseInt(gmailMessage.internalDate)).toISOString(),
      is_unread,
      thread_id: gmailMessage.threadId,
      snippet: gmailMessage.snippet || '',
    };
  }

  private extractEmailBody(payload: GmailMessage['payload']): string {
    let body = '';

    const extractFromPart = (part: any): string => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return this.decodeBase64(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        return this.stripHtml(this.decodeBase64(part.body.data));
      } else if (part.parts) {
        for (const subPart of part.parts) {
          const subBody = extractFromPart(subPart);
          if (subBody) return subBody;
        }
      }
      return '';
    };

    if (payload.body?.data) {
      body = this.decodeBase64(payload.body.data);
    } else if (payload.parts) {
      for (const part of payload.parts) {
        body = extractFromPart(part);
        if (body) break;
      }
    }

    return body.trim();
  }

  private extractAttachments(payload: GmailMessage['payload']): GmailAttachment[] {
    const attachments: GmailAttachment[] = [];

    const extractFromParts = (parts: any[]) => {
      for (const part of parts) {
        if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId,
          });
        }
        if (part.parts) {
          extractFromParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      extractFromParts(payload.parts);
    }

    return attachments;
  }

  private decodeBase64(data: string): string {
    try {
      // Gmail API returns base64url encoded data
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      return decodeURIComponent(escape(atob(padded)));
    } catch (error) {
      console.error('Error decoding base64 data:', error);
      return '';
    }
  }

  private stripHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      await window.gapi.client.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        removeLabelIds: ['UNREAD'],
      });
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  }

  async getEmailDetails(messageId: string): Promise<ProcessedEmail | null> {
    try {
      await this.ensureInitialized();
      const response = await window.gapi.client.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });
      return this.formatEmailData(response.result);
    } catch (error) {
      console.error('Error fetching email details:', error);
      return null;
    }
  }

  async sendReply(originalMessageId: string, threadId: string, replyContent: string, subject: string, to: string): Promise<boolean> {
    try {
      await this.ensureInitialized();
      
      const email = [
        `To: ${to}`,
        `Subject: Re: ${subject}`,
        `In-Reply-To: ${originalMessageId}`,
        `References: ${originalMessageId}`,
        '',
        replyContent
      ].join('\n');

      const encodedEmail = btoa(unescape(encodeURIComponent(email))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      await window.gapi.client.gmail.users.messages.send({
        userId: 'me',
        resource: {
          raw: encodedEmail,
          threadId: threadId
        }
      });

      return true;
    } catch (error) {
      console.error('Error sending reply:', error);
      return false;
    }
  }
}

export const gmailService = new GmailService();

// Add global type declarations
declare global {
  interface Window {
    gapi: any;
  }
}