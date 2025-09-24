/**
 * Teste do serviço de geração de card hash
 * Execute este arquivo para testar a implementação
 */

import frontendCardHashService from './frontendCardHashService';

// Dados de teste (cartão de teste do Pagar.me)
const testCardData = {
  number: '4111111111111111', // Visa de teste
  holder_name: 'João Silva',
  exp_month: 12,
  exp_year: 2025,
  cvv: '123'
};

async function testCardHashGeneration() {
  console.log('🧪 Iniciando teste de geração de card hash...');
  
  try {
    // Teste 1: Validação de dados
    console.log('\n1️⃣ Testando validação de dados...');
    
    const isValidNumber = frontendCardHashService.validateCardNumber(testCardData.number);
    console.log('✅ Número do cartão válido:', isValidNumber);
    
    const brand = frontendCardHashService.getCardBrand(testCardData.number);
    console.log('✅ Bandeira identificada:', brand);
    
    const isValidCVV = frontendCardHashService.validateCVV(testCardData.cvv, brand);
    console.log('✅ CVV válido:', isValidCVV);
    
    const isValidExpiry = frontendCardHashService.validateExpiry(testCardData.exp_month, testCardData.exp_year);
    console.log('✅ Data de expiração válida:', isValidExpiry);
    
    // Teste 2: Formatação
    console.log('\n2️⃣ Testando formatação...');
    
    const formattedNumber = frontendCardHashService.formatCardNumber(testCardData.number);
    console.log('✅ Número formatado:', formattedNumber);
    
    const formattedExpiry = frontendCardHashService.formatExpiry('1225');
    console.log('✅ Data formatada:', formattedExpiry);
    
    // Teste 3: Geração de card hash
    console.log('\n3️⃣ Testando geração de card hash...');
    
    const cardHash = await frontendCardHashService.generateCardHash(testCardData);
    console.log('✅ Card hash gerado:', cardHash);
    console.log('✅ Tamanho do hash:', cardHash.length);
    console.log('✅ Preview do hash:', cardHash.substring(0, 10) + '...');
    
    console.log('\n🎉 Todos os testes passaram com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Teste de validação de chaves
function testConfiguration() {
  console.log('\n🔧 Testando configuração...');
  
  try {
    frontendCardHashService.validatePublicKey();
    console.log('✅ Public key configurada corretamente');
  } catch (error) {
    console.error('❌ Erro na public key:', error.message);
  }
  
  try {
    frontendCardHashService.validateEncryptionKey();
    console.log('✅ Encryption key configurada corretamente');
  } catch (error) {
    console.error('❌ Erro na encryption key:', error.message);
  }
}

// Executar testes
if (typeof window !== 'undefined') {
  // No navegador
  window.testCardHash = testCardHashGeneration;
  window.testConfig = testConfiguration;
  
  console.log('🧪 Testes carregados! Execute no console:');
  console.log('- testConfig() - para testar configuração');
  console.log('- testCardHash() - para testar geração de hash');
} else {
  // No Node.js
  testConfiguration();
  testCardHashGeneration();
}

export { testCardHashGeneration, testConfiguration };

