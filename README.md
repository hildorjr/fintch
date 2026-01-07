# Fintch Email

An email insights application that connects to Outlook, syncs emails, and generates AI-powered insights for email threads.

## Setup and Run Instructions

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)
- Clerk account
- Microsoft Azure account (for Outlook OAuth)
- OpenAI API key

### 1. Clone and Install

```bash
git clone <repo-url>
cd fintch-test

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start PostgreSQL

```bash
# From project root
docker-compose up -d
```

### 3. Configure Environment Variables

**Backend (`backend/.env`):**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fintch?schema=public"
CLERK_SECRET_KEY="sk_test_..."
OPENAI_API_KEY="sk-..."
PORT=3001
```

**Frontend (`frontend/.env.local`):**

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 4. Clerk Configuration

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Enable Microsoft OAuth provider in Clerk Dashboard → User & Authentication → Social Connections
3. Configure Microsoft OAuth with custom credentials:

**Azure App Registration:**

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Set "Supported account types" to **"Accounts in any organizational directory and personal Microsoft accounts"**
4. Add redirect URI: `https://<your-clerk-domain>/v1/oauth_callback`
5. Under "Certificates & secrets", create a new client secret
6. Under "API permissions", add:
   - `Mail.Read`
   - `User.Read`
   - `offline_access`
   - `openid`
   - `email`
   - `profile`

7. Copy the Application (client) ID and Client Secret to Clerk's Microsoft OAuth configuration
8. In Clerk, add scopes: `Mail.Read User.Read offline_access openid email profile`

### 5. Run Database Migrations

```bash
cd backend
npx prisma migrate dev
```

### 6. Start the Application

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000`

---

## Approach and Trade-offs

### Architecture

- **Frontend:** Next.js 15 with App Router, Clerk for auth, Shadcn UI components
- **Backend:** NestJS with Prisma ORM, PostgreSQL database
- **AI:** OpenAI GPT-4o-mini for email analysis

### Key Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| Clerk for OAuth | Handles Microsoft OAuth complexity, token refresh, session management | External dependency, less control over auth flow |
| Separate insight generation endpoint | Emails load immediately, insights generate async | Requires two API calls per thread view |
| GPT-4o-mini over GPT-4 | Cost-effective for structured extraction tasks | Slightly less accurate on complex threads |
| Thread grouping by conversationId | Microsoft Graph provides this, accurate threading | Relies on Microsoft's threading logic |
| JSON mode for AI output | Guarantees parseable structured output | Slightly higher latency than plain text |
| Client-side redirect for auth | Simple implementation with Clerk hooks | Brief flash on protected routes |

### What Could Be Improved

- Background sync jobs instead of manual sync button
- Webhook for real-time email updates
- Insight caching and invalidation strategy
- Pagination for large thread lists
- Rate limiting and error retry logic

---

## Prompt Design

The AI agent uses a structured prompt to analyze email threads:

### System Prompt

```
You are an email analysis assistant. Analyze email threads and provide structured insights. Always respond with valid JSON matching the exact schema provided.
```

### User Prompt Structure

```
Analyze the following email thread and provide insights in JSON format.

--- Email 1 ---
From: John Doe <john@example.com>
Date: 2024-01-15T10:30:00.000Z
Subject: Project Update
Attachments: report.pdf (application/pdf)

[Email body truncated to 2000 chars]

--- Email 2 ---
...

Respond with a JSON object containing:
{
  "summary": "A brief 1-2 sentence summary of the thread",
  "participants": ["List of participant names mentioned"],
  "topics": ["Main topics discussed"],
  "actionItems": [{"task": "Task description", "owner": "Person responsible"}],
  "urgency": "LOW, MEDIUM, or HIGH based on content urgency",
  "requiresResponse": true or false,
  "attachmentOverview": {
    "count": total number of attachments,
    "types": ["file extensions like pdf, docx"],
    "mentions": ["what the attachments are about based on context"]
  }
}
```

### Design Choices

- **Temperature 0.3:** Low temperature for consistent, deterministic output
- **JSON mode:** Enforces valid JSON response structure
- **Body truncation at 2000 chars:** Prevents token limit issues while keeping context
- **Explicit schema in prompt:** Reduces hallucination and ensures all fields are present

---

## Schema Description

```
┌─────────────────┐       ┌─────────────────┐
│      User       │       │     Thread      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │
│ email (unique)  │  │    │ conversationId  │
│ name            │  └───<│ userId (FK)     │
│ createdAt       │       │ subject         │
│ updatedAt       │       │ lastMessageAt   │
└─────────────────┘       │ createdAt       │
                          │ updatedAt       │
                          └────────┬────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      Email      │       │  ThreadInsight  │       │   Attachment    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ messageId (UK)  │       │ threadId (UK)   │       │ emailId (FK)    │
│ threadId (FK)   │       │ summary         │       │ filename        │
│ userId (FK)     │       │ participants[]  │       │ mimeType        │
│ fromAddress     │       │ topics[]        │       │ size            │
│ fromName        │       │ actionItems[]   │       │ createdAt       │
│ toRecipients[]  │       │ urgency (enum)  │       └─────────────────┘
│ ccRecipients[]  │       │ requiresResponse│
│ subject         │       │ attachmentOver. │
│ body            │       │ createdAt       │
│ receivedAt      │       │ updatedAt       │
│ attachmentCount │       └─────────────────┘
│ createdAt       │
└─────────────────┘
```

### Models

| Model | Purpose |
|-------|---------|
| **User** | Stores Clerk user data (id synced from Clerk) |
| **Thread** | Groups emails by Microsoft's conversationId |
| **Email** | Individual email messages with metadata |
| **Attachment** | File attachments linked to emails |
| **ThreadInsight** | AI-generated analysis cached per thread |

### Key Indexes

- `Thread(userId, conversationId)` - Unique constraint for user-scoped threads
- `Thread(lastMessageAt)` - Sorting by most recent activity
- `Email(threadId)` - Fast thread email lookups
- `Email(receivedAt)` - Chronological ordering

### Relationships

- User → Thread: One-to-many (user owns threads)
- User → Email: One-to-many (user owns emails)
- Thread → Email: One-to-many (thread contains emails)
- Thread → ThreadInsight: One-to-one (thread has one insight)
- Email → Attachment: One-to-many (email has attachments)

All relationships use `onDelete: Cascade` for clean data removal.

