import React from 'react';

const PolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Política de cancelamento e reembolso</h1>

      <section className="space-y-3 sm:space-y-4 text-gray-700">
        <p>
          Caso você não possa mais comparecer ao evento e deseje o reembolso:
        </p>
        <ul className="list-disc pl-4 sm:pl-6 space-y-2">
          <li>De acordo com o artigo 49 do Código de Defesa do Consumidor, é possível solicitar o cancelamento em até 7 dias contados a partir da data da compra;</li>
          <li>Cancelamentos solicitados nas 48 horas que antecedem o evento não serão aceitos;</li>
        </ul>
      </section>

      <section className="space-y-3 sm:space-y-4 text-gray-700 mt-6 sm:mt-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Como solicitar:</h2>
        <ol className="list-decimal pl-4 sm:pl-6 space-y-2">
          <li>Acesse sua conta e clique na seção Meus Pedidos;</li>
          <li>Localize o pedido e selecione a opção CANCELAR PEDIDO.</li>
        </ol>
      </section>

      <section className="space-y-3 sm:space-y-4 text-gray-700 mt-6 sm:mt-8">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Observações importantes:</h2>
        <ul className="list-disc pl-4 sm:pl-6 space-y-2">
          <li>Compras realizadas fora da plataforma (ex: via promoter, atlética, ponto físico) devem ser tratadas diretamente com os organizadores do evento;</li>
          <li>Cancelamentos solicitados após o início do evento não serão processados.</li>
        </ul>
      </section>

      <p className="mt-6 sm:mt-8 text-sm text-gray-500">Esta página será atualizada futuramente com mais detalhes.</p>
      </div>
    </div>
  );
};

export default PolicyPage;