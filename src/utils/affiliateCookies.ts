// Utilitários para gerenciar cookies de afiliado

import { AFFILIATE_CONFIG } from '../config/affiliate';

interface CookieOptions {
    days?: number;
    path?: string;
    sameSite?: 'Strict' | 'Lax' | 'None';
    secure?: boolean;
}

/**
 * Define um cookie com o código do afiliado
 */
export const setAffiliateCookie = (
    affiliateCode: string,
    options: CookieOptions = {}
): void => {
    const {
        days = AFFILIATE_CONFIG.COOKIE_EXPIRY_DAYS,
        path = '/',
        sameSite = 'Lax',
        secure = window.location.protocol === 'https:',
    } = options;

    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    let cookieString = `${AFFILIATE_CONFIG.COOKIE_NAME}=${affiliateCode}`;
    cookieString += `; expires=${expires.toUTCString()}`;
    cookieString += `; path=${path}`;
    cookieString += `; SameSite=${sameSite}`;

    if (secure) {
        cookieString += '; Secure';
    }

    document.cookie = cookieString;

    // Também salvar no localStorage como backup
    try {
        localStorage.setItem(AFFILIATE_CONFIG.STORAGE_KEY, affiliateCode);
    } catch (e) {
        console.warn('Não foi possível salvar no localStorage:', e);
    }
};

/**
 * Obtém o código do afiliado do cookie
 */
export const getAffiliateCookie = (): string | null => {
    // Tentar obter do cookie primeiro
    const name = AFFILIATE_CONFIG.COOKIE_NAME + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i].trim();
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }

    // Fallback para localStorage
    try {
        const stored = localStorage.getItem(AFFILIATE_CONFIG.STORAGE_KEY);
        if (stored) {
            return stored;
        }
    } catch (e) {
        console.warn('Não foi possível ler do localStorage:', e);
    }

    return null;
};

/**
 * Remove o cookie do afiliado
 */
export const clearAffiliateCookie = (): void => {
    document.cookie = `${AFFILIATE_CONFIG.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

    try {
        localStorage.removeItem(AFFILIATE_CONFIG.STORAGE_KEY);
    } catch (e) {
        console.warn('Não foi possível remover do localStorage:', e);
    }
};

/**
 * Verifica se existe um cookie de afiliado ativo
 */
export const hasAffiliateCookie = (): boolean => {
    return getAffiliateCookie() !== null;
};

/**
 * Obtém informações sobre o cookie de afiliado
 */
export const getAffiliateCookieInfo = (): {
    code: string | null;
    exists: boolean;
    source: 'cookie' | 'localStorage' | 'none';
} => {
    const cookieCode = getAffiliateCookie();

    if (!cookieCode) {
        return {
            code: null,
            exists: false,
            source: 'none',
        };
    }

    // Verificar de onde veio
    const name = AFFILIATE_CONFIG.COOKIE_NAME + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const hasCookie = decodedCookie.includes(name);

    return {
        code: cookieCode,
        exists: true,
        source: hasCookie ? 'cookie' : 'localStorage',
    };
};
