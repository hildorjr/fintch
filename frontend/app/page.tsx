"use client";

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Email Insights Powered by AI
          </h1>
      <p className="text-lg text-muted-foreground max-w-md">
        Connect your Outlook account to sync emails and get intelligent
        insights about your conversations.
      </p>
      <SignInButton mode="modal">
        <Button size="lg">Get Started</Button>
      </SignInButton>
    </div>
  );
}
