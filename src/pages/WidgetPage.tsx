// src/pages/WidgetPage.tsx
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatInbox from '@/components/custom/chatbotInbox/ChatInbox';
import { api } from '@/api/axios';
import { MessageCircle, HelpCircle, Home } from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
}

const WidgetPage = () => {
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get('apiKey');
  const agentName = searchParams.get('agentName') || 'AI Assistant';
  const businessId = searchParams.get('businessId');
  
  const [activeTab, setActiveTab] = useState<'welcome' | 'chat' | 'help'>('welcome');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [isOpen, setIsOpen] = useState(true);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Fetch FAQs from API
  useEffect(() => {
    if (businessId && agentName && activeTab === 'help') {
      fetchFAQs();
    }
  }, [businessId, agentName, activeTab]);

  // Fetch welcome message (can be from agent config or default)
  useEffect(() => {
    if (agentName) {
      setWelcomeMessage(`Hello! I'm ${agentName}, your AI assistant. How can I help you today?`);
    }
  }, [agentName]);

  const fetchFAQs = async () => {
    if (!businessId || !agentName) return;
    
    setLoadingFaqs(true);
    try {
      const response = await api.get(`/api/v1/business/${businessId}/${encodeURIComponent(agentName)}/default-responses`);
      if (response.data?.data?.defaultFAQResponses) {
        setFaqs(response.data.data.defaultFAQResponses);
      }
    } catch (error: any) {
      console.error('Failed to fetch FAQs:', error);
      setFaqs([]);
    } finally {
      setLoadingFaqs(false);
    }
  };

  // Notify parent window when widget opens/closes
  useEffect(() => {
    if (widgetRef.current) {
      const message = {
        type: 'resize-widget',
        isOpen: isOpen
      };
      window.parent.postMessage(message, '*');
    }
  }, [isOpen]);

  if (!apiKey || !businessId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500">Missing required parameters</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={widgetRef} className="w-full h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-[380px] h-[600px] bg-white dark:bg-[#1B1B20] shadow-lg rounded-[16px] flex flex-col overflow-hidden">
        {/* Header with Tabs */}
        <div className="bg-[radial-gradient(83.13%_223.4%_at_96.63%_91.88%,_#8C52FF_0%,_#5D17E9_100%)] rounded-t-[16px]">
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center">
                  <MessageCircle className="text-[#8C52FF] text-xl" />
                </div>
                <div className="text-white font-semibold">{agentName}</div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-white/20">
              <button
                onClick={() => setActiveTab('welcome')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-t-lg transition ${
                  activeTab === 'welcome'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <Home className="w-4 h-4" />
                  <span>Welcome</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-t-lg transition ${
                  activeTab === 'chat'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('help')}
                className={`flex-1 py-2 px-3 text-sm font-medium rounded-t-lg transition ${
                  activeTab === 'help'
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>Help</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'welcome' && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  Welcome! 👋
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {welcomeMessage}
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-2">
                    How can I help you?
                  </h3>
                  <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-300">
                    <li>• Answer your questions</li>
                    <li>• Help with your requests</li>
                    <li>• Provide information</li>
                    <li>• Assist with support</li>
                  </ul>
                </div>
                
                <button
                  onClick={() => setActiveTab('chat')}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-700 transition shadow-lg"
                >
                  Start Chatting
                </button>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex-1 overflow-hidden">
              <ChatInbox agentName={agentName} setOpen={setIsOpen} />
            </div>
          )}

          {activeTab === 'help' && (
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Frequently Asked Questions
              </h3>
              
              {loadingFaqs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : faqs.length > 0 ? (
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                        {faq.question}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No FAQs available at the moment.</p>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="mt-4 text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    Start a chat instead
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WidgetPage;

