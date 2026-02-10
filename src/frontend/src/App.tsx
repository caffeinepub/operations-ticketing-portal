import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import SubmitTicket from '@/pages/SubmitTicket';
import HelpCenter from '@/pages/HelpCenter';
import Dashboard from '@/pages/Dashboard';
import Analysis from '@/pages/Analysis';
import EditHelpCenter from '@/pages/EditHelpCenter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function App() {
  const [activeTab, setActiveTab] = useState('help');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    document.title = 'Operations Ticketing Portal';
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_auth');
    if (stored === 'true') {
      setIsAdminAuthenticated(true);
    }
  }, []);

  const handleAdminTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen flex-col bg-background">
        <Header 
          onAdminTabChange={handleAdminTabChange}
          isAdminAuthenticated={isAdminAuthenticated}
          setIsAdminAuthenticated={setIsAdminAuthenticated}
        />
        <main className="container mx-auto flex-1 px-4 py-10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-2 mb-10 h-12">
              <TabsTrigger value="submit" className="text-base">Submit Ticket</TabsTrigger>
              <TabsTrigger value="help" className="text-base">Help Center</TabsTrigger>
            </TabsList>
            <TabsContent value="submit" className="animate-fade-slide-in">
              <SubmitTicket />
            </TabsContent>
            <TabsContent value="help" className="animate-fade-slide-in">
              <HelpCenter />
            </TabsContent>
            <TabsContent value="dashboard" className="animate-fade-slide-in">
              <Dashboard isAdminAuthenticated={isAdminAuthenticated} />
            </TabsContent>
            <TabsContent value="analysis" className="animate-fade-slide-in">
              <Analysis isActive={activeTab === 'analysis'} isAdminAuthenticated={isAdminAuthenticated} />
            </TabsContent>
            <TabsContent value="edit-help" className="animate-fade-slide-in">
              <EditHelpCenter isAdminAuthenticated={isAdminAuthenticated} />
            </TabsContent>
          </Tabs>
        </main>
        <Footer />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
