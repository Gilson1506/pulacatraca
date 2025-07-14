import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Apple, Smartphone, Instagram, Facebook, Linkedin, Award, Shield, Recycle } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white text-gray-900 border-t border-gray-200 font-bold">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div className="space-y-4 font-bold">
            <div className="flex items-center space-x-2">
              <img 
                src="/Imagem WhatsApp 2025-07-14 às 11.16.21_85eab4b8.jpg" 
                alt="BaladAPP" 
                className="h-16 w-auto md:h-20" 
              />
            </div>
            <p className="text-gray-400 text-sm font-bold">
              A plataforma completa para descobrir e comprar ingressos para os melhores eventos da sua região.
            </p>
            <div className="flex space-x-4">
              <img src="https://images.pexels.com/photos/1526/flag-icon-symbols-flags.jpg?auto=compress&cs=tinysrgb&w=24&h=24&dpr=1" alt="Brasil" className="w-6 h-6 rounded" />
              <img src="https://images.pexels.com/photos/1526/flag-icon-symbols-flags.jpg?auto=compress&cs=tinysrgb&w=24&h=24&dpr=1" alt="USA" className="w-6 h-6 rounded" />
              <img src="https://images.pexels.com/photos/1526/flag-icon-symbols-flags.jpg?auto=compress&cs=tinysrgb&w=24&h=24&dpr=1" alt="Espanha" className="w-6 h-6 rounded" />
            </div>
          </div>

          {/* Políticas */}
          <div className="space-y-4 font-bold">
            <h3 className="text-lg font-extrabold text-black">POLÍTICAS</h3>
            <ul className="space-y-2 font-bold">
              <li><Link to="/privacy" className="text-gray-400 hover:text-gray-900 transition-colors font-bold">Política de privacidade</Link></li>
              <li><Link to="/terms" className="text-gray-400 hover:text-gray-900 transition-colors font-bold">Termos e Condições</Link></li>
              <li><Link to="/cancellation" className="text-gray-400 hover:text-gray-900 transition-colors font-bold">Política de cancelamento</Link></li>
            </ul>
          </div>

          {/* Baixe o App */}
          <div className="space-y-4 font-bold">
            <h3 className="text-lg font-extrabold text-black">BAIXE O APP</h3>
            <div className="space-y-2">
              <a href="#" className="flex items-center space-x-2 text-gray-400 hover:text-gray-900 transition-colors font-bold">
                <Smartphone className="h-4 w-4" />
                <span>Google Play</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-gray-400 hover:text-gray-900 transition-colors font-bold">
                <Apple className="h-4 w-4" />
                <span>Apple Store</span>
              </a>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="space-y-4 font-bold">
            <h3 className="text-lg font-extrabold text-black">REDES SOCIAIS</h3>
            <div className="space-y-2">
              <a href="#" className="flex items-center space-x-2 text-gray-400 hover:text-gray-900 transition-colors font-bold">
                <Instagram className="h-4 w-4" />
                <span>Instagram</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-gray-400 hover:text-gray-900 transition-colors font-bold">
                <Facebook className="h-4 w-4" />
                <span>Facebook</span>
              </a>
              <a href="#" className="flex items-center space-x-2 text-gray-400 hover:text-gray-900 transition-colors font-bold">
                <Linkedin className="h-4 w-4" />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </div>

        {/* Certificações */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-center space-x-8 space-y-4">
            <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded">
              <Award className="h-4 w-4 text-white" />
              <span className="text-white text-sm font-semibold font-bold">Great Place to Work</span>
            </div>
            <div className="flex items-center space-x-2 bg-blue-600 px-3 py-1 rounded">
              <Shield className="h-4 w-4 text-white" />
              <span className="text-white text-sm font-semibold font-bold">Certificado SSL</span>
            </div>
            <div className="flex items-center space-x-2 bg-green-600 px-3 py-1 rounded">
              <Recycle className="h-4 w-4 text-white" />
              <span className="text-white text-sm font-semibold font-bold">Ótimo ReclameAQUI</span>
            </div>
            <div className="flex items-center space-x-2 bg-yellow-600 px-3 py-1 rounded">
              <Globe className="h-4 w-4 text-white" />
              <span className="text-white text-sm font-semibold font-bold">Unicórnio UNICEF</span>
            </div>
          </div>
        </div>

        {/* Informações da Empresa */}
        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <div className="space-y-2 text-gray-400 text-sm font-bold">
            <p>BALADA BILHETERIA DIGITAL LTDA 35.491.197/0001-93</p>
            <p>contato@baladapp.com.br</p>
            <p>R. 1129, 270 - St. Marista, Goiânia - GO, 74175-130</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;