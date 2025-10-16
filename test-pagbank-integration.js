// test-pagbank-integration.js
// Script de teste rápido para verificar a integração PagBank

const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:3000';

async function testBackendConnection() {
  console.log('🔍 Testando conexão com o backend...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/`);
    const data = await response.text();
    
    if (response.ok) {
      console.log('✅ Backend conectado:', data);
      return true;
    } else {
      console.log('❌ Backend retornou erro:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Erro ao conectar com o backend:', error.message);
    console.log('💡 Certifique-se de que o backend está rodando: cd backend && npm start');
    return false;
  }
}

async function testEnvironmentCheck() {
  console.log('\n🔍 Testando configuração do ambiente...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/env-check`);
    const data = await response.json();
    
    console.log('📋 Status do ambiente:');
    console.log('  - Porta:', data.port);
    console.log('  - PagBank API Key:', data.has_pagbank_key ? '✅ Configurada' : '❌ Não configurada');
    console.log('  - Ambiente:', data.environment);
    
    if (!data.has_pagbank_key) {
      console.log('⚠️  Configure PAGBANK_API_KEY no arquivo backend/.env');
    }
    
    return data.has_pagbank_key;
  } catch (error) {
    console.log('❌ Erro ao verificar ambiente:', error.message);
    return false;
  }
}

async function testPixPayment() {
  console.log('\n🧪 Testando pagamento PIX...');
  
  const pixOrder = {
    reference_id: `teste-integration-${Date.now()}`,
    customer: {
      name: 'Cliente Teste',
      email: 'cliente@teste.com',
      tax_id: '12345678909',
      phones: [
        {
          country: '55',
          area: '11',
          number: '999999999',
          type: 'MOBILE'
        }
      ]
    },
    items: [
      {
        name: 'Teste de Integração',
        quantity: 1,
        unit_amount: 100 // R$ 1,00
      }
    ],
    qr_codes: [
      {
        amount: {
          value: 100
        },
        expiration_date: new Date(Date.now() + 3600000).toISOString()
      }
    ]
  };

  try {
    const response = await fetch(`${BACKEND_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pixOrder)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ PIX criado com sucesso!');
      console.log('  - ID do pedido:', data.id);
      console.log('  - Status:', data.status);
      
      if (data.pix && data.pix.qr_code) {
        console.log('  - QR Code gerado: ✅');
      }
      
      return data.id;
    } else {
      console.log('❌ Erro ao criar PIX:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Erro na requisição PIX:', error.message);
    return null;
  }
}

async function testCardToken() {
  console.log('\n💳 Testando geração de token do cartão...');
  
  const cardData = {
    card: {
      number: '4111111111111111',
      holder_name: 'Cliente Teste',
      exp_month: '03',
      exp_year: '2026',
      cvv: '123'
    }
  };

  try {
    const response = await fetch(`${BACKEND_URL}/api/payments/generate-card-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cardData)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Token do cartão gerado!');
      console.log('  - Token:', data.card_token);
      return data.card_token;
    } else {
      console.log('❌ Erro ao gerar token:', data.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Erro na requisição de token:', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando testes de integração PagBank...\n');
  
  // Teste 1: Conexão com backend
  const backendOk = await testBackendConnection();
  if (!backendOk) {
    console.log('\n❌ Testes interrompidos - Backend não disponível');
    return;
  }
  
  // Teste 2: Configuração do ambiente
  const envOk = await testEnvironmentCheck();
  if (!envOk) {
    console.log('\n⚠️  Continue os testes mesmo sem API Key configurada');
  }
  
  // Teste 3: Pagamento PIX
  const pixOrderId = await testPixPayment();
  
  // Teste 4: Token do cartão
  const cardToken = await testCardToken();
  
  // Resumo
  console.log('\n📊 Resumo dos Testes:');
  console.log('  - Backend: ✅ Conectado');
  console.log('  - Ambiente:', envOk ? '✅ Configurado' : '⚠️  API Key não configurada');
  console.log('  - PIX:', pixOrderId ? '✅ Funcionando' : '❌ Erro');
  console.log('  - Token Cartão:', cardToken ? '✅ Funcionando' : '❌ Erro');
  
  if (pixOrderId && cardToken) {
    console.log('\n🎉 Todos os testes passaram! A integração está funcionando.');
    console.log('🌐 Acesse: http://localhost:5173/test-pagbank');
  } else {
    console.log('\n⚠️  Alguns testes falharam. Verifique a configuração.');
  }
}

// Executar testes
runAllTests().catch(console.error);
