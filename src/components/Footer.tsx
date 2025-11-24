import React from 'react';
import { Instagram, Facebook, Linkedin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Footer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();


  const handleCadastreEvento = () => {
    if (!user) {
      navigate('/organizer-register');
    } else {
      navigate('/organizer-dashboard');
    }
  };

  const handleContatoSuporte = () => {
    const phoneNumber = '5511968033591';
    const message = 'Olá! Gostaria de mais informações sobre os eventos do Pulakatraca.';
    const encodedMessage = encodeURIComponent(message);

    // Detectar se é mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    let whatsappUrl;
    if (isMobile) {
      whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    } else {
      whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
    }

    window.open(whatsappUrl, '_blank');
  };

  const handleDuvidas = () => {
    navigate('/duvidas');
  };

  const handleMeusIngressos = () => {
    if (user) {
      navigate('/profile/tickets');
    } else {
      navigate('/login');
    }
  };

  const handlePolitica = () => {
    navigate('/politica');
  };
  return (
    <footer className="bg-gray-50 text-gray-700 w-full">
      {/* Faixa de sombra no topo (transição para o footer) */}
      <div className="w-full h-4 bg-gradient-to-b from-gray-300/80 via-gray-200/70 to-transparent" />

      <div className="container mx-auto px-4 py-4">
        {/* Mobile/Tablet: layout compacto e horizontal para menus */}
        <div className="lg:hidden">
          {/* Logo + descrição + redes */}
          <div>
            <img
              src="/logo-com-qr.png"
              alt="Logo PULAKATRACA"
              className="h-12 w-auto object-contain mb-3"
            />
            <p className="text-sm leading-relaxed mb-3 text-gray-600">
              pulakatraca - conectando produtores e público com praticidade, segurança e uma experiência simples do começo ao fim.
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

          {/* Menus em duas colunas como no desktop, para reduzir altura */}
          <div className="mt-5 grid grid-cols-2 gap-6">
            {/* Links úteis */}
            <div>
              <h3 className="text-gray-900 font-semibold mb-3">Links úteis</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={handleCadastreEvento} className="hover:text-pink-600">Cadastre seu evento</button>
                </li>
                <li>
                  <button onClick={handleContatoSuporte} className="hover:text-pink-600">Contato / Suporte</button>
                </li>
              </ul>
            </div>

            {/* pulakatraca */}
            <div>
              <h3 className="text-gray-900 font-semibold mb-3">pulakatraca</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={handleDuvidas} className="hover:text-pink-600">Dúvidas</button>
                </li>
                <li>
                  <button onClick={handleMeusIngressos} className="hover:text-pink-600">Meus ingressos</button>
                </li>
                <li>
                  <button onClick={() => navigate('/termos')} className="hover:text-pink-600">Termos de uso</button>
                </li>
                <li>
                  <button onClick={handlePolitica} className="hover:text-pink-600">Política de Privacidade</button>
                </li>
              </ul>
            </div>
          </div>

          {/* Botão Seja um Afiliado */}
          <div className="mt-5">
            <button
              onClick={() => navigate('/affiliate/register')}
              className="w-full py-3 px-6 rounded-lg font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 bg-pink-600 hover:bg-pink-700 border-2 border-gray-300"
            >
              💰 Seja um Afiliado
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Promova eventos e ganhe comissões
            </p>
          </div>

          {/* Newsletter */}
          <div className="mt-5">
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

        {/* Desktop: manter estrutura em 4 colunas */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6 items-start">
          {/* Coluna 1: Logo, descrição, redes sociais */}
          <div>
            <img
              src="/logo-com-qr.png"
              alt="Logo PULAKATRACA"
              className="h-12 w-auto object-contain mb-3"
            />
            <p className="text-sm leading-relaxed mb-3 text-gray-600">
              pulakatraca - conectando produtores e público com praticidade, segurança e uma experiência simples do começo ao fim.
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
          <div className="lg:mt-12">
            <h3 className="text-gray-900 font-semibold mb-3">Links úteis</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={handleCadastreEvento} className="hover:text-pink-600 transition-colors">Cadastre seu evento</button>
              </li>
              <li>
                <button onClick={handleContatoSuporte} className="hover:text-pink-600 transition-colors">Contato / Suporte</button>
              </li>
            </ul>
          </div>

          {/* Coluna 3: pulakatraca */}
          <div className="lg:mt-12">
            <h3 className="text-gray-900 font-semibold mb-3">pulakatraca</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={handleDuvidas} className="hover:text-pink-600 transition-colors">Dúvidas</button>
              </li>
              <li>
                <button onClick={handleMeusIngressos} className="hover:text-pink-600 transition-colors">Meus ingressos</button>
              </li>
              <li>
                <button onClick={() => navigate('/termos')} className="hover:text-pink-600 transition-colors">Termos de uso</button>
              </li>
              <li>
                <button onClick={handlePolitica} className="hover:text-pink-600 transition-colors">Política de Privacidade</button>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Fique por dentro (newsletter) + Afiliados */}
          <div className="lg:mt-12">
            {/* Botão Seja um Afiliado */}
            <div className="mb-6">
              <button
                onClick={() => navigate('/affiliate/register')}
                className="w-full py-3 px-6 rounded-lg font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 bg-pink-600 hover:bg-pink-700 border-2 border-gray-300"
              >
                💰 Seja um Afiliado
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Promova eventos e ganhe comissões
              </p>
            </div>

            {/* Newsletter */}
            <h3 className="text-gray-900 font-semibold mb-3">Fique por dentro</h3>
            <p className="text-sm leading-relaxed mb-3 text-gray-600">
              Se inscreva na nossa lista de e-mail e fique por dentro dos próximos eventos da sua região.
            </p>
            <form className="flex gap-2">
              <label htmlFor="newsletter-email-desktop" className="sr-only">E-mail</label>
              <input
                id="newsletter-email-desktop"
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

      {/* Linha rosa + crédito final */}
      <div className="border-t border-pink-500" />
      <div className="container mx-auto px-4 py-3 text-center text-xs text-gray-700">
        pulakatraca 2020 - 2025
      </div>
    </footer>
  );
};

export default Footer;