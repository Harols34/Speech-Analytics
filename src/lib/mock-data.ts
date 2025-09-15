
import { Call } from "@/lib/types";

// Mock data for calls
export const mockCalls: Call[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `call-${i + 1}`,
  title: [
    "Customer Inquiry - Premium Plan",
    "Technical Support - Connectivity Issue",
    "Product Demo - Enterprise Solution",
    "Complaint Resolution - Billing Issue",
    "Sales Call - New Customer",
    "Follow-up Call - Existing Client",
    "Service Cancellation - Customer Retention",
    "Account Setup - New User",
    "Troubleshooting - Software Bug",
    "Upgrade Discussion - Premium Features",
  ][i],
  filename: `call_${i + 1}_${Date.now()}.mp3`,
  agentName: [
    "John Smith",
    "Sarah Johnson",
    "David Williams",
    "Emily Davis",
    "Michael Brown",
    "Jessica Wilson",
    "Robert Taylor",
    "Jennifer Martinez",
    "William Anderson",
    "Elizabeth Thomas",
  ][i],
  duration: Math.floor(Math.random() * 30) + 5, // 5-35 minutes
  date: new Date(
    Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
  ).toISOString(),
  status: ["pending", "transcribing", "analyzing", "complete"][
    Math.floor(Math.random() * 4)
  ] as Call["status"],
  progress: Math.floor(Math.random() * 100),
  audio_url: "#",
  audioUrl: "#",
  transcription: i < 6 ? "Sample transcription text..." : undefined,
  summary: i < 4 ? "Sample summary text..." : undefined,
  feedback: i < 3 ? {
    positive: ["Good greeting", "Clear explanations"],
    negative: ["Long pauses", "Interrupted customer"],
    opportunities: ["Improve closing", "Add follow-up questions"],
    score: Math.floor(Math.random() * 40) + 60, // 60-100
    behaviors_analysis: [
      {
        name: "Greeting Protocol",
        evaluation: "cumple",
        comments: "Agent followed standard greeting protocol"
      },
      {
        name: "Active Listening",
        evaluation: "no cumple",
        comments: "Agent interrupted customer multiple times"
      }
    ]
  } : undefined,
}));
