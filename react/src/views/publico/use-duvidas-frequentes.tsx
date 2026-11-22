import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';

// Perguntas frequentes: FONTE ÚNICA (15-11-2026). A página /perguntas-frequentes mostra todas; a Home mostra só as
// marcadas com `naHome`, com o MESMO texto. Antes a Home tinha 3 respostas escritas à mão, que ficavam velhas.
// Revisadas contra o banco (05): desistir_contribuicao, mural_apoiadores, destino_dinheiro_campanha e as regras
// de meio de pagamento. Números de negócio vêm das configurações públicas, nunca escritos aqui.
export interface DuvidaFrequente {
  chave: string;
  // Aparece também na seção de perguntas da Home.
  naHome: boolean;
  pergunta: string;
  resposta: ReactNode;
}

export function useDuvidasFrequentes(): DuvidaFrequente[] {
  const { obterNumero, obterConfiguracao } = useConfiguracoes();
  const prazoDesistencia = obterNumero('desistencia_prazo_dias', 7);
  const valorMinimo = obterNumero('valor_minimo_contribuicao', 5);
  const carenciaRepasse = obterNumero('repasse_carencia_dias', 15);
  const validadePix = obterNumero('pix_validade_horas', 24);
  const cartaoMinimo = obterNumero('valor_minimo_contribuicao_cartao', 20);
  const cartaoMaximo = obterNumero('valor_maximo_contribuicao_cartao', 500);
  const cartaoHabilitado = obterConfiguracao('cartao_habilitado', true) !== false;
  const emailSuporte = String(obterConfiguracao('email_suporte', 'o e-mail de suporte') ?? 'o e-mail de suporte');


  const duvidas: DuvidaFrequente[] = [
    {
      chave: 'informacoes',
      naHome: true,
      pergunta: 'Que informações encontro em uma campanha?',
      resposta:
        'A proposta da pesquisa, a meta, o prazo, o orçamento detalhado, o cronograma, quanto já foi arrecadado, o modelo de financiamento, o Mural dos apoiadores, as atualizações do pesquisador e o perfil dele, com instituição, links acadêmicos e pontuação de reputação.',
    },
    {
      chave: 'conta',
      naHome: false,
      pergunta: 'Preciso criar uma conta para apoiar?',
      resposta: `Não para apoiar com Pix. Sem conta, o apoio aparece como anônimo (inclusive no Mural dos apoiadores) e você não recebe avisos por e-mail. Com conta, você acompanha seus apoios, segue campanhas e pesquisadores, aparece com o seu nome no mural${cartaoHabilitado ? ' e pode usar cartão nas campanhas flexíveis' : ''}.`,
    },
    {
      chave: 'apoiar',
      naHome: true,
      pergunta: 'Como apoio financeiramente?',
      resposta: `Na página da campanha, clique em "Apoiar esta pesquisa", escolha o valor (mínimo de ${formatarMoeda(valorMinimo)}), aceite os Termos e clique em "Gerar Pix": o QR Code e o código copia e cola aparecem na hora e valem por ${validadePix} horas. Se não pagar nesse prazo, ele expira sem nenhuma cobrança. O apoio só conta depois que o pagamento é confirmado.${cartaoHabilitado ? ` O cartão só vale em campanhas flexíveis, para quem tem conta, de ${formatarMoeda(cartaoMinimo)} a ${formatarMoeda(cartaoMaximo)}.` : ''}`,
    },
    {
      chave: 'meta',
      naHome: false,
      pergunta: 'O que acontece se a campanha não atingir a meta?',
      resposta: `Depende do modelo. No Tudo ou Nada, os apoios são devolvidos automaticamente. No Flexível, o valor vai para o pesquisador mesmo sem bater a meta, e você confirma que entendeu isso antes de apoiar. Em qualquer modelo, se a moderação encerrar a campanha, os apoios são devolvidos. Nas devoluções, volta o valor do apoio; a tarifa do meio de pagamento fica com o provedor.`,
    },
    {
      chave: 'repasse',
      naHome: false,
      pergunta: 'Quando o pesquisador recebe o dinheiro?',
      resposta: `Só depois que a campanha termina, e nunca na hora do apoio. O valor fica guardado até o encerramento e é enviado por Pix ao pesquisador após ${carenciaRepasse} dias de carência, que servem de janela para contestações e estornos. No Tudo ou Nada, só há repasse se a meta for atingida.`,
    },
    {
      chave: 'desistir',
      naHome: false,
      pergunta: 'Posso desistir do apoio?',
      resposta: `Sim, em até ${prazoDesistencia} dias depois de apoiar, desde que o pagamento já tenha sido confirmado. Com conta, pela Minha Conta, em Financeiro. Sem conta, pelo suporte (${emailSuporte}), com o protocolo do apoio. O valor do apoio volta pelo mesmo meio de pagamento; a tarifa do meio de pagamento não volta, e quem ficar abaixo do mínimo sai do Mural dos apoiadores.`,
    },
    {
      chave: 'taxas',
      naHome: false,
      pergunta: 'Quais são as taxas e tarifas?',
      resposta: (
        <>
          A taxa da plataforma é descontada do valor que chega ao pesquisador, e a tarifa do meio de pagamento é paga por
          quem apoia, somada ao valor do apoio. Veja os valores e simule em{' '}
          <Link to="/transparencia" className="texto-marca underline">Taxas e transparência</Link>.
        </>
      ),
    },
    {
      chave: 'confianca',
      naHome: false,
      pergunta: 'Como sei que o pesquisador e a campanha são confiáveis?',
      resposta: (
        <>
          Toda campanha passa por curadoria antes de ser publicada, o pesquisador é uma pessoa identificada com perfil
          acadêmico e tem uma pontuação de reputação pública, e qualquer pessoa com conta pode denunciar campanhas e
          perfis. A curadoria confere a consistência do projeto, mas não garante o resultado da pesquisa. Veja os
          detalhes em <Link to="/como-funciona" className="texto-marca underline">Como funciona</Link>.
        </>
      ),
    },
    {
      chave: 'acompanhar',
      naHome: true,
      pergunta: 'Como acompanho o andamento do projeto?',
      resposta:
        'Pelas atualizações que o pesquisador publica na página da campanha. Com conta, você pode seguir a campanha ou o pesquisador e recebe um aviso a cada novidade.',
    },
    {
      chave: 'recompensas',
      naHome: false,
      pergunta: 'Existe recompensa por apoiar?',
      resposta:
        'Sim, o Mural dos apoiadores, quando o pesquisador o oferece: quem soma, nos apoios a uma campanha, o valor mínimo que o pesquisador escolheu aparece com o nome e a foto na página dela. É um agradecimento simbólico, sem envio de itens. Quem apoia como anônimo, ou sem conta, aparece no mural sem nome. Quem desiste do apoio e fica abaixo do mínimo sai do mural; se a campanha não bater a meta e o dinheiro for devolvido, quem apoiou continua no mural.',
    },
    {
      chave: 'pesquisador',
      naHome: false,
      pergunta: 'Posso submeter minha própria pesquisa?',
      resposta: (
        <>
          Sim. Com uma conta, você pede o perfil de pesquisador, informando CPF, título acadêmico e vínculo, e envia a
          campanha para avaliação. Veja o passo a passo em{' '}
          <Link to="/como-funciona" className="texto-marca underline">Como funciona</Link>.
        </>
      ),
    },
  ];

  return duvidas;
}
