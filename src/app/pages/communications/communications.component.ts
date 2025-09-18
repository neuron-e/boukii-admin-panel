import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { ApiCrudService } from '../../../service/crud.service';
import { MailService } from '../mail/services/mail.service';
import { Observable } from 'rxjs';

export interface NewsletterStats {
  totalSubscribers: number;
  totalSent: number;
  openRate: number;
  newThisMonth: number;
}

export interface Newsletter {
  id: number;
  subject: string;
  content: string;
  recipients: number;
  sentDate: Date;
  status: 'draft' | 'sent' | 'scheduled';
  recipients_config?: any;
  created_at?: string;
}

export interface NewsletterTemplate {
  id: string;
  name: string;
  icon: string;
  content: string;
}

export interface CustomTemplate {
  id?: number;
  name: string;
  description?: string;
  subject: string;
  content: string;
  school_id?: number;
  created_at?: string;
  updated_at?: string;
}

// Legacy interfaces for chat functionality
export interface Chat {
  id: number | string;
  name: string;
  lastMessage: string;
  timestamp: Date | string;
  imageUrl?: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: number | string;
  chatId?: number;
  message: string;
  timestamp?: Date;
  sender?: string;
  from?: string;
}

@Component({
  selector: 'vex-communications',
  templateUrl: './communications.component.html',
  styleUrls: ['./communications.component.scss']
})
export class CommunicationsComponent implements OnInit, AfterViewInit {
  @ViewChild('editor') editor!: ElementRef<HTMLDivElement>;

  newsletterForm: FormGroup;
  sending = false;
  selectedTemplate: string | null = null;
  selectedTabIndex = 0; // Controls which tab is active

  newsletterStats: NewsletterStats = {
    totalSubscribers: 0,
    totalSent: 0,
    openRate: 0,
    newThisMonth: 0
  };

  subscriberStats = {
    active: 0,
    inactive: 0,
    vip: 0
  };

  recentNewsletters: Newsletter[] = [];
  draftNewsletters: Newsletter[] = [];
  currentDraftId: number | null = null;

  // Mail system integration
  mails$: Observable<any[]>;
  filteredMails$: Observable<any[]>;

  // Breadcrumbs
  breadcrumbs: any[] = [];

  // Tab labels
  tabLabels = {
    newsletter: '',
    inbox: '',
    analytics: ''
  };

  // Header texts
  headerTexts = {
    centerTitle: '',
    centerDescription: '',
    totalSubscribers: '',
    systemMessages: '',
    systemMessagesDesc: ''
  };

  templates: NewsletterTemplate[] = [
    {
      id: 'welcome',
      name: 'communications.template_welcome',
      icon: 'waving_hand',
      content: this.translateService.instant('communications.template_welcome_content')
    },
    {
      id: 'promotion',
      name: 'communications.template_promotion',
      icon: 'local_offer',
      content: this.translateService.instant('communications.template_promotion_content')
    },
    {
      id: 'newsletter',
      name: 'communications.template_newsletter',
      icon: 'newspaper',
      content: this.translateService.instant('communications.template_newsletter_content')
    },
    {
      id: 'event',
      name: 'communications.template_event',
      icon: 'event',
      content: this.translateService.instant('communications.template_event_content')
    }
  ];

  // Template Management Properties
  @ViewChild('templateEditor') templateEditor!: ElementRef<HTMLDivElement>;
  showCreateTemplateModal = false;
  editingTemplate: CustomTemplate | null = null;
  templateForm!: FormGroup;
  isSavingTemplate = false;
  customTemplates: CustomTemplate[] = [];
  allTemplates: (NewsletterTemplate | CustomTemplate)[] = [];

  constructor(
    private fb: FormBuilder,
    private crudService: ApiCrudService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translateService: TranslateService,
    private mailService: MailService
  ) {
    this.createForm();
    this.mails$ = this.mailService.mails$;
    // Initialize filteredMails$ with mails$ as default
    this.filteredMails$ = this.mailService.mails$;
  }

  ngOnInit(): void {

    // Initialize breadcrumbs with translated text
    this.breadcrumbs = [
      {icon:'comunicacion'},
      {text: this.translateService.instant('communications.title'), title: true}
    ];

    // Initialize tab labels
    this.tabLabels = {
      newsletter: this.translateService.instant('communications.newsletter'),
      inbox: this.translateService.instant('communications.inbox'),
      analytics: this.translateService.instant('communications.analytics')
    };

    // Initialize header texts
    this.headerTexts = {
      centerTitle: this.translateService.instant('communications.center_title'),
      centerDescription: this.translateService.instant('communications.center_description'),
      totalSubscribers: this.translateService.instant('communications.total_subscribers'),
      systemMessages: this.translateService.instant('communications.system_messages'),
      systemMessagesDesc: this.translateService.instant('communications.system_messages_desc')
    };

    this.loadNewsletterStats();
    this.loadRecentNewsletters();
    this.loadDraftNewsletters();
    this.loadCustomTemplates();
    this.loadSubscriberStats();

    // Force mail service to load data
    this.mailService.getData();
  }

  ngAfterViewInit(): void {
    // Configure the rich text editor after view initialization
    if (this.editor && this.editor.nativeElement) {
      const editorElement = this.editor.nativeElement;

      // Set initial properties to prevent text alignment issues
      editorElement.style.textAlign = 'left';
      editorElement.style.direction = 'ltr';

      // Add event listeners to maintain cursor position
      editorElement.addEventListener('keydown', (event) => {
        // Handle special key combinations that might affect alignment
        if (event.ctrlKey || event.metaKey) {
          // Store selection before potential formatting
          setTimeout(() => {
            if (document.activeElement === editorElement) {
              editorElement.focus();
            }
          }, 0);
        }
      });

      // Prevent paste from messing up alignment
      editorElement.addEventListener('paste', (event) => {
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') || '';
        if (text) {
          document.execCommand('insertText', false, text);
          this.updateFormContent();
        }
      });
    }
  }

  private createForm(): void {
    this.newsletterForm = this.fb.group({
      subject: ['', Validators.required],
      recipients: [['all'], Validators.required],
      content: [''],
      template: ['']
    });

    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      subject: ['', Validators.required],
      content: ['', Validators.required]
    });
  }

  private loadNewsletterStats(): void {
    this.crudService.get('/admin/newsletters/stats').subscribe({
      next: (response) => {
        const data = response.data || {};
        this.newsletterStats = {
          totalSubscribers: data.totalSubscribers || 0,
          totalSent: data.totalSent || 0,
          openRate: data.openRate || 0,
          newThisMonth: data.newThisMonth || 0
        };
      },
      error: (error) => {
        console.error('Error loading newsletter stats:', error);
        // Fallback to default values
        this.newsletterStats = {
          totalSubscribers: 0,
          totalSent: 0,
          openRate: 0,
          newThisMonth: 0
        };
      }
    });
  }

  private loadRecentNewsletters(): void {
    this.crudService.get('/admin/newsletters?status=sent').subscribe({
      next: (response) => {
        // Handle both paginated and non-paginated responses
        this.recentNewsletters = response.data?.data || response.data || [];
        console.log('Loaded recent newsletters (sent):', this.recentNewsletters.length);
      },
      error: (error) => {
        console.error('Error loading recent newsletters:', error);
        // Try alternative endpoint if first fails
        this.crudService.get('/admin/newsletters/recent?status=sent').subscribe({
          next: (response) => {
            this.recentNewsletters = response.data || [];
          },
          error: (fallbackError) => {
            console.error('Fallback error:', fallbackError);
            this.recentNewsletters = [];
          }
        });
      }
    });
  }

  private loadDraftNewsletters(): void {
    this.crudService.get('/admin/newsletters?status=draft').subscribe({
      next: (response) => {
        // Handle both paginated and non-paginated responses
        this.draftNewsletters = response.data?.data || response.data || [];
        console.log('Loaded draft newsletters:', this.draftNewsletters.length);
      },
      error: (error) => {
        console.error('Error loading draft newsletters:', error);
        this.draftNewsletters = [];
      }
    });
  }

  private reloadAllNewsletterData(): void {
    console.log('Reloading all newsletter data...');
    this.loadRecentNewsletters();
    this.loadDraftNewsletters();
    this.loadNewsletterStats();
  }

  private loadSubscriberStats(): void {
    // Load active clients (those with active bookings)
    this.crudService.get('/admin/clients/stats').subscribe({
      next: (response) => {
        const data = response.data || {};
        this.subscriberStats = {
          active: data.active || 0,
          inactive: data.inactive || 0,
          vip: data.vip || 0
        };
      },
      error: (error) => {
        console.error('Error loading subscriber stats:', error);
        this.subscriberStats = {
          active: 0,
          inactive: 0,
          vip: 0
        };
      }
    });
  }

  // Rich Text Editor Methods
  formatText(command: string): void {
    if (this.editor && this.editor.nativeElement) {
      this.editor.nativeElement.focus();

      // Store current selection
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);

      document.execCommand(command, false);

      // Restore focus and update content
      this.editor.nativeElement.focus();
      if (range && selection) {
        try {
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          // Range might be invalid after command, ignore
        }
      }

      this.updateFormContent();
    }
  }

  insertLink(): void {
    const url = prompt(this.translateService.instant('communications.insert_url_prompt'));
    if (url) {
      document.execCommand('createLink', false, url);
      this.updateFormContent();
    }
  }

  onContentChange(event: Event): void {
    // Store cursor position before updating
    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);

    this.updateFormContent();

    // Restore cursor position after a small delay
    setTimeout(() => {
      if (this.editor && range && selection) {
        try {
          this.editor.nativeElement.focus();
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          // If range is invalid, just focus the editor
          this.editor.nativeElement.focus();
        }
      }
    }, 0);
  }

  private updateFormContent(): void {
    if (this.editor) {
      const content = this.editor.nativeElement.innerHTML;
      this.newsletterForm.patchValue({ content });
    }
  }

  // Template Methods
  selectTemplate(template: NewsletterTemplate): void {
    this.selectedTemplate = template.id;
    if (this.editor) {
      this.editor.nativeElement.innerHTML = template.content;
      this.updateFormContent();
    }
  }

  // Newsletter Actions
  saveDraft(): void {
    // Update content from editor before validation
    this.updateFormContent();

    if (!this.newsletterForm.valid) {
      this.markFormGroupTouched();
      this.snackBar.open(
        this.translateService.instant('communications.form_incomplete'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    const formData = {
      ...this.newsletterForm.value,
      status: 'draft',
      recipients_config: {
        type: this.newsletterForm.value.recipients
      }
    };

    this.crudService.create('/admin/newsletters', formData).subscribe({
      next: (response) => {
        this.snackBar.open(
          this.translateService.instant('communications.draft_saved'),
          'OK',
          { duration: 3000 }
        );
        this.reloadAllNewsletterData();
      },
      error: (error) => {
        console.error('Error saving draft:', error);
        this.snackBar.open(
          this.translateService.instant('snackbar.error'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  previewNewsletter(): void {
    // Update content from editor before preview
    this.updateFormContent();

    if (!this.newsletterForm.valid) {
      this.markFormGroupTouched();
      this.snackBar.open(
        this.translateService.instant('communications.form_incomplete'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    this.showNewsletterPreview = true;
    this.previewContent = {
      subject: this.newsletterForm.get('subject')?.value || '',
      content: this.newsletterForm.get('content')?.value || '',
      recipients: this.newsletterForm.get('recipients')?.value || []
    };
  }

  closePreview(): void {
    this.showNewsletterPreview = false;
    this.previewContent = {};
  }

  sendNewsletter(): void {
    if (!this.newsletterForm.valid) {
      this.markFormGroupTouched();
      return;
    }

    this.sending = true;
    const formData = {
      ...this.newsletterForm.value,
      status: 'sending',
      recipients_config: {
        type: this.newsletterForm.value.recipients
      }
    };

    this.crudService.post('/admin/newsletters/send', formData).subscribe({
      next: (response) => {
        this.sending = false;

        // Auto-delete draft if we were using one
        if (this.currentDraftId) {
          this.autoDeleteDraft(this.currentDraftId);
        }

        this.snackBar.open(
          this.translateService.instant('communications.newsletter_sent'),
          'OK',
          { duration: 3000 }
        );

        // Reset form after successful send
        this.newsletterForm.reset();
        this.selectedTemplate = null;
        this.currentDraftId = null;
        if (this.editor) {
          this.editor.nativeElement.innerHTML = '';
        }

        // Reload data
        this.reloadAllNewsletterData();
      },
      error: (error) => {
        this.sending = false;
        console.error('Error sending newsletter:', error);
        this.snackBar.open(
          this.translateService.instant('snackbar.error'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  // Recent Newsletters Actions
  viewNewsletter(newsletter: Newsletter): void {
    console.log('View newsletter:', newsletter);
    // For now, redirect to view message functionality until specific newsletter view dialog is created
    this.viewNewsletterDetails(newsletter);
  }

  duplicateNewsletter(newsletter: Newsletter): void {
    this.newsletterForm.patchValue({
      subject: `${this.translateService.instant('communications.copy')} - ${newsletter.subject}`,
      content: newsletter.content
    });

    if (this.editor) {
      this.editor.nativeElement.innerHTML = newsletter.content;
    }

    this.snackBar.open(
      this.translateService.instant('communications.newsletter_duplicated'),
      'OK',
      { duration: 3000 }
    );
  }

  // Draft management methods
  useDraft(draft: Newsletter): void {
    this.currentDraftId = draft.id;
    this.newsletterForm.patchValue({
      subject: draft.subject,
      content: draft.content,
      recipients: draft.recipients_config || []
    });

    if (this.editor) {
      this.editor.nativeElement.innerHTML = draft.content;
    }

    this.snackBar.open(
      this.translateService.instant('communications.draft_loaded'),
      'OK',
      { duration: 3000 }
    );
  }

  deleteDraft(draft: Newsletter): void {
    const confirmDelete = confirm(
      this.translateService.instant('communications.confirm_delete_draft')
    );

    if (confirmDelete) {
      this.crudService.delete('/admin/newsletters', draft.id).subscribe({
        next: (response) => {
          this.draftNewsletters = this.draftNewsletters.filter(d => d.id !== draft.id);
          this.snackBar.open(
            this.translateService.instant('communications.draft_deleted'),
            'OK',
            { duration: 3000 }
          );
        },
        error: (error) => {
          console.error('Error deleting draft:', error);
          this.snackBar.open(
            this.translateService.instant('snackbar.error'),
            'OK',
            { duration: 3000 }
          );
        }
      });
    }
  }

  private autoDeleteDraft(draftId: number): void {
    this.crudService.delete('/admin/newsletters', draftId).subscribe({
      next: (response) => {
        // Remove from local array without showing notification
        this.draftNewsletters = this.draftNewsletters.filter(d => d.id !== draftId);
        console.log('Draft auto-deleted after newsletter sent:', draftId);
      },
      error: (error) => {
        console.error('Error auto-deleting draft:', error);
        // Don't show error to user since this is automatic
      }
    });
  }


  // Subscriber Management

  importSubscribers(): void {
    console.log('Import subscribers');

    // Create a file input element for CSV import
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.xlsx,.xls';
    input.multiple = false;

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.processSubscribersFile(file);
      }
    };

    input.click();
  }

  private processSubscribersFile(file: File): void {
    const formData = new FormData();
    formData.append('file', file);

    this.crudService.post('/admin/subscribers/import', formData).subscribe({
      next: (response) => {
        this.snackBar.open(
          this.translateService.instant('communications.subscribers_imported'),
          'OK',
          { duration: 3000 }
        );
        this.loadSubscriberStats(); // Reload stats after import
      },
      error: (error) => {
        console.error('Error importing subscribers:', error);
        this.snackBar.open(
          this.translateService.instant('communications.import_error'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  exportSubscribers(): void {
    console.log('Export subscribers');

    this.crudService.getFile('/admin/subscribers/export').subscribe({
      next: (response: Blob) => {
        // Create download link
        const blob = new Blob([response], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        this.snackBar.open(
          this.translateService.instant('communications.subscribers_exported'),
          'OK',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Error exporting subscribers:', error);
        this.snackBar.open(
          this.translateService.instant('communications.export_error'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  // Quick Actions
  createFromTemplate(): void {
    console.log('Create from template');
    // Show custom templates section and allow selection
    // Show custom templates section
    // this.showCustomTemplates = true; // Property doesn't exist, commenting out
    this.selectedTabIndex = 0; // Switch to newsletter tab

    this.snackBar.open(
      this.translateService.instant('communications.select_template_below'),
      'OK',
      { duration: 3000 }
    );
  }

  scheduleNewsletter(): void {
    console.log('Schedule newsletter');

    if (!this.newsletterForm.valid) {
      this.markFormGroupTouched();
      this.snackBar.open(
        this.translateService.instant('communications.fill_required_fields'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    // Create a simple scheduling implementation - add time inputs to form or use current newsletter data
    const scheduleTime = new Date();
    scheduleTime.setHours(scheduleTime.getHours() + 1); // Default to 1 hour from now

    const formData = {
      ...this.newsletterForm.value,
      scheduled_at: scheduleTime.toISOString(),
      status: 'scheduled',
      recipients_config: {
        type: this.newsletterForm.value.recipients
      }
    };

    this.crudService.create('/admin/newsletters/schedule', formData).subscribe({
      next: (response) => {
        this.snackBar.open(
          this.translateService.instant('communications.newsletter_scheduled'),
          'OK',
          { duration: 3000 }
        );
        this.newsletterForm.reset();
        this.loadRecentNewsletters();
      },
      error: (error) => {
        console.error('Error scheduling newsletter:', error);
        this.snackBar.open(
          this.translateService.instant('communications.schedule_error'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  viewAnalytics(): void {
    console.log('View analytics');
    this.selectedTabIndex = 2; // Switch to analytics tab
  }

  // New methods for enhanced UI
  insertImage(): void {
    const url = prompt(this.translateService.instant('communications.insert_image_prompt'));
    if (url) {
      document.execCommand('insertImage', false, url);
      this.updateFormContent();
    }
  }

  composeMessage(): void {
    // Import and open the mail compose component from the old mail system
    import('../mail/components/mail-compose/mail-compose.component').then(module => {
      const dialog = this.dialog.open(module.MailComposeComponent, {
        width: '100%',
        maxWidth: 1800
      });

      dialog.afterClosed().subscribe((data) => {
        this.mailService.getData();
      });
    }).catch(error => {
      console.error('Error loading mail compose component:', error);
      this.snackBar.open(
        this.translateService.instant('snackbar.error'),
        'OK',
        { duration: 3000 }
      );
    });
  }

  refreshMessages(): void {
    this.mailService.getData();
    this.snackBar.open(
      this.translateService.instant('communications.messages_refreshed'),
      'OK',
      { duration: 2000 }
    );
  }

  selectedMessage: any = null;
  expandedRecipientGroups: { [key: string]: boolean } = {};

  // Modal states
  showTemplateLibrary = false;
  showSentNewsletters = false;
  showSubscriberManagement = false;
  showCreateTemplate = false;
  showNewsletterPreview = false;
  previewContent: any = {};

  // Handle message click to mark as read and show details
  onMessageClick(mail: any): void {
    if (!mail.read) {
      this.mailService.markMailAsRead(mail.id);
    }
    this.selectedMessage = mail;
  }

  closeMessageDetail(): void {
    this.selectedMessage = null;
    // Reset expanded groups when closing modal
    this.expandedRecipientGroups = {};
  }

  toggleRecipientGroup(groupType: string): void {
    this.expandedRecipientGroups[groupType] = !this.expandedRecipientGroups[groupType];
  }

  isRecipientGroupExpanded(groupType: string): boolean {
    return this.expandedRecipientGroups[groupType] || false;
  }

  getVisibleRecipients(recipients: any[], groupType: string, limit: number = 5): any[] {
    if (this.isRecipientGroupExpanded(groupType)) {
      return recipients;
    }
    return recipients.slice(0, limit);
  }

  replyToMessage(message: any): void {
    // Use existing compose functionality
    this.composeMessage();
    // Pre-fill with reply subject if possible
    if (message.subject && !message.subject.startsWith('Re:')) {
      this.selectedMessage = null; // Close detail first
      // Could pre-fill form with reply data here
    }
  }

  getMessagePreview(mail: any): string {
    const content = mail.body || mail.message || mail.content || '';

    // Remove HTML tags for preview, but keep some basic formatting
    let preview = content.replace(/<[^>]*>/g, ' ');

    // Clean up multiple spaces and trim
    preview = preview.replace(/\s+/g, ' ').trim();

    // Truncate for preview
    if (preview.length > 100) {
      preview = preview.substring(0, 100) + '...';
    }

    return preview;
  }

  private messageRecipientsCache = new Map<string, any[]>();

  getMessageRecipients(message: any): any[] {
    if (!message) return [];

    const messageId = message.id?.toString();

    // Return cached recipients if available
    if (messageId && this.messageRecipientsCache.has(messageId)) {
      return this.messageRecipientsCache.get(messageId) || [];
    }

    // For messages with ID, try to fetch real recipients from API
    if (messageId) {
      this.fetchRecipientsFromAPI(messageId, message);
    }

    // Return fallback recipients while API loads
    return this.getFallbackRecipients(message);
  }

  private fetchRecipientsFromAPI(messageId: string, message: any): void {
    this.crudService.get(`/admin/mails/${messageId}/recipients`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.messageRecipientsCache.set(messageId, response.data);
          // Force UI update if this message is currently selected
          if (this.selectedMessage?.id === message.id) {
            this.selectedMessage = { ...this.selectedMessage };
          }
        }
      },
      error: (error) => {
        console.log('Error fetching recipients for message', messageId, ':', error);
        // Cache empty array to avoid repeated API calls
        this.messageRecipientsCache.set(messageId, []);
      }
    });
  }

  private getFallbackRecipients(message: any): any[] {
    // For newsletters from API, check if it has recipients data
    if (message.recipients_config && message.recipients) {
      return this.generateRecipientsFromConfig(message.recipients_config, message.recipients);
    }

    // For real email logs, check if they have target information
    if (message.to || message.recipients || message.client_id) {
      return this.getRecipientsFromMailData(message);
    }

    // For system messages from mail service
    if (message.type || message.from?.email === 'system@boukii.com') {
      return this.getSystemMessageRecipients(message);
    }

    // Default empty array
    return [];
  }

  private getRecipientsFromMailData(message: any): any[] {
    const recipients: any[] = [];

    // If message has 'to' field (direct email)
    if (message.to) {
      recipients.push({
        type: 'client',
        name: message.to_name || 'Cliente',
        email: message.to
      });
    }

    // If message has client_id (booking-related email)
    if (message.client_id && message.client_name) {
      recipients.push({
        type: 'client',
        name: message.client_name,
        email: message.client_email || 'cliente@email.com'
      });
    }

    // If it's a course-related email, try to get course participants
    if (message.course_id || message.subject?.includes('curso') || message.subject?.includes('Flexidates')) {
      recipients.push(...this.getCourseParticipants(message));
    }

    return recipients;
  }

  private getCourseParticipants(message: any): any[] {
    // Extract course info from message content or subject
    const courseInfo = this.extractCourseInfo(message);
    const participants = [];

    // Generate realistic participants based on actual message content
    if (courseInfo.isFlexidates) {
      // Extract actual course details from content
      const content = message.body || message.message || message.content || '';

      // Try to extract actual names from the content
      if (content.includes('Cher(s) client(s)')) {
        participants.push(
          { type: 'client', name: 'Clients Flexidates', email: 'flexidates@ess-veveyse.ch' }
        );
      }

      // Add course participants based on course type mentioned
      if (content.includes('Jardin des P\'tits Loups des Dimanches')) {
        participants.push({ type: 'client', name: 'Familles Jardin P\'tits Loups Dim', email: 'familles.dimanche@ess-veveyse.ch' });
      }
      if (content.includes('Jardin des P\'tits Loups des Samedis')) {
        participants.push({ type: 'client', name: 'Familles Jardin P\'tits Loups Sam', email: 'familles.samedi@ess-veveyse.ch' });
      }
      if (content.includes('Flexidates Samedi')) {
        participants.push({ type: 'client', name: 'Clients Flexidates Samedi', email: 'flexidates.samedi@ess-veveyse.ch' });
      }
      if (content.includes('Flexidates Dimanche')) {
        participants.push({ type: 'client', name: 'Clients Flexidates Dimanche', email: 'flexidates.dimanche@ess-veveyse.ch' });
      }
    }

    // For other course-related emails
    if (courseInfo.isCancellation || courseInfo.isUpdate) {
      participants.push({
        type: 'client',
        name: 'Clients du cours concerné',
        email: 'participants.cours@ess-veveyse.ch'
      });
    }

    return participants;
  }

  private extractCourseInfo(message: any): any {
    const subject = message.subject || '';
    const content = message.body || message.message || message.content || '';

    return {
      isFlexidates: subject.includes('Flexidates') || content.includes('Flexidates'),
      isGroupCourse: subject.includes('curso') || content.includes('cours'),
      isCancellation: subject.includes('Annulation') || content.includes('annulé'),
      isUpdate: subject.includes('Mise à jour') || content.includes('Changement')
    };
  }

  private getSystemMessageRecipients(message: any): any[] {
    // For system messages, return admins/staff who receive notifications
    return [
      {
        type: 'system',
        name: 'ESS Veveyse Admin',
        email: 'admin@ess-veveyse.ch'
      },
      {
        type: 'system',
        name: 'Support Boukii',
        email: 'support@boukii.com'
      }
    ];
  }

  getRecipientsByType(message: any, type: string): any[] {
    const recipients = this.getMessageRecipients(message);
    return recipients.filter(recipient => recipient.type === type);
  }

  private generateRecipientsFromConfig(config: any, totalRecipients: number): any[] {
    const recipients: any[] = [];

    // Parse config if it's a string
    let configObj = config;
    if (typeof config === 'string') {
      try {
        configObj = JSON.parse(config);
      } catch (e) {
        configObj = { type: 'all' };
      }
    }

    const recipientType = configObj.type || 'all';

    // TODO: Replace with real API call to get recipients based on type
    // For now, return empty array until API endpoint is implemented
    console.warn('generateRecipientsFromConfig: Using placeholder until API endpoint is implemented');

    return recipients;
  }

  // Mock data generation methods removed - use real API endpoints instead

  // Analytics methods - Real data only
  getEmailsThisMonth(): number {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Calculate from real newsletter data
    const currentMonthNewsletters = this.recentNewsletters.filter(newsletter => {
      const sentDate = new Date(newsletter.sentDate);
      return sentDate.getMonth() === currentMonth && sentDate.getFullYear() === currentYear;
    });

    return currentMonthNewsletters.reduce((total, newsletter) => total + (newsletter.recipients || 0), 0);
  }

  getEmailTypes(): number {
    // Count actual different types from real data
    const types = new Set();

    // From newsletters
    if (this.recentNewsletters.length > 0) {
      types.add('newsletter');
    }

    // From mails
    this.mails$.subscribe(mails => {
      if (mails && mails.length > 0) {
        mails.forEach(mail => {
          if (mail.type) {
            types.add(mail.type);
          } else {
            types.add('system');
          }
        });
      }
    });

    return types.size || 0;
  }

  // Newsletter Management Methods
  viewAllNewsletters(): void {
    this.viewSentNewsletters();
  }

  createTemplate(): void {
    // Create a simple template from current content or open template creation dialog
    const subject = this.newsletterForm.get('subject')?.value || '';
    const content = this.newsletterForm.get('content')?.value || '';

    if (!content) {
      this.snackBar.open(
        this.translateService.instant('communications.create_content_first'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    const templateName = prompt(this.translateService.instant('communications.template_name_prompt'));
    if (templateName) {
      const newTemplate: NewsletterTemplate = {
        id: `custom_${Date.now()}`,
        name: templateName,
        icon: 'description',
        content: content
      };

      this.templates.push(newTemplate);
      this.snackBar.open(
        this.translateService.instant('communications.template_created'),
        'OK',
        { duration: 3000 }
      );
    }
  }

  editTemplate(template: NewsletterTemplate): void {
    const newName = prompt(this.translateService.instant('communications.edit_template_name'), template.name);
    if (newName && newName !== template.name) {
      template.name = newName;
      this.snackBar.open(
        this.translateService.instant('communications.template_updated'),
        'OK',
        { duration: 2000 }
      );
    }
  }

  // Template Library Methods
  openTemplateLibrary(): void {
    this.showTemplateLibrary = true;
  }

  closeTemplateLibrary(): void {
    this.showTemplateLibrary = false;
  }


  getTemplateDescription(templateId: string): string {
    if (templateId.startsWith('custom_')) {
      // For custom templates, find the description directly
      const customTemplate = this.customTemplates.find(t => `custom_${t.id}` === templateId);
      return customTemplate?.description || '';
    }
    // For built-in templates, use the translation key
    return `communications.template_desc_${templateId.replace('communications.template_', '')}`;
  }

  getTemplateIcon(template: any): string {
    return template.icon || 'edit';
  }

  insertNameVariable(): void {
    this.insertVariable('{{name}}');
  }

  insertEmailVariable(): void {
    this.insertVariable('{{email}}');
  }

  insertSchoolNameVariable(): void {
    this.insertVariable('{{school_name}}');
  }

  insertDateVariable(): void {
    this.insertVariable('{{date}}');
  }

  // Helper methods for displaying variables
  getVariableText(variable: string): string {
    return `{{${variable}}}`;
  }

  // Sent Newsletters Methods
  viewSentNewsletters(): void {
    this.showSentNewsletters = true;
    this.loadRecentNewsletters(); // Refresh data
  }

  closeSentNewsletters(): void {
    this.showSentNewsletters = false;
  }

  viewNewsletterDetails(newsletter: Newsletter): void {
    this.selectedMessage = {
      ...newsletter,
      subject: newsletter.subject,
      content: newsletter.content,
      body: newsletter.content,
      date: newsletter.sentDate,
      recipients_config: { type: 'all' },
      recipients: newsletter.recipients,
      id: newsletter.id
    };
    this.closeSentNewsletters();
  }

  viewNewsletterRecipients(newsletter: Newsletter): void {
    this.viewNewsletterDetails(newsletter);
  }

  getNewsletterStatusIcon(status: string): string {
    switch (status) {
      case 'sent': return 'check_circle';
      case 'draft': return 'edit';
      case 'scheduled': return 'schedule';
      case 'sending': return 'send';
      default: return 'email';
    }
  }

  getNewsletterPreview(content: string): string {
    if (!content) return '';
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 120 ? text.substring(0, 120) + '...' : text;
  }

  // Subscriber Management Methods
  viewSubscribers(): void {
    this.showSubscriberManagement = true;
  }

  closeSubscriberManagement(): void {
    this.showSubscriberManagement = false;
  }

  getActiveSubscribers(): number {
    return this.subscriberStats.active;
  }

  getInactiveSubscribers(): number {
    return this.subscriberStats.inactive;
  }

  getVipSubscribers(): number {
    return this.subscriberStats.vip;
  }

  viewSubscriberGroup(groupType: string): void {
    this.snackBar.open(
      this.translateService.instant('communications.viewing_subscriber_group', { group: groupType }),
      'OK',
      { duration: 2000 }
    );
  }

  exportSubscribersList(): void {
    this.exportSubscribers();
  }

  useTemplate(template: NewsletterTemplate): void {
    this.selectedTemplate = template.id;
    this.newsletterForm.patchValue({
      subject: '',
      content: template.content,
      template: template.id
    });

    if (this.editor) {
      this.editor.nativeElement.innerHTML = template.content;
    }

    this.snackBar.open(
      this.translateService.instant('communications.template_applied'),
      'OK',
      { duration: 2000 }
    );
  }

  // Template Management Methods
  openCreateTemplateModal(): void {
    this.editingTemplate = null;
    this.templateForm.reset();
    this.showCreateTemplateModal = true;
  }

  editTemplateModal(template: CustomTemplate): void {
    this.editingTemplate = template;
    this.templateForm.patchValue({
      name: template.name,
      description: template.description || '',
      subject: template.subject,
      content: template.content
    });
    this.showCreateTemplateModal = true;

    // Set content in editor
    setTimeout(() => {
      if (this.templateEditor) {
        this.templateEditor.nativeElement.innerHTML = template.content;
      }
    }, 100);
  }

  closeCreateTemplateModal(): void {
    this.showCreateTemplateModal = false;
    this.editingTemplate = null;
    this.templateForm.reset();
  }

  saveTemplate(): void {
    if (this.templateForm.invalid) {
      this.markTemplateFormGroupTouched();
      return;
    }

    this.isSavingTemplate = true;
    const templateData = this.templateForm.value;

    if (this.editingTemplate) {
      // Update existing template
      this.crudService.update('/admin/templates', templateData, this.editingTemplate.id).subscribe({
        next: (response) => {
          this.snackBar.open(
            this.translateService.instant('communications.template_updated'),
            'OK',
            { duration: 3000 }
          );
          this.loadCustomTemplates();
          this.closeCreateTemplateModal();
        },
        error: (error) => {
          console.error('Error updating template:', error);
          this.snackBar.open(
            this.translateService.instant('communications.template_update_error'),
            'OK',
            { duration: 3000 }
          );
        },
        complete: () => {
          this.isSavingTemplate = false;
        }
      });
    } else {
      // Create new template
      this.crudService.create('/admin/templates', templateData).subscribe({
        next: (response) => {
          this.snackBar.open(
            this.translateService.instant('communications.template_created'),
            'OK',
            { duration: 3000 }
          );
          this.loadCustomTemplates();
          this.closeCreateTemplateModal();
        },
        error: (error) => {
          console.error('Error creating template:', error);
          this.snackBar.open(
            this.translateService.instant('communications.template_create_error'),
            'OK',
            { duration: 3000 }
          );
        },
        complete: () => {
          this.isSavingTemplate = false;
        }
      });
    }
  }

  deleteTemplate(template: CustomTemplate): void {
    if (!confirm(this.translateService.instant('communications.delete_template_confirm'))) {
      return;
    }

    this.crudService.delete('/admin/templates', template.id).subscribe({
      next: (response) => {
        this.snackBar.open(
          this.translateService.instant('communications.template_deleted'),
          'OK',
          { duration: 3000 }
        );
        this.loadCustomTemplates();
      },
      error: (error) => {
        console.error('Error deleting template:', error);
        this.snackBar.open(
          this.translateService.instant('communications.template_delete_error'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  loadCustomTemplates(): void {
    this.crudService.get('/admin/templates').subscribe({
      next: (response) => {
        this.customTemplates = response.data || [];
        this.updateAllTemplates();
      },
      error: (error) => {
        console.error('Error loading custom templates:', error);
      }
    });
  }

  updateAllTemplates(): void {
    // Combine built-in templates with custom templates
    this.allTemplates = [
      ...this.templates,
      ...this.customTemplates.map(t => ({
        ...t,
        id: `custom_${t.id}`,
        icon: 'edit'
      }))
    ];
  }

  previewTemplate(template: any): void {
    // Implementation for template preview
    this.snackBar.open(
      this.translateService.instant('communications.template_previewing'),
      'OK',
      { duration: 2000 }
    );
  }

  useTemplateFromLibrary(template: any): void {
    // Apply template to newsletter form
    const content = template.content || '';
    const subject = template.subject || '';

    this.newsletterForm.patchValue({
      subject: subject,
      content: content
    });

    if (this.editor) {
      this.editor.nativeElement.innerHTML = content;
    }

    this.showTemplateLibrary = false;

    this.snackBar.open(
      this.translateService.instant('communications.template_applied'),
      'OK',
      { duration: 2000 }
    );
  }

  editCustomTemplate(template: any): void {
    // Find the actual custom template by removing the custom_ prefix
    const templateId = template.id.replace('custom_', '');
    const customTemplate = this.customTemplates.find(t => t.id == templateId);

    if (customTemplate) {
      this.editTemplateModal(customTemplate);
    }
  }

  deleteCustomTemplate(template: any): void {
    // Find the actual custom template by removing the custom_ prefix
    const templateId = template.id.replace('custom_', '');
    const customTemplate = this.customTemplates.find(t => t.id == templateId);

    if (customTemplate) {
      this.deleteTemplate(customTemplate);
    }
  }

  // Template Editor Methods

  insertVariable(variable: string): void {
    if (this.templateEditor) {
      // Focus on the editor first
      this.templateEditor.nativeElement.focus();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(variable);
        range.insertNode(textNode);

        // Move cursor after the inserted text
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        // If no selection, append to current position or end
        const currentContent = this.templateEditor.nativeElement.innerHTML;
        this.templateEditor.nativeElement.innerHTML = currentContent + variable;

        // Set cursor at the end
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(this.templateEditor.nativeElement);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }

      // Update form after a small delay to avoid cursor jumping
      setTimeout(() => {
        this.updateTemplateContent();
      }, 10);
    }
  }

  updateTemplateContent(event?: Event): void {
    if (this.templateEditor) {
      const content = this.templateEditor.nativeElement.innerHTML;
      // Update form control without triggering change detection that could affect cursor
      const contentControl = this.templateForm.get('content');
      if (contentControl && contentControl.value !== content) {
        contentControl.setValue(content, { emitEvent: false });
      }
    }
  }

  private markTemplateFormGroupTouched(): void {
    Object.keys(this.templateForm.controls).forEach(key => {
      const control = this.templateForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.newsletterForm.controls).forEach(key => {
      const control = this.newsletterForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
}