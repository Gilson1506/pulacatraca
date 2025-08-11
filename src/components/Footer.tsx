import React from 'react';
import { Instagram, Facebook, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-pink-900 text-gray-300 w-full">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Coluna 1: Logo, descrição, redes sociais */}
          <div>
            <img
              src="/logo-com-qr.png"
              alt="Logo PULAKATRACA"
              className="h-12 w-auto object-contain mb-3"
            />
            <p className="text-sm leading-relaxed mb-3 text-gray-300/90">
              A Pulakatraka é uma plataforma de gestão e venda de ingressos que
              conecta produtores e público com praticidade, segurança e uma
              experiência simples do começo ao fim.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Instagram" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <Instagram size={18} className="text-white" />
              </a>
              <a href="#" aria-label="Facebook" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <Facebook size={18} className="text-white" />
              </a>
              <a href="#" aria-label="LinkedIn" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <Linkedin size={18} className="text-white" />
              </a>
            </div>
          </div>

          {/* Coluna 2: Links úteis */}
          <div>
            <h3 className="text-white font-semibold mb-3">Links úteis</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">Área do produtor</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Área do parceiro</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Cadastre seu evento</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Contato / Suporte</a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Pulakatraka */}
          <div>
            <h3 className="text-white font-semibold mb-3">Pulakatraka</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">Dúvidas</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Meus ingressos</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Termos de uso</a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Fique por dentro (newsletter) */}
          <div>
            <h3 className="text-white font-semibold mb-3">Fique por dentro</h3>
            <p className="text-sm leading-relaxed mb-3 text-gray-300/90">
              Se inscreva na nossa lista de e-mail e fique por dentro dos próximos eventos da sua região.
            </p>
            <form className="flex gap-2">
              <label htmlFor="newsletter-email" className="sr-only">E-mail</label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Digite seu e-mail..."
                className="flex-1 rounded-md bg-white/5 text-gray-100 placeholder-gray-400 border border-white/10 focus:border-pink-500 focus:outline-none px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="rounded-md bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white px-4 py-2 text-sm font-medium"
              >
                inscrever-se
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Linha branca + crédito final */}
      <div className="border-t border-white/30" />
      <div className="container mx-auto px-4 py-3 text-center text-xs text-gray-300">
        Pulakatraka 2025 - 2026
      </div>
    </footer>
  );
};

export default Footer;