import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Starter from "./pages/Starter";
import Index from "./pages/Index";
import MusicSelection from "./pages/MusicSelection";
import MusicPlaylists from "./pages/MusicPlaylists";
import AIChatbot from "./pages/AIChatbot";
import NotFound from "./pages/NotFound";
import { audioManager } from "./services/audioManager";

// Expose audioManager to window for debugging
declare global {
  interface Window {
    audioManager: typeof audioManager;
  }
}

window.audioManager = audioManager;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Starter />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/music-selection" element={<MusicSelection />} />
          <Route path="/music-playlists" element={<MusicPlaylists />} />
          <Route path="/ai-chatbot" element={<AIChatbot />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
