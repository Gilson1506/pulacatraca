import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getChatMessages, 
  sendChatMessage, 
  markMessagesAsRead,
  subscribeToMessages 
} from '../lib/supabase';
import LoadingButton from './LoadingButton';

interface ChatUser {
  id: string;
  name: string;
  email: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

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

const AdminChatPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (user) {
      loadActiveUsers();
      
      // Subscribe to new messages
      const channel = subscribeToMessages(user.id, (payload) => {
        const newMessage = payload.new;
        
        // Update messages if viewing this conversation
        if (selectedUser && 
            (newMessage.sender_id === selectedUser.id || newMessage.receiver_id === selectedUser.id)) {
          setMessages(prev => [...prev, newMessage]);
          markMessagesAsRead(newMessage.sender_id);
        }
        
        // Update active users list
        loadActiveUsers();
      });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user, selectedUser]);

  const loadActiveUsers = async () => {
    if (!user) return;
    
    try {
      // This would need a custom function in Supabase to get users with recent messages
      // For now, we'll simulate it
      const users: ChatUser[] = [
        {
          id: 'user-1',
          name: 'João Silva',
          email: 'joao@exemplo.com',
          lastMessage: 'Preciso de ajuda com meu evento',
          lastMessageTime: '10:30',
          unreadCount: 2
        },
        {
          id: 'user-2', 
          name: 'Maria Santos',
          email: 'maria@exemplo.com',
          lastMessage: 'Obrigada pela ajuda!',
          lastMessageTime: '09:15',
          unreadCount: 0
        }
      ];
      
      setActiveUsers(users);
    } catch (error) {
      console.error('Erro ao carregar usuários ativos:', error);
    }
  };

  const loadMessages = async (userId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const chatMessages = await getChatMessages(userId);
      setMessages(chatMessages);
      
      // Mark messages as read
      await markMessagesAsRead(userId);
      
      // Update unread count for this user
      setActiveUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, unreadCount: 0 } : u
      ));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (chatUser: ChatUser) => {
    setSelectedUser(chatUser);
    loadMessages(chatUser.id);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedUser || !user || sending) return;

    setSending(true);
    const messageText = input.trim();
    setInput('');

    try {
      const newMessage = await sendChatMessage(selectedUser.id, messageText);
      setMessages(prev => [...prev, {
        ...newMessage,
        sender: { id: user.id, name: 'Suporte', email: user.email || '' }
      }]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setInput(messageText); // Restore message
    } finally {
      setSending(false);
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
    return message.sender_id !== user?.id;
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">Você precisa estar logado para acessar o painel de suporte.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Users List */}
      <div className="w-80 bg-gray-50 border-r border-gray-200">
        <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-600">
          <h2 className="text-white font-bold text-lg">💬 Suporte - Chat</h2>
          <p className="text-pink-100 text-sm">Conversas ativas</p>
        </div>
        
        <div className="p-4">
          <div className="space-y-2">
            {activeUsers.map((chatUser) => (
              <button
                key={chatUser.id}
                onClick={() => handleUserSelect(chatUser)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                  selectedUser?.id === chatUser.id
                    ? 'bg-pink-100 border-2 border-pink-300'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-900 text-sm">
                    {chatUser.name}
                  </span>
                  {chatUser.unreadCount > 0 && (
                    <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {chatUser.unreadCount}
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-xs mb-1">{chatUser.email}</p>
                {chatUser.lastMessage && (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500 text-xs truncate flex-1 mr-2">
                      {chatUser.lastMessage}
                    </p>
                    <span className="text-gray-400 text-xs">
                      {chatUser.lastMessageTime}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {activeUsers.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">💬</div>
              <p className="text-gray-500 text-sm">Nenhuma conversa ativa</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedUser.name}</h3>
                  <p className="text-gray-600 text-sm">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                    <p className="text-gray-600 text-sm">Carregando mensagens...</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div key={msg.id} className={`mb-4 flex ${isUserMessage(msg) ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[70%]">
                        <div className={`rounded-xl px-4 py-2 text-sm shadow-sm ${
                          isUserMessage(msg)
                            ? 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                            : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                        </div>
                        <div className={`text-xs text-gray-500 mt-1 ${isUserMessage(msg) ? 'text-left' : 'text-right'}`}>
                          {formatTime(msg.created_at)}
                          {!isUserMessage(msg) && msg.read && (
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

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  className="flex-1 border-2 border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 text-sm transition-all duration-200"
                  placeholder="Digite sua resposta..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  maxLength={500}
                  disabled={sending}
                />
                <LoadingButton
                  type="submit"
                  isLoading={sending}
                  loadingText=""
                  disabled={!input.trim()}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full px-6 py-2 font-semibold transition-all duration-200 shadow-md disabled:opacity-50"
                >
                  {sending ? '⏳' : 'Enviar'}
                </LoadingButton>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">💬</div>
              <h3 className="text-gray-600 font-semibold mb-2">Selecione uma conversa</h3>
              <p className="text-gray-500 text-sm">
                Escolha um usuário da lista para ver as mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatPanel;