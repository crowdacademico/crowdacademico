import { Link } from 'react-router';
import { CabecalhoPagina } from '../../components/layout/cabecalho-pagina';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';

// Perguntas frequentes (14-11-2026): saíram de Como funciona para uma página própria; a Home mostra algumas e
// leva para cá ("Ver todas as perguntas"). Números de negócio vêm das configurações públicas, nunca escritos aqui.
export function PerguntasFrequentes() {
  const { obterNumero } = useConfiguracoes();
  const prazoDesistencia = obterNumero('desistencia_prazo_dias', 7);
  const valorMinimo = obterNumero('valor_minimo_contribuicao', 5);

  const duvidas: { pergunta: string; resposta: React.ReactNode }[] = [
    {
      pergunta: 'Que informações encontro em uma campanha?',
      resposta:
        'A proposta da pesquisa, o orçamento detalhado, o cronograma, as atualizações do pesquisador, quanto já foi arrecadado e o modelo de financiamento.',
    },
    {
      pergunta: 'Preciso criar uma conta para apoiar?',
      resposta:
        'Não para apoiar com Pix. Com conta você acompanha seus apoios, ganha as recompensas e pode usar cartão nas campanhas flexíveis.',
    },
    {
      pergunta: 'Como apoio financeiramente?',
      resposta: `Na página da campanha, clique em "Apoiar esta pesquisa", escolha o valor (mínimo de R$ ${valorMinimo.toFixed(2).replace('.', ',')}) e pague o Pix gerado. O apoio só conta depois que o pagamento é confirmado.`,
    },
    {
      pergunta: 'O que acontece se a campanha não atingir a meta?',
      resposta:
        'Depende do modelo. No Tudo ou Nada, o valor é devolvido. No Flexível, o valor vai para o pesquisador mesmo sem bater a meta, e você confirma que entendeu isso antes de apoiar.',
    },
    {
      pergunta: 'Posso desistir do apoio?',
      resposta: `Sim, em até ${prazoDesistencia} dias depois de apoiar. Com conta, pela Minha Conta, em Financeiro; sem conta, pelo suporte, com o protocolo do apoio. O valor volta pelo mesmo meio de pagamento (a tarifa do meio de pagamento não volta).`,
    },
    {
      pergunta: 'Quais são as taxas e tarifas?',
      resposta: (
        <>
          A taxa da plataforma é descontada do valor que chega ao pesquisador, e a tarifa do meio de pagamento é paga por quem
          apoia. Veja os valores e simule na página de <Link to="/transparencia" className="texto-marca underline">Transparência</Link>.
        </>
      ),
    },
    {
      pergunta: 'Como acompanho o andamento do projeto?',
      resposta:
        'Pelas atualizações que o pesquisador publica na página da campanha. Seguindo a campanha ou o pesquisador, você recebe um aviso a cada novidade.',
    },
    {
      pergunta: 'O que são as recompensas?',
      resposta:
        'Agradecimentos simbólicos (seu nome nos agradecimentos, acesso antecipado aos resultados ou um conteúdo digital). Quem apoia com conta ganha automaticamente todas as que o valor alcança, e você recebe um e-mail quando elas são liberadas: na campanha flexível, assim que o pagamento é confirmado; na Tudo ou Nada, quando a campanha bate a meta. Elas ficam em Minha Conta, na aba Contribuições. Se o apoio for devolvido, a recompensa sai. Quem apoia como anônimo não ganha o reconhecimento por nome.',
    },
  ];

  return (
    <div className="pagina-publica fundo-pagina min-h-full py-16">
      <div className="mx-auto max-w-3xl px-4">
        <CabecalhoPagina className="mb-10" titulo="Perguntas frequentes" descricao="O que mais perguntam sobre apoiar e acompanhar pesquisas no CrowdAcadêmico." />
        <div className="flex flex-col gap-3">
          {duvidas.map((duvida) => (
            <details key={duvida.pergunta} className="pagina-publica__faq">
              <summary>{duvida.pergunta}</summary>
              <p className="paragrafo texto-padrao mt-3">{duvida.resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
