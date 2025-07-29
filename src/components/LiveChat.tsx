import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  sendChatMessage, 
  getChatMessages, 
  markMessagesAsRead, 
  getUnreadMessagesCount,
  getSupportAgents,
  subscribeToMessages 
} from '../lib/supabase';
import LoadingButton from './LoadingButton';

const LOGO_URL = 'https://i.postimg.cc/YSKSHFBw/PULAKATACA-removebg-preview-1.png';
const ATTENDANT_URL = 'https://randomuser.me/api/portraits/men/32.jpg';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read: boolean;
  sender?: { id: string; name: string; email: string };
  receiver?: { id: string; name: string; email: string };
}

interface SupportAgent {
  id: string;
  name: string;
  email: string;
}

const LiveChat: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [supportAgent, setSupportAgent] = useState<SupportAgent | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initialize chat when opened
  useEffect(() => {
    if (open && user && !connected) {
      initializeChat();
    }
  }, [open, user, connected]);

  // Load unread count
  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000); // Check every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const initializeChat = async () => {
    if (!user) {
      setError('Você precisa estar logado para usar o chat');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get support agent
      const agents = await getSupportAgents();
      const agent = agents[0];
      setSupportAgent(agent);

      // Load existing messages
      if (agent) {
        const chatMessages = await getChatMessages(agent.id);
        setMessages(chatMessages);

        // Mark messages as read
        await markMessagesAsRead(agent.id);
        setUnreadCount(0);

        // Subscribe to real-time messages
        const channel = subscribeToMessages(user.id, (payload) => {
          const newMessage = payload.new;
          setMessages(prev => [...prev, newMessage]);
          
          // Mark as read if chat is open
          if (open) {
            markMessagesAsRead(newMessage.sender_id);
          } else {
            setUnreadCount(prev => prev + 1);
          }
        });

        setConnected(true);

        // Add welcome message if no previous messages
        if (chatMessages.length === 0) {
          setMessages([{
            id: 'welcome',
            sender_id: agent.id,
            receiver_id: user.id,
            message: `Olá! Sou ${agent.name} da equipe de suporte. Como posso ajudar você hoje?`,
            created_at: new Date().toISOString(),
            read: false,
            sender: agent
          }]);
        }
      }
    } catch (error) {
      console.error('Erro ao inicializar chat:', error);
      setError('Erro ao conectar com o suporte. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!user) return;
    try {
      const count = await getUnreadMessagesCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Erro ao carregar mensagens não lidas:', error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !supportAgent || !user || sending) return;

    setSending(true);
    const messageText = input.trim();
    setInput('');

    try {
      const newMessage = await sendChatMessage(supportAgent.id, messageText);
      setMessages(prev => [...prev, {
        ...newMessage,
        sender: { id: user.id, name: user.email || 'Você', email: user.email || '' }
      }]);
      setError(null);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setError('Erro ao enviar mensagem. Tente novamente.');
      setInput(messageText); // Restore message
    } finally {
      setSending(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (unreadCount > 0) {
      setUnreadCount(0);
      if (supportAgent) {
        markMessagesAsRead(supportAgent.id);
      }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const isUserMessage = (message: Message) => {
    return message.sender_id === user?.id;
  };

  if (!user) {
    return (
      <div className="fixed bottom-6 left-6 z-50">
        <div className="bg-pink-500 text-white px-4 py-2 rounded-full text-sm shadow-lg">
          Faça login para usar o chat
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end">
      {/* Floating Button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="relative w-16 h-16 rounded-full border-4 border-pink-500 bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform duration-200 focus:outline-none"
          aria-label="Abrir chat de suporte"
        >
          <img 
            src={ATTENDANT_URL} 
            alt="Suporte" 
            className="w-12 h-12 object-cover rounded-full" 
          />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div className="w-80 max-w-[95vw] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeInUp">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3">
            <div className="flex items-center gap-3">
              <img 
                src={LOGO_URL} 
                alt="Logo" 
                className="w-10 h-10 rounded-full bg-white p-1 border-2 border-white shadow-md" 
              />
              <div>
                <span className="text-white font-bold text-sm block">Suporte PulaCatraca</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                  <span className="text-pink-100 text-xs">
                    {connected ? 'Online' : 'Conectando...'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setOpen(false)} 
              className="text-white hover:text-pink-200 text-xl font-bold w-8 h-8 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center"
              aria-label="Fechar chat"
            >
              ×
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 px-4 py-3 overflow-y-auto bg-gradient-to-b from-pink-50/30 to-purple-50/30">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm">Conectando com o suporte...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-red-500 text-2xl mb-2">⚠️</div>
                  <p className="text-red-600 text-sm mb-3">{error}</p>
                  <button
                    onClick={initializeChat}
                    className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-600 transition-colors"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className={`mb-3 flex ${isUserMessage(msg) ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%]">
                      <div className={`rounded-xl px-4 py-2 text-sm shadow-sm ${
                        isUserMessage(msg) 
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none' 
                          : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                      }`}>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <div className={`text-xs text-gray-500 mt-1 ${isUserMessage(msg) ? 'text-right' : 'text-left'}`}>
                        {formatTime(msg.created_at)}
                        {isUserMessage(msg) && msg.read && (
                          <span className="ml-1 text-blue-500">✓✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 bg-white border-t border-gray-100">
            <input
              type="text"
              className="flex-1 border-2 border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 text-sm transition-all duration-200"
              placeholder={connected ? "Digite sua mensagem..." : "Conectando..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={500}
              disabled={!connected || sending}
              aria-label="Digite sua mensagem"
            />
            <LoadingButton
              type="submit"
              isLoading={sending}
              loadingText=""
              disabled={!input.trim() || !connected}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 shadow-md disabled:opacity-50"
              aria-label="Enviar mensagem"
            >
              {sending ? '⏳' : '📤'}
            </LoadingButton>
          </form>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp { animation: fadeInUp 0.3s ease; }
      `}</style>
    </div>
  );
};

export default LiveChat; 