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

export interface GraphDeltaMessage extends GraphMessage {
  "@removed"?: { reason: string };
}

export interface GraphDeltaResponse {
  value: GraphDeltaMessage[];
  "@odata.deltaLink"?: string;
  "@odata.nextLink"?: string;
}

export interface SyncResult {
  threadsCreated: number;
  threadsUpdated: number;
  emailsSynced: number;
  emailsDeleted: number;
  attachmentsSynced: number;
  isIncremental: boolean;
}

