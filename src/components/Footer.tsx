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
        <div className="hidden md:grid md:grid-cols-4 items-center px-4 pb-0 mt-0">
          <div className="flex justify-center pt-2 pb-1">
            <img
              src="/logo-com-qr.png"
              alt="Logo PULACATRACA"
              className="h-40 w-auto object-contain"
            />
          </div>
          <div></div>
          <div></div>
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
            <div className="flex flex-row gap-4">
              <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Privacidade</a>
              <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Termos</a>
            </div>
          </div>

          {/* Apps */}
          <div className="flex flex-col items-center">
            <div className="flex gap-2">
              <a href="#"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-6" /></a>
              <a href="#"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store" className="h-6" /></a>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="flex flex-col items-center">
            <div className="flex gap-3">
              <a href="#" aria-label="Instagram"><svg className="h-5 w-5 text-gray-600 hover:text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zm4.25 3.25a5.25 5.25 0 1 1 0 10.5a5.25 5.25 0 0 1 0-10.5zm0 1.5a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5zm5.25.75a1 1 0 1 1 0 2a1 1 0 0 1 0-2z"/></svg></a>
              <a href="#" aria-label="Facebook"><svg className="h-5 w-5 text-gray-600 hover:text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.525 8.998h-3.02V7.498c0-.583.388-.719.66-.719h2.32V3.998h-3.02c-2.2 0-2.68 1.65-2.68 2.68v2.32H8.475v3.32h2.31v8.68h3.72v-8.68h2.51l.51-3.32z"/></svg></a>
              <a href="#" aria-label="WhatsApp"><svg className="h-5 w-5 text-gray-600 hover:text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20.52 3.48A12.07 12.07 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.12.55 4.18 1.6 6.02L0 24l6.18-1.6A12.07 12.07 0 0 0 12 24c6.63 0 12-5.37 12-12c0-3.19-1.24-6.19-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.22-1.44l-.37-.22l-3.67.95l.98-3.57l-.24-.38A9.98 9.98 0 0 1 2 12c0-5.52 4.48-10 10-10s10 4.48 10 10s-4.48 10-10 10zm5.2-7.8c-.28-.14-1.65-.81-1.9-.9c-.25-.09-.43-.14-.61.14c-.18.28-.7.9-.86 1.08c-.16.18-.32.2-.6.07c-.28-.14-1.18-.44-2.25-1.4c-.83-.74-1.39-1.65-1.55-1.93c-.16-.28-.02-.43.12-.57c.13-.13.28-.34.42-.51c.14-.17.18-.29.28-.48c.09-.19.05-.36-.02-.5c-.07-.14-.61-1.47-.84-2.01c-.22-.53-.45-.46-.61-.47c-.16-.01-.35-.01-.54-.01c-.19 0-.5.07-.76.36c-.26.29-1 1-1 2.43c0 1.43 1.02 2.81 1.16 3c.14.19 2.01 3.08 4.87 4.2c.68.29 1.21.46 1.62.59c.68.22 1.3.19 1.79.12c.55-.08 1.65-.67 1.89-1.32c.23-.65.23-1.2.16-1.32c-.07-.12-.25-.19-.53-.33z"/></svg></a>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex flex-row flex-wrap items-start justify-center text-center gap-2 mt-1">
          {/* Políticas */}
          <div className="flex flex-col items-center min-w-[150px] w-1/4 mb-2">
            <span className="font-semibold mb-2">Políticas</span>
            <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Privacidade</a>
            <a href="#" className="text-gray-600 text-sm hover:text-pink-600">Termos de Uso</a>
          </div>

          {/* Apps */}
          <div className="flex flex-col items-center min-w-[150px] w-1/4 mb-2">
            <span className="font-semibold mb-2">Baixe o App</span>
            <div className="flex gap-2">
              <a href="#"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-8" /></a>
              <a href="#"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store" className="h-8" /></a>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="flex flex-col items-center min-w-[150px] w-1/4 mb-2">
            <span className="font-semibold mb-2">Redes Sociais</span>
            <div className="flex gap-3">
              <a href="#" aria-label="Instagram"><svg className="h-6 w-6 text-gray-600 hover:text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5zm4.25 3.25a5.25 5.25 0 1 1 0 10.5a5.25 5.25 0 0 1 0-10.5zm0 1.5a3.75 3.75 0 1 0 0 7.5a3.75 3.75 0 0 0 0-7.5zm5.25.75a1 1 0 1 1 0 2a1 1 0 0 1 0-2z"/></svg></a>
              <a href="#" aria-label="Facebook"><svg className="h-6 w-6 text-gray-600 hover:text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.525 8.998h-3.02V7.498c0-.583.388-.719.66-.719h2.32V3.998h-3.02c-2.2 0-2.68 1.65-2.68 2.68v2.32H8.475v3.32h2.31v8.68h3.72v-8.68h2.51l.51-3.32z"/></svg></a>
              <a href="#" aria-label="WhatsApp"><svg className="h-6 w-6 text-gray-600 hover:text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20.52 3.48A12.07 12.07 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.12.55 4.18 1.6 6.02L0 24l6.18-1.6A12.07 12.07 0 0 0 12 24c6.63 0 12-5.37 12-12c0-3.19-1.24-6.19-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.22-1.44l-.37-.22l-3.67.95l.98-3.57l-.24-.38A9.98 9.98 0 0 1 2 12c0-5.52 4.48-10 10-10s10 4.48 10 10s-4.48 10-10 10zm5.2-7.8c-.28-.14-1.65-.81-1.9-.9c-.25-.09-.43-.14-.61.14c-.18.28-.7.9-.86 1.08c-.16.18-.32.2-.6.07c-.28-.14-1.18-.44-2.25-1.4c-.83-.74-1.39-1.65-1.55-1.93c-.16-.28-.02-.43.12-.57c.13-.13.28-.34.42-.51c.14-.17.18-.29.28-.48c.09-.19.05-.36-.02-.5c-.07-.14-.61-1.47-.84-2.01c-.22-.53-.45-.46-.61-.47c-.16-.01-.35-.01-.54-.01c-.19 0-.5.07-.76.36c-.26.29-1 1-1 2.43c0 1.43 1.02 2.81 1.16 3c.14.19 2.01 3.08 4.87 4.2c.68.29 1.21.46 1.62.59c.68.22 1.3.19 1.79.12c.55-.08 1.65-.67 1.89-1.32c.23-.65.23-1.2.16-1.32c-.07-.12-.25-.19-.53-.33z"/></svg></a>
            </div>
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