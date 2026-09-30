import { Sparkles } from 'lucide-react';
import AiChat from '../../components/AiChat';

export default function AiSupport() {
  return (
    <AiChat
      endpoint="/ai/support"
      title="IA de Suporte"
      subtitle="Tire dúvidas de uso do sistema e receba dicas de melhoria operacional"
      icon={Sparkles}
      suggestions={[
        'Como registro uma entrada de estoque?',
        'Como importar produtos em massa por CSV?',
        'Como organizar o Kanban para pedidos de restaurante?',
        'Dicas para reduzir perdas de estoque na padaria',
      ]}
    />
  );
}
