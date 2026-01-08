import { Injectable, Logger } from "@nestjs/common";
import { Client } from "@microsoft/microsoft-graph-client";
import { GraphDeltaMessage, GraphDeltaResponse } from "./types";

export interface DeltaSyncResult {
  messages: GraphDeltaMessage[];
  deltaLink: string;
}

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  private createClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  async fetchDelta(
    accessToken: string,
    deltaLink?: string | null,
  ): Promise<DeltaSyncResult> {
    const client = this.createClient(accessToken);
    const allMessages: GraphDeltaMessage[] = [];
    let nextLink: string | undefined;
    let finalDeltaLink: string | undefined;

    if (deltaLink) {
      let response: GraphDeltaResponse = await client
        .api(deltaLink)
        .header("Prefer", 'outlook.body-content-type="text"')
        .get();

      allMessages.push(...response.value);
      nextLink = response["@odata.nextLink"];
      finalDeltaLink = response["@odata.deltaLink"];

      while (nextLink) {
        response = await client
          .api(nextLink)
          .header("Prefer", 'outlook.body-content-type="text"')
          .get();
        allMessages.push(...response.value);
        nextLink = response["@odata.nextLink"];
        finalDeltaLink = response["@odata.deltaLink"];
      }
    } else {
      const response: GraphDeltaResponse = await client
        .api("/me/mailFolders/inbox/messages/delta")
        .select(
          "id,conversationId,subject,from,toRecipients,ccRecipients,body,receivedDateTime,hasAttachments",
        )
        .top(20)
        .header("Prefer", 'outlook.body-content-type="text"')
        .get();

      allMessages.push(...response.value);
      finalDeltaLink = response["@odata.deltaLink"] || response["@odata.nextLink"];
    }

    this.logger.debug(
      `Delta sync: ${allMessages.length} messages, ${allMessages.filter((m) => m["@removed"]).length} deleted`,
    );

    return {
      messages: allMessages,
      deltaLink: finalDeltaLink || "",
    };
  }

  async fetchAttachments(
    accessToken: string,
    messageId: string,
  ): Promise<{ id: string; name: string; contentType: string; size: number }[]> {
    const client = this.createClient(accessToken);

    try {
      const response = await client
        .api(`/me/messages/${messageId}/attachments`)
        .select("id,name,contentType,size")
        .get();
      return response.value || [];
    } catch {
      return [];
    }
  }
}

