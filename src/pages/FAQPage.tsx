import React from 'react';

const FAQPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Guia Completo de Compra e Gestão de Ingressos - Pulakatraka</h1>

      <section className="space-y-4 text-gray-700">
        <h2 className="text-xl font-semibold text-gray-900">Como funciona a compra de ingressos pelo Pulakatraka?</h2>
        <p>Adquirir ingressos na plataforma Pulakatraka é simples, rápido e seguro. Veja abaixo o passo a passo completo:</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Crie sua conta: Acesse o site Pulakatraka e realize seu cadastro preenchendo seus dados pessoais corretamente.</li>
          <li>Escolha o evento: Navegue pela página inicial ou utilize a busca para localizar o evento de seu interesse.</li>
          <li>Selecione seus ingressos: Escolha a quantidade desejada e clique no botão COMPRAR.</li>
          <li>Confirme o pedido: Revise as informações do carrinho de compras e clique em FINALIZAR PAGAMENTO. Você será direcionado para a plataforma de pagamento (Stripe).</li>
          <li>Escolha a forma de pagamento: Estão disponíveis as seguintes opções: cartão de crédito, cartão de débito virtual da Caixa, PIX, PayPal e boleto bancário.</li>
          <li>Preencha os dados: Insira corretamente as informações solicitadas e clique em PAGAR.</li>
          <li>Confirmação e acesso aos ingressos: Após a aprovação do pagamento, você receberá um e-mail com os ingressos anexados. Eles também ficarão disponíveis para download na área Meus Ingressos dentro do site.</li>
        </ol>
        <p className="mt-2 text-gray-700">Atenção: A apresentação do ingresso na tela do celular é suficiente na entrada do evento. Não há necessidade de impressão.</p>
      </section>

      <section className="space-y-4 text-gray-700 mt-8">
        <h2 className="text-xl font-semibold text-gray-900">Ingressos em nome de terceiros</h2>
        <p>Se você comprou o ingresso, mas outra pessoa é quem irá utilizá-lo, siga este procedimento:</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Acesse a seção Meus Ingressos;</li>
          <li>Localize o ingresso desejado e edite o nome completo e CPF da pessoa que irá utilizá-lo;</li>
          <li>Clique em BAIXAR INGRESSO (PDF) e envie para o novo participante.</li>
        </ol>
        <p className="mt-2">Importante: a troca de titularidade deve ser feita sempre que você estiver transferindo um ingresso para outra pessoa, especialmente se houver compra ou venda entre desconhecidos.</p>
      </section>

      <section className="space-y-4 text-gray-700 mt-8">
        <h2 className="text-xl font-semibold text-gray-900">Como transferir a titularidade de um ingresso?</h2>
        <p>Para garantir segurança na transação:</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Acesse o ingresso desejado na plataforma;</li>
          <li>Clique em TRANSFERIR INGRESSO (botão abaixo do QR Code);</li>
          <li>Insira os dados do novo titular e confirme;</li>
          <li>O novo participante receberá um e-mail com o ingresso atualizado e também poderá visualizá-lo em sua conta.</li>
        </ol>
      </section>

      <section className="space-y-4 text-gray-700 mt-8">
        <h2 className="text-xl font-semibold text-gray-900">Pagamentos recusados - O que pode ter acontecido?</h2>
        <p>A plataforma de pagamentos (Stripe) realiza uma análise automática de segurança. O pagamento pode ser rejeitado pelos seguintes motivos:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Uso de cartão em nome diferente do titular da conta;</li>
          <li>Dados incorretos durante o preenchimento do pagamento;</li>
          <li>Cartão vencido ou bloqueado;</li>
          <li>Limite insuficiente;</li>
          <li>Bloqueio por parte do banco emissor;</li>
          <li>Falha na validação antifraude da plataforma;</li>
          <li>Perfil de compra com histórico considerado de risco.</li>
        </ul>
        <h3 className="font-semibold text-gray-900">Como resolver:</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Revise e corrija os dados informados;</li>
          <li>Tente outro cartão ou forma de pagamento como PIX ou boleto;</li>
          <li>Se a transação aparecer na sua fatura, o estorno será realizado automaticamente em caso de recusa.</li>
        </ul>
      </section>

      <section className="space-y-4 text-gray-700 mt-8">
        <h2 className="text-xl font-semibold text-gray-900">Eventos cancelados ou adiados</h2>
        <p>
          Caso o evento seja cancelado ou reagendado por motivos de força maior (como problemas estruturais,
          climáticos, legais etc.), conforme previsto no artigo 393 do Código Civil, o Pulakatraka não assume a
          responsabilidade direta pela devolução dos valores. Nesses casos, é necessário aguardar posicionamento
          oficial dos organizadores para saber se haverá estorno ou remarcação.
        </p>
        <p className="mt-2">
          Exceção: Se a compra foi realizada há menos de 7 dias, é possível solicitar o cancelamento diretamente pela plataforma Pulakatraca.
        </p>
      </section>
    </div>
  );
};

export default FAQPage;