import { Megaphone } from 'lucide-react';
import AiChat from '../../components/AiChat';

export default function AiMarketing() {
  return (
    <AiChat
      endpoint="/ai/marketing"
      title="IA de Marketing"
      subtitle="Copy, ideias de conteúdo, posts e estratégias de crescimento para o seu negócio"
      icon={Megaphone}
      suggestions={[
        'Crie 3 legendas de Instagram para promoção de fim de semana',
        'Monte um calendário de conteúdo de 7 dias para minha padaria',
        'Escreva uma mensagem de WhatsApp para reativar clientes inativos',
        'Ideias de campanha para o Dia dos Pais em loja de tecnologia',
      ]}
    />
  );
}
