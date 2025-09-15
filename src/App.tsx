
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./context/AuthContext";
import { AccountProvider } from "./context/AccountContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Analytics from "./pages/Analytics";
import Calls from "./pages/Calls";
import Agents from "./pages/Agents";
import Workforce from "./pages/Workforce";
import Tools from "./pages/Tools";
import Chat from "./pages/Chat";
import Behaviors from "./pages/Behaviors";
import Tipificaciones from "./pages/Tipificaciones";
import Prompts from "./pages/Prompts";
import Users from "./pages/Users";
import AccountsPage from "./pages/Accounts";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import CreateUser from "./pages/CreateUser";
import CreateAccount from "./pages/CreateAccount";
import AssignUsers from "./pages/AssignUsers";

import "./App.css";

// Create QueryClient outside component to prevent recreating on each render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <TooltipProvider>
            <Router>
              <AuthProvider>
                <AccountProvider>
                  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 w-full">
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/calls/*" element={<Calls />} />
                      <Route path="/agents" element={<Agents />} />
                      <Route path="/workforce" element={<Workforce />} />
                      <Route path="/tools" element={<Tools />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/behaviors" element={<Behaviors />} />
                      <Route path="/tipificaciones" element={<Tipificaciones />} />
                      <Route path="/prompts/*" element={<Prompts />} />
                      <Route path="/users/*" element={<Users />} />
                      <Route path="/accounts/*" element={<AccountsPage />} />
                      <Route path="/accounts/new" element={<CreateAccount />} />
                      <Route path="/accounts/assign" element={<AssignUsers />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/dashboard" element={<Navigate to="/analytics" replace />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </div>
                  <Toaster />
                </AccountProvider>
              </AuthProvider>
            </Router>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;
