export interface ThreadListItem {
  id: string;
  subject: string;
  lastMessageAt: string;
  emailCount: number;
  attachmentCount: number;
  hasInsight: boolean;
}

export interface ThreadListResponse {
  threads: ThreadListItem[];
}

export interface Attachment {
  filename: string;
  mimeType: string;
  size: number | null;
}

export interface Email {
  id: string;
  fromAddress: string;
  fromName: string | null;
  subject: string;
  body: string;
  receivedAt: string;
  attachments: Attachment[];
}

export interface ActionItem {
  task: string;
  owner: string;
}

export interface AttachmentOverview {
  count: number;
  types: string[];
  mentions: string[];
}

export interface Insight {
  summary: string;
  participants: string[];
  topics: string[];
  actionItems: ActionItem[];
  urgency: string;
  requiresResponse: boolean;
  attachmentOverview: AttachmentOverview;
}

export interface ThreadDetail {
  id: string;
  subject: string;
  lastMessageAt: string;
  emails: Email[];
  insight: Insight | null;
}

export interface SyncResult {
  threadsCreated: number;
  threadsUpdated: number;
  emailsSynced: number;
  attachmentsSynced: number;
}

