import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

<<<<<<< HEAD
const LOGO_URL = 'https://i.postimg.cc/YSKSHFBw/PULAKATACA-removebg-preview-1.png';
=======
const LOGO_URL = 'https://i.postimg.cc/gkmcWg5B/PULAKATACA-removebg-preview-1.png';
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
const ATTENDANT_URL = 'https://randomuser.me/api/portraits/men/32.jpg'; // Exemplo de foto de atendente

const LiveChat: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Olá! Como podemos ajudar você?' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { from: 'user', text: input }]);
    setInput('');
    // Simula resposta do bot
    setTimeout(() => {
      setMessages(msgs => [...msgs, { from: 'bot', text: 'Recebido! Em breve um atendente irá te responder.' }]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end"> {/* Muda para canto esquerdo */}
      {/* Botão flutuante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-16 h-16 rounded-full border-4 border-pink-500 bg-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform duration-200 focus:outline-none"
          aria-label="Abrir chat"
        >
          <img src={ATTENDANT_URL} alt="Atendente" className="w-12 h-12 object-cover rounded-full" />
        </button>
      )}
      {/* Janela do chat */}
      {open && (
        <div className="w-80 max-w-[95vw] h-[480px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeInUp">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between bg-pink-500 px-4 py-3">
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="Logo" className="w-12 h-12 rounded-full bg-white p-1 border-4 border-pink-500 shadow-md" />
              <span className="text-white font-bold text-lg">Atendimento</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white hover:text-pink-200 text-2xl font-bold px-2 focus:outline-none" aria-label="Fechar chat">×</button>
          </div>
          {/* Mensagens */}
          <div className="flex-1 px-4 py-3 overflow-y-auto bg-pink-50/30">
            {messages.map((msg, idx) => (
              <div key={idx} className={`mb-2 flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-xl px-4 py-2 max-w-[70%] text-sm ${msg.from === 'user' ? 'bg-pink-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-pink-100'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 bg-white border-t">
            <input
              type="text"
              className="flex-1 border border-pink-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm"
              placeholder="Digite sua mensagem e pressione Enter..."
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={300}
              aria-label="Digite sua mensagem"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && !e.shiftKey) { handleSend(e as unknown as React.FormEvent); } }}
            />
            <button
              type="submit"
              className="bg-pink-500 hover:bg-pink-600 text-white rounded-full p-2 font-semibold transition-colors flex items-center justify-center"
              disabled={!input.trim()}
              aria-label="Enviar mensagem"
            >
              <Send className="h-5 w-5" />
            </button>
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