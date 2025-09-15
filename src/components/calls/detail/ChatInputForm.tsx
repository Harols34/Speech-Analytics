
import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

interface ChatInputFormProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

export function ChatInputForm({ onSubmit, isLoading }: ChatInputFormProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    onSubmit(input);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Pregunta sobre esta llamada..."
        className="resize-none"
        rows={2}
        disabled={isLoading}
      />
      <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </Button>
    </form>
  );
}
