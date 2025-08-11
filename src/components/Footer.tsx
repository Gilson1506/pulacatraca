import React from 'react';
import { Instagram, Facebook, Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 text-gray-700 w-full">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Coluna 1: Logo, descrição, redes sociais */}
          <div>
            <img
              src="/logo-com-qr.png"
              alt="Logo PULAKATRACA"
              className="h-12 w-auto object-contain mb-3"
            />
            <p className="text-sm leading-relaxed mb-3 text-gray-600">
              A Pulakatraka é uma plataforma de gestão e venda de ingressos que
              conecta produtores e público com praticidade, segurança e uma
              experiência simples do começo ao fim.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Instagram" className="p-2 rounded-full bg-white hover:bg-pink-50 transition-colors border border-gray-200">
                <Instagram size={18} className="text-pink-600" />
              </a>
              <a href="#" aria-label="Facebook" className="p-2 rounded-full bg-white hover:bg-pink-50 transition-colors border border-gray-200">
                <Facebook size={18} className="text-pink-600" />
              </a>
              <a href="#" aria-label="LinkedIn" className="p-2 rounded-full bg-white hover:bg-pink-50 transition-colors border border-gray-200">
                <Linkedin size={18} className="text-pink-600" />
              </a>
            </div>
          </div>

          {/* Coluna 2: Links úteis */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-3">Links úteis</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-pink-600 transition-colors">Área do produtor</a>
              </li>
              <li>
                <a href="#" className="hover:text-pink-600 transition-colors">Área do parceiro</a>
              </li>
              <li>
                <a href="#" className="hover:text-pink-600 transition-colors">Cadastre seu evento</a>
              </li>
              <li>
                <a href="#" className="hover:text-pink-600 transition-colors">Contato / Suporte</a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Pulakatraka */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-3">Pulakatraka</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-pink-600 transition-colors">Dúvidas</a>
              </li>
              <li>
                <a href="#" className="hover:text-pink-600 transition-colors">Meus ingressos</a>
              </li>
              <li>
                <a href="#" className="hover:text-pink-600 transition-colors">Termos de uso</a>
              </li>
              <li>
                <a href="#" className="hover:text-pink-600 transition-colors">Política de Privacidade</a>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Fique por dentro (newsletter) */}
          <div>
            <h3 className="text-gray-900 font-semibold mb-3">Fique por dentro</h3>
            <p className="text-sm leading-relaxed mb-3 text-gray-600">
              Se inscreva na nossa lista de e-mail e fique por dentro dos próximos eventos da sua região.
            </p>
            <form className="flex gap-2">
              <label htmlFor="newsletter-email" className="sr-only">E-mail</label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="Digite seu e-mail..."
                className="flex-1 rounded-md bg-white text-gray-900 placeholder-gray-400 border border-gray-300 focus:border-pink-500 focus:outline-none px-3 py-2 text-sm"
              />
              <button
                type="button"
                className="rounded-md bg-pink-600 hover:bg-pink-700 active:bg-pink-800 text-white px-4 py-2 text-sm font-medium shadow-sm"
              >
                inscrever-se
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Linha branca + crédito final */}
      <div className="border-t border-white" />
      <div className="container mx-auto px-4 py-3 text-center text-xs text-gray-700">
        Pulakatraka 2025 - 2026
      </div>
    </footer>
  );
};

export default Footer;