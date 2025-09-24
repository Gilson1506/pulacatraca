import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfUsePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              Voltar
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Termos de Uso</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-8">
          <div className="prose prose-gray max-w-none">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Termos de Uso - Pulakatraca</h2>
            
            <p className="text-gray-600 mb-6">
              <strong>Última atualização:</strong> {new Date().toLocaleDateString('pt-BR')}
            </p>

            <div className="space-y-8">
              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Aceitação dos Termos</h3>
                <p className="text-gray-700 leading-relaxed">
                  Ao acessar e utilizar a plataforma Pulakatraca, você concorda em cumprir e estar vinculado aos presentes Termos de Uso. 
                  Se você não concordar com qualquer parte destes termos, não deve utilizar nossos serviços.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Descrição do Serviço</h3>
                <p className="text-gray-700 leading-relaxed">
                  O Pulakatraca é uma plataforma digital que facilita a compra e venda de ingressos para eventos diversos. 
                  Nossa plataforma conecta organizadores de eventos com o público interessado em participar desses eventos.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">3. Cadastro e Conta do Usuário</h3>
                <div className="text-gray-700 leading-relaxed space-y-3">
                  <p>3.1. Para utilizar nossos serviços, você deve criar uma conta fornecendo informações precisas e atualizadas.</p>
                  <p>3.2. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorram em sua conta.</p>
                  <p>3.3. Você deve notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta.</p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">4. Compra de Ingressos</h3>
                <div className="text-gray-700 leading-relaxed space-y-3">
                  <p>4.1. Os preços dos ingressos são definidos pelos organizadores dos eventos e podem incluir taxas de conveniência.</p>
                  <p>4.2. O pagamento é processado de forma segura através de nossos parceiros de pagamento.</p>
                  <p>4.3. Após a confirmação do pagamento, você receberá seu ingresso digital.</p>
                  <p>4.4. Os ingressos são pessoais e intransferíveis, salvo exceções específicas.</p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">5. Cancelamentos e Reembolsos</h3>
                <div className="text-gray-700 leading-relaxed space-y-3">
                  <p>5.1. As políticas de cancelamento e reembolso variam conforme o evento e são definidas pelo organizador.</p>
                  <p>5.2. Em caso de cancelamento do evento pelo organizador, o reembolso será processado conforme a política estabelecida.</p>
                  <p>5.3. Cancelamentos por parte do usuário estão sujeitos às condições específicas de cada evento.</p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">6. Responsabilidades do Usuário</h3>
                <div className="text-gray-700 leading-relaxed space-y-3">
                  <p>6.1. Você concorda em utilizar a plataforma de forma legal e ética.</p>
                  <p>6.2. É proibido o uso da plataforma para atividades ilegais ou que violem direitos de terceiros.</p>
                  <p>6.3. Você não deve tentar interferir no funcionamento da plataforma ou acessar dados não autorizados.</p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">7. Propriedade Intelectual</h3>
                <p className="text-gray-700 leading-relaxed">
                  Todo o conteúdo da plataforma Pulakatraca, incluindo textos, gráficos, logotipos, imagens e software, 
                  é propriedade da empresa e está protegido por leis de direitos autorais e outras leis de propriedade intelectual.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">8. Limitação de Responsabilidade</h3>
                <p className="text-gray-700 leading-relaxed">
                  O Pulakatraca não se responsabiliza por danos diretos, indiretos, incidentais ou consequenciais 
                  resultantes do uso ou impossibilidade de uso de nossos serviços.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">9. Modificações dos Termos</h3>
                <p className="text-gray-700 leading-relaxed">
                  Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. 
                  As alterações entrarão em vigor imediatamente após sua publicação na plataforma.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">10. Contato</h3>
                <p className="text-gray-700 leading-relaxed">
                  Para dúvidas sobre estes Termos de Uso, entre em contato conosco através do nosso 
                  <a href="https://wa.me/5531999999999" className="text-pink-600 hover:text-pink-700 underline">
                    WhatsApp
                  </a> ou através da seção de contato em nossa plataforma.
                </p>
              </section>
            </div>

            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 text-center">
                Ao utilizar a plataforma Pulakatraca, você confirma que leu, compreendeu e concorda com estes Termos de Uso.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUsePage;
