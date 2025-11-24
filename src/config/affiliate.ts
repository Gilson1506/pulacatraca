// Configurações do Sistema de Afiliados

export const AFFILIATE_CONFIG = {
    // Cookie/Storage
    COOKIE_NAME: 'pulacatraca_affiliate_ref',
    COOKIE_EXPIRY_DAYS: 30,
    STORAGE_KEY: 'affiliate_ref',

    // Comissões
    DEFAULT_COMMISSION_PERCENTAGE: 10,
    MIN_COMMISSION_PERCENTAGE: 5,
    MAX_COMMISSION_PERCENTAGE: 30,

    // Pagamentos
    MIN_WITHDRAWAL: 50.00,
    COMMISSION_APPROVAL_DAYS: 7, // Dias após evento para aprovar comissão
    PAYMENT_DEADLINE_DAYS: 30, // Prazo para pagamento após aprovação

    // Status
    AFFILIATE_STATUS: {
        PENDING: 'pending',
        ACTIVE: 'active',
        SUSPENDED: 'suspended',
        REJECTED: 'rejected',
    },

    COMMISSION_STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        PAID: 'paid',
        CANCELLED: 'cancelled',
    },

    PAYMENT_STATUS: {
        PENDING: 'pending',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        FAILED: 'failed',
    },

    // Tipos
    COMMISSION_TYPE: {
        PERCENTAGE: 'percentage',
        FIXED: 'fixed',
    },

    PIX_TYPE: {
        CPF: 'cpf',
        CNPJ: 'cnpj',
        EMAIL: 'email',
        PHONE: 'phone',
        RANDOM: 'random',
    },

    PAYMENT_METHOD: {
        PIX: 'pix',
        BANK_TRANSFER: 'bank_transfer',
    },
};

// Textos e labels
export const AFFILIATE_LABELS = {
    STATUS: {
        pending: 'Pendente',
        active: 'Ativo',
        suspended: 'Suspenso',
        rejected: 'Rejeitado',
    },

    COMMISSION_STATUS: {
        pending: 'Pendente',
        approved: 'Aprovada',
        paid: 'Paga',
        cancelled: 'Cancelada',
    },

    PAYMENT_STATUS: {
        pending: 'Pendente',
        processing: 'Processando',
        completed: 'Concluído',
        failed: 'Falhou',
    },

    PIX_TYPE: {
        cpf: 'CPF',
        cnpj: 'CNPJ',
        email: 'E-mail',
        phone: 'Telefone',
        random: 'Chave Aleatória',
    },
};

// Validações
export const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]/g, '');

    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cpf.charAt(10))) return false;

    return true;
};

export const validateCNPJ = (cnpj: string): boolean => {
    cnpj = cnpj.replace(/[^\d]/g, '');

    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
};

export const formatCPF = (cpf: string): string => {
    cpf = cpf.replace(/[^\d]/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCNPJ = (cnpj: string): string => {
    cnpj = cnpj.replace(/[^\d]/g, '');
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatPhone = (phone: string): string => {
    phone = phone.replace(/[^\d]/g, '');
    if (phone.length === 11) {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (phone.length === 10) {
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
};

// Helpers
export const calculateCommission = (
    saleAmount: number,
    commissionType: string,
    commissionValue: number,
    maxCommission?: number
): number => {
    let commission = 0;

    if (commissionType === AFFILIATE_CONFIG.COMMISSION_TYPE.PERCENTAGE) {
        commission = saleAmount * (commissionValue / 100);
    } else {
        commission = commissionValue;
    }

    if (maxCommission && commission > maxCommission) {
        commission = maxCommission;
    }

    return Math.round(commission * 100) / 100;
};

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
};
