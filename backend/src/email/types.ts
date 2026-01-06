export interface GraphEmailAddress {
  address: string;
  name: string;
}

export interface GraphRecipient {
  emailAddress: GraphEmailAddress;
}

export interface GraphAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
}

export interface GraphMessage {
  id: string;
  conversationId: string;
  subject: string;
  from: GraphRecipient;
  toRecipients: GraphRecipient[];
  ccRecipients: GraphRecipient[];
  body: {
    contentType: string;
    content: string;
  };
  receivedDateTime: string;
  hasAttachments: boolean;
  attachments?: GraphAttachment[];
}

export interface GraphMessagesResponse {
  value: GraphMessage[];
}

export interface SyncResult {
  threadsCreated: number;
  threadsUpdated: number;
  emailsSynced: number;
  attachmentsSynced: number;
}

export interface ThreadListItem {
  id: string;
  subject: string;
  lastMessageAt: Date;
  emailCount: number;
  attachmentCount: number;
  hasInsight: boolean;
}

export interface ThreadListResponse {
  threads: ThreadListItem[];
}

export interface AttachmentResponse {
  filename: string;
  mimeType: string;
  size: number | null;
}

export interface EmailResponse {
  id: string;
  fromAddress: string;
  fromName: string | null;
  subject: string;
  body: string;
  receivedAt: Date;
  attachments: AttachmentResponse[];
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

export interface InsightResponse {
  summary: string;
  participants: string[];
  topics: string[];
  actionItems: ActionItem[];
  urgency: string;
  requiresResponse: boolean;
  attachmentOverview: AttachmentOverview;
}

export interface ThreadDetailResponse {
  id: string;
  subject: string;
  lastMessageAt: Date;
  emails: EmailResponse[];
  insight: InsightResponse | null;
}
