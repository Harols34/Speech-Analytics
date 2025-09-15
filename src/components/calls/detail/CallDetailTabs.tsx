
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Call } from "@/lib/types";
import { BarChart3, FileText, MessageSquare } from "lucide-react";
import SummaryTab from "./SummaryTab";
import TranscriptionTab from "./TranscriptionTab";
import FeedbackTab from "./FeedbackTab";
import CallChatDialog from "./CallChatDialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface CallDetailTabsProps {
  call: Call;
  transcriptSegments: any[];
}

export default function CallDetailTabs({
  call,
  transcriptSegments
}: CallDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("summary");
  const [showAIChat, setShowAIChat] = useState(false);
  const [feedbackTabMounted, setFeedbackTabMounted] = useState(false);
  const isMobile = useIsMobile();

  // Only mount the feedback tab when it's selected
  useEffect(() => {
    if (activeTab === "feedback") {
      setFeedbackTabMounted(true);
    }
  }, [activeTab]);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="summary" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="transcription" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Transcripción</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Feedback IA</span>
            </TabsTrigger>
          </TabsList>
          
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "sm"} 
            onClick={() => setShowAIChat(true)} 
            className="flex items-center gap-2 self-end sm:self-auto"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Consultas</span>
          </Button>
        </div>

        <TabsContent value="summary" className="mt-0 pt-2">
          <SummaryTab call={call} />
        </TabsContent>

        <TabsContent value="transcription" className="mt-0 pt-2">
          <TranscriptionTab call={call} transcriptSegments={transcriptSegments} />
        </TabsContent>

        <TabsContent value="feedback" className="mt-0 pt-2">
          {/* Only render FeedbackTab if it's been mounted */}
          {feedbackTabMounted && (
            <FeedbackTab call={call} />
          )}
        </TabsContent>
      </Tabs>
      
      <CallChatDialog open={showAIChat} onOpenChange={setShowAIChat} call={call} />
    </>
  );
}
