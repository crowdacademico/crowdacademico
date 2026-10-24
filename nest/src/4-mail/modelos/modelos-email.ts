import {
  TIPO_NOTIFICACAO,
  type TipoNotificacao,
} from '../../27-notificacao/constants/notificacao.constants';
import type { ConteudoEmail } from './layout-email';

// O texto de cada tipo de e-mail (notificacao.tipo_evento). Os dados vêm de notificacao.dados, gravados por quem
// enfileirou (gatilhos de [05-Q] no banco, ou o Nest no cadastro e na recuperação de senha). Todo campo é opcional
// aqui: um dado faltando nunca derruba o envio, o texto só fica mais genérico.
export interface ContextoModelo {
  dados: Record<string, unknown>;
  // Endereço do painel (PAINEL_URL), para os links.
  urlPainel: string;
  // O token do link, já decifrado (só verificação de conta e recuperação de senha).
  segredo: string | null;
}

type Modelo = (contexto: ContextoModelo) => ConteudoEmail | null;

const texto = (valor: unknown): string | null =>
  typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;

const saudacao = (dados: Record<string, unknown>): string => {
  const nome = texto(dados.nome)?.split(' ')[0];
  return nome ? `Olá, ${nome}!` : 'Olá!';
};

const campanha = (dados: Record<string, unknown>): string => {
  const titulo = texto(dados.titulo);
  return titulo ? `"${titulo}"` : 'a campanha';
};

const data = (valor: unknown): string | null => {
  const bruto = texto(valor);
  if (!bruto) return null;
  const quando = new Date(bruto);
  return Number.isNaN(quando.getTime())
    ? null
    : quando.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

const moeda = (valor: unknown): string | null => {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;
};

const entrar = (contexto: ContextoModelo) => ({
  texto: 'Entrar no CrowdAcadêmico',
  url: `${contexto.urlPainel}/login`,
});

const MODELOS: Record<TipoNotificacao, Modelo> = {
  [TIPO_NOTIFICACAO.verificacaoEmail]: ({ dados, urlPainel, segredo }) =>
    segredo
      ? {
          assunto: 'Confirme o seu e-mail no CrowdAcadêmico',
          saudacao: saudacao(dados),
          paragrafos: [
            'Falta só um passo para a sua conta ficar completa: confirmar que este e-mail é seu.',
            'Se não foi você quem criou a conta, ignore este e-mail.',
          ],
          botao: {
            texto: 'Confirmar meu e-mail',
            url: `${urlPainel}/verificar-email?token=${encodeURIComponent(segredo)}`,
          },
        }
      : null,

  [TIPO_NOTIFICACAO.recuperacaoSenha]: ({ dados, urlPainel, segredo }) =>
    segredo
      ? {
          assunto: 'Crie uma nova senha no CrowdAcadêmico',
          saudacao: saudacao(dados),
          paragrafos: [
            'Recebemos um pedido para criar uma nova senha para a sua conta.',
            `O link vale por ${Number(dados.minutos) || 30} minutos e só pode ser usado uma vez.`,
            'Se não foi você, ignore este e-mail: a sua senha continua a mesma.',
          ],
          botao: {
            texto: 'Criar nova senha',
            url: `${urlPainel}/redefinir-senha?token=${encodeURIComponent(segredo)}`,
          },
        }
      : null,

  [TIPO_NOTIFICACAO.campanhaAprovada]: (contexto) => ({
    assunto: 'Sua campanha foi aprovada',
    saudacao: saudacao(contexto.dados),
    paragrafos: [
      `Boa notícia: ${campanha(contexto.dados)} foi aprovada e já está visível na plataforma.`,
      'A partir da data de início, ela passa a receber contribuições.',
    ],
    botao: entrar(contexto),
  }),

  [TIPO_NOTIFICACAO.campanhaRejeitada]: (contexto) => {
    const { dados } = contexto;
    const justificativa = texto(dados.justificativa);
    const restantes = Number(dados.reenvios_restantes);
    const prazo = data(dados.prazo_reenvio_ate);
    const paragrafos = [`${campanha(dados)} não foi aprovada desta vez.`];
    if (justificativa) paragrafos.push(`Motivo: ${justificativa}`);
    if (Number.isFinite(restantes) && restantes > 0) {
      paragrafos.push(
        `Você pode corrigir e enviar de novo. Reenvios restantes: ${restantes}` +
          (prazo ? `, até ${prazo}.` : '.'),
      );
    } else {
      paragrafos.push(
        'Os reenvios desta campanha acabaram, e ela ficou só para consulta.',
      );
    }
    return {
      assunto: 'Sua campanha não foi aprovada',
      saudacao: saudacao(dados),
      paragrafos,
      botao: entrar(contexto),
    };
  },

  [TIPO_NOTIFICACAO.novaCampanhaPesquisador]: (contexto) => ({
    assunto: 'Nova campanha de um pesquisador que você segue',
    saudacao: saudacao(contexto.dados),
    paragrafos: [
      `${texto(contexto.dados.nome_pesquisador) ?? 'Um pesquisador que você segue'} publicou uma campanha nova: ${campanha(contexto.dados)}.`,
    ],
    botao: entrar(contexto),
  }),

  [TIPO_NOTIFICACAO.novaAtualizacao]: (contexto) => {
    const titulo = texto(contexto.dados.titulo_atualizacao);
    return {
      assunto: 'Nova atualização numa campanha que você acompanha',
      saudacao: saudacao(contexto.dados),
      paragrafos: [
        `${campanha(contexto.dados)} publicou uma atualização` +
          (titulo ? `: "${titulo}".` : '.'),
      ],
      botao: entrar(contexto),
    };
  },

  [TIPO_NOTIFICACAO.campanhaSucesso]: (contexto) => ({
    assunto: 'A campanha que você apoiou bateu a meta',
    saudacao: saudacao(contexto.dados),
    paragrafos: [
      `${campanha(contexto.dados)} terminou e bateu a meta. Obrigado por apoiar a pesquisa!`,
      'O valor arrecadado vai para o pesquisador depois do prazo de segurança da plataforma.',
    ],
  }),

  [TIPO_NOTIFICACAO.campanhaNaoAtingida]: (contexto) => ({
    assunto: 'A campanha que você apoiou não bateu a meta',
    saudacao: saudacao(contexto.dados),
    paragrafos: [
      `${campanha(contexto.dados)} terminou sem bater a meta. Como ela é do modelo tudo ou nada, a sua contribuição vai ser devolvida.`,
      'A devolução já começou. Você recebe outro e-mail quando ela for concluída.',
    ],
  }),

  [TIPO_NOTIFICACAO.campanhaEncerradaModeracao]: (contexto) => ({
    assunto: 'A campanha que você apoiou foi encerrada',
    saudacao: saudacao(contexto.dados),
    paragrafos: [
      `${campanha(contexto.dados)} foi encerrada pela moderação da plataforma.`,
      'A sua contribuição vai ser devolvida. Você recebe outro e-mail quando a devolução for concluída.',
    ],
  }),

  [TIPO_NOTIFICACAO.devolucaoConcluida]: (contexto) => {
    const valor = moeda(contexto.dados.valor);
    return {
      assunto: 'Sua contribuição foi devolvida',
      saudacao: saudacao(contexto.dados),
      paragrafos: [
        `A devolução da sua contribuição para ${campanha(contexto.dados)} foi concluída` +
          (valor ? `: ${valor}.` : '.'),
        'O prazo para o dinheiro aparecer na sua conta depende do seu banco.',
      ],
    };
  },

  [TIPO_NOTIFICACAO.repassePrevisto]: (contexto) => {
    const valor = moeda(contexto.dados.valor);
    const quando = data(contexto.dados.data_prevista);
    const paragrafos = [
      `O repasse de ${campanha(contexto.dados)} foi programado` +
        (valor ? `: ${valor}` : '') +
        (quando ? `, com data prevista para ${quando}.` : '.'),
      'O dinheiro vai para a chave Pix cadastrada na sua conta. Confira se ela está certa: a correção da chave é sua responsabilidade.',
    ];
    if (contexto.dados.tem_chave_verificada !== true) {
      paragrafos.push(
        'Você ainda não tem chave Pix verificada. Cadastre a chave em Minha Conta; sem ela, o repasse fica esperando.',
      );
    }
    return {
      assunto: 'Seu repasse foi programado',
      saudacao: saudacao(contexto.dados),
      paragrafos,
      botao: entrar(contexto),
    };
  },

  [TIPO_NOTIFICACAO.encerramentoAprovado]: (contexto) => ({
    assunto: 'Seu pedido de encerramento foi aprovado',
    saudacao: saudacao(contexto.dados),
    paragrafos: [
      `O pedido para encerrar ${campanha(contexto.dados)} antes do prazo foi aprovado, e o encerramento já começou.`,
    ],
    botao: entrar(contexto),
  }),

  [TIPO_NOTIFICACAO.encerramentoRejeitado]: (contexto) => {
    const justificativa = texto(contexto.dados.justificativa);
    return {
      assunto: 'Seu pedido de encerramento não foi aprovado',
      saudacao: saudacao(contexto.dados),
      paragrafos: [
        `O pedido para encerrar ${campanha(contexto.dados)} antes do prazo não foi aprovado, e ela continua ativa.`,
        ...(justificativa ? [`Motivo: ${justificativa}`] : []),
      ],
      botao: entrar(contexto),
    };
  },

  [TIPO_NOTIFICACAO.pesquisadorSuspenso]: (contexto) => {
    const motivo = texto(contexto.dados.motivo);
    const ate = data(contexto.dados.suspenso_ate);
    return {
      assunto: 'Seu perfil de pesquisador foi suspenso',
      saudacao: saudacao(contexto.dados),
      paragrafos: [
        'O seu perfil de pesquisador foi suspenso pela moderação' +
          (ate ? ` até ${ate}.` : '.'),
        ...(motivo ? [`Motivo: ${motivo}`] : []),
        'Enquanto durar a suspensão, você não envia campanhas nem publica atualizações.',
      ],
    };
  },

  [TIPO_NOTIFICACAO.pesquisadorReativado]: (contexto) => ({
    assunto: 'Seu perfil de pesquisador foi reativado',
    saudacao: saudacao(contexto.dados),
    paragrafos: [
      'O seu perfil de pesquisador está ativo de novo, com todas as permissões.',
    ],
    botao: entrar(contexto),
  }),

  [TIPO_NOTIFICACAO.contestacaoAceita]: (contexto) => {
    const justificativa = texto(contexto.dados.justificativa);
    return {
      assunto: 'Sua contestação foi aceita',
      saudacao: saudacao(contexto.dados),
      paragrafos: [
        'A sua contestação foi aceita, e a denúncia deixou de contar na sua pontuação.',
        ...(justificativa ? [`Justificativa: ${justificativa}`] : []),
      ],
    };
  },

  [TIPO_NOTIFICACAO.contestacaoRecusada]: (contexto) => {
    const justificativa = texto(contexto.dados.justificativa);
    return {
      assunto: 'Sua contestação não foi aceita',
      saudacao: saudacao(contexto.dados),
      paragrafos: [
        'A sua contestação foi analisada e não foi aceita.',
        ...(justificativa ? [`Justificativa: ${justificativa}`] : []),
      ],
    };
  },
};

// null = tipo sem modelo (ou sem o link que ele exige): o worker marca o e-mail como falha não recuperável.
export function montarConteudo(
  tipo: string,
  contexto: ContextoModelo,
): ConteudoEmail | null {
  const modelo = (MODELOS as Record<string, Modelo | undefined>)[tipo];
  return modelo ? modelo(contexto) : null;
}
