
import React, { useRef, useEffect } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage as ChatMessageType } from "@/lib/types";
import { ChatMessageItem } from "./ChatMessage";
import { Loader2 } from "lucide-react";

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isLoading: boolean;
}

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableArea = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableArea) {
        scrollableArea.scrollTop = scrollableArea.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 mb-4 h-[50vh] border rounded-md">
      <div className="space-y-4">
        {messages.map((message, i) => (
          <ChatMessageItem key={message.id || i} message={message} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-2 bg-muted text-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
