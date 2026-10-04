import { useState } from 'react';
import { useToast } from '../../../components/layout/toast/use-toast';
import { campanhaApi } from '../api/campanha.api';
import { useEnvio } from '../../constant/hook/use-envio';
import { useErrosFormulario } from '../../constant/hook/use-erros-formulario';
import { useRegrasCampanha } from './use-regras-campanha';
import { avaliarCriteriosEnvio } from '../util/criterios-envio.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { OrcamentoCampanhaResponse } from '../../13-orcamento-campanha/type/orcamento-campanha.type';
import type { MarcoCronogramaResponse } from '../../14-marco-cronograma/type/marco-cronograma.type';
import type { AcaoRodape } from '../../../components/crud/rodape-acoes';

interface OpcoesDecisao {
  authFetch: AuthFetch;
  idCampanha: number;
  reportarErro: (erro: unknown) => unknown;
  limparErro?: () => void;
  // Depois de aprovar ou rejeitar com sucesso (recarregar a lista, fechar o modal).
  aoConcluido: () => void;
}

// Aprovar ou rejeitar uma campanha da fila: a MESMA regra na fila real (Aprovar Campanhas) e na Bancada
// da Campanha. Rejeitar fica sempre clicável: sem motivo, o erro aparece embaixo do campo e nada vai ao servidor.
export function useDecisaoAprovacao({ authFetch, idCampanha, reportarErro, limparErro, aoConcluido }: OpcoesDecisao) {
  const { mostrar } = useToast();
  const [justificativa, setJustificativa] = useState('');
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const rejeicao = useErrosFormulario(() => ({
    justificativa: justificativa.trim() === '' && 'Escreva o motivo da rejeição: o pesquisador lê este texto para corrigir.',
  }));

  const decidir = async (acao: 'aprovar' | 'rejeitar') => {
    if (acao === 'rejeitar' && !rejeicao.tentarEnviar()) return;
    await executar(async () => {
      if (acao === 'aprovar') {
        await campanhaApi.aprovar(authFetch, idCampanha);
        mostrar('Campanha aprovada com sucesso.', `ID: ${idCampanha} foi aprovada`);
      } else {
        await campanhaApi.rejeitar(authFetch, idCampanha, justificativa.trim());
        mostrar('Campanha rejeitada com sucesso.', `ID: ${idCampanha} foi rejeitada`);
      }
      aoConcluido();
    });
  };

  return { justificativa, setJustificativa, erroMotivo: rejeicao.erroDe('justificativa'), ocupado, decidir };
}

export type DecisaoAprovacao = ReturnType<typeof useDecisaoAprovacao>;

// Pronta para aprovar: os mínimos de Parâmetros e a soma do orçamento igual à meta (o banco confere o mesmo).
export function usePronta(dados: { orcamento: OrcamentoCampanhaResponse[]; cronograma: MarcoCronogramaResponse[]; metaFinanceira: number }) {
  const { minimoItensOrcamento, minimoMarcosCronograma } = useRegrasCampanha();
  return avaliarCriteriosEnvio({ ...dados, minimoItensOrcamento, minimoMarcosCronograma });
}

// Rejeitar e Aprovar como ações do RodapeAcoes (o rodapé do modal de revisão, depois do Fechar).
export function acoesDecisao(decisao: DecisaoAprovacao, pronta: boolean): AcaoRodape[] {
  return [
    { rotulo: 'Rejeitar', perigo: true, desabilitado: decisao.ocupado, aoClicar: () => void decisao.decidir('rejeitar') },
    { rotulo: 'Aprovar', rotuloOcupado: 'Enviando...', ocupado: decisao.ocupado, desabilitado: !pronta, aoClicar: () => void decisao.decidir('aprovar') },
  ];
}
