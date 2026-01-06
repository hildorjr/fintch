import { Injectable } from "@nestjs/common";
import { Client } from "@microsoft/microsoft-graph-client";
import { GraphMessage, GraphMessagesResponse } from "./types";

@Injectable()
export class GraphService {
  private createClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  async fetchRecentEmails(
    accessToken: string,
    count: number = 20,
  ): Promise<GraphMessage[]> {
    const client = this.createClient(accessToken);

    const response: GraphMessagesResponse = await client
      .api("/me/messages")
      .select(
        "id,conversationId,subject,from,toRecipients,ccRecipients,body,receivedDateTime,hasAttachments",
      )
      .expand("attachments($select=id,name,contentType,size)")
      .top(count)
      .orderby("receivedDateTime desc")
      .header("Prefer", 'outlook.body-content-type="text"')
      .get();

    return response.value;
  }
}

