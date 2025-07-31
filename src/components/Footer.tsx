import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white w-full pt-0">
      {/* Logo Section */}
      <div className="container mx-auto">
        {/* Mobile Layout */}
        <div className="flex flex-col items-center md:hidden px-4 py-2">
          <img
            src="/logo-com-qr.png"
            alt="Logo PULACATRACA"
            className="h-24 w-auto object-contain"
          />
          <div className="flex gap-2 mt-2 mb-4">
            <span className="text-2xl">🇧🇷</span>
            <span className="text-2xl">🇺🇸</span>
            <span className="text-2xl">🇪🇸</span>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex md:justify-between md:items-center px-4 pb-0 mt-0">
          <div className="flex justify-center pt-2 pb-1">
            <img
              src="/logo-com-qr.png"
              alt="Logo PULACATRACA"
              className="h-40 w-auto object-contain"
            />
          </div>
          <div className="flex gap-3 pt-2 pb-1">
            <span className="text-3xl">🇧🇷</span>
            <span className="text-3xl">🇺🇸</span>
            <span className="text-3xl">🇪🇸</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 w-full mb-0 mt-0"></div>

      {/* Links Section */}
      <div className="container mx-auto px-4">
        {/* Mobile Layout */}
        <div className="flex md:hidden flex-row justify-between py-4">
          {/* Políticas */}
          <div className="flex flex-col items-center">
            <span className="font-semibold text-sm mb-1">Políticas</span>
            <a href="#" className="text-gray-600 text-xs hover:text-pink-600 mb-1">Política de privacidade</a>
            <a href="#" className="text-gray-600 text-xs hover:text-pink-600 mb-1">Termos e Condições</a>
            <a href="#" className="text-gray-600 text-xs hover:text-pink-600">Política de cancelamento</a>
          </div>

          {/* Apps */}
          <div className="flex flex-col items-center gap-1">
            <span className="font-semibold text-sm mb-1">Baixe o APP</span>
            <a href="#" className="text-gray-600 text-xs hover:text-pink-600 mb-1">Google Play</a>
            <a href="#" className="text-gray-600 text-xs hover:text-pink-600">Apple Store</a>
          </div>

          {/* Redes Sociais */}
          <div className="flex flex-col items-center gap-1">
            <span className="font-semibold text-sm mb-1">Redes Sociais</span>
            <a href="#" className="text-gray-600 text-xs hover:text-pink-600 mb-1">Instagram</a>
            <a href="#" className="text-gray-600 text-xs hover:text-pink-600 mb-1">Facebook</a>
            <a href="#" className="text-gray-600 text-xs hover:text-pink-600">Linkedin</a>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex flex-row flex-wrap items-start justify-center text-center gap-2 mt-1">
          {/* Políticas */}
          <div className="flex flex-col items-center min-w-[150px] w-1/3 mb-2">
            <span className="font-semibold mb-2">Políticas</span>
            <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Política de privacidade</a>
            <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Termos e Condições</a>
            <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Política de cancelamento</a>
          </div>

          {/* Apps */}
          <div className="flex flex-col items-center min-w-[150px] w-1/3 mb-2">
            <span className="font-semibold mb-2">Baixe o APP</span>
            <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Google Play</a>
            <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Apple Store</a>
          </div>

          {/* Redes Sociais */}
          <div className="flex flex-col items-center min-w-[150px] w-1/3 mb-2">
            <span className="font-semibold mb-2">Redes Sociais</span>
            <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Instagram</a>
            <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Facebook</a>
            <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Linkedin</a>
          </div>
        </div>
      </div>

      {/* Informações da empresa */}
      <div className="container mx-auto px-4 pt-1 pb-0 text-center text-xs md:text-sm text-gray-700">
        <div>PULAKATRACA BILHETERIA DIGITAL LTDA 35.491.197/0001-93</div>
        <div>contato@pulakatracacom.br</div>
        <div>R. 1128, 270 - St. Marista, Goiânia - GO, 74175-130</div>
      </div>

      {/* Copyright */}
      <div className="container mx-auto px-4 pb-1 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} PULACATRACA. Todos os direitos reservados.
      </div>
    </footer>
  );
};

export default Footer;