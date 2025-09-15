
import React, { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  placeholder = "Type your message...",
  disabled = false,
}: MessageInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSend(value);
      }
    }
  };

  const handleSendClick = () => {
    if (value.trim()) {
      onSend(value);
    }
  };

  return (
    <div className="flex gap-2 bg-background p-4 border-t">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-10 resize-none border rounded-md"
        rows={2}
      />
      <Button
        type="button"
        size="icon"
        onClick={handleSendClick}
        disabled={disabled || !value.trim()}
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send</span>
      </Button>
    </div>
  );
}
