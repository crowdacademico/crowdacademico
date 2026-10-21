import { useState } from 'react';
import { BadgeSituacaoRevisao } from '../../components/crud/badge-situacao-revisao';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { pagamentoRevisaoApi } from '../../services/25-pagamento-revisao/api/pagamento-revisao.api';
import { SITUACOES_PENDENTES } from '../../services/25-pagamento-revisao/constants/pagamento-revisao.constants';
import { erroObservacaoRevisao } from '../../services/25-pagamento-revisao/util/observacao-revisao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import { CampoObservacaoRevisao } from './campo-observacao-revisao';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { RevisaoPagamentoResponse } from '../../services/25-pagamento-revisao/type/pagamento-revisao.type';

interface ModalResolverRevisaoProps {
  authFetch: AuthFetch;
  revisao: RevisaoPagamentoResponse;
  aoFechar: () => void;
  aoResolvido: () => void;
  // Consultar (olho): só para ler, mesmo com o evento em revisão manual.
  somenteLeitura?: boolean;
}

// Dar baixa num evento de pagamento ainda não processado. Em revisão manual, o provedor diz que o dinheiro se moveu e o
// sistema não aplicou de propósito; em "tentar de novo", a pessoa conferiu no provedor e não quer esperar o prazo da
// revisão automática. Ela decide e age FORA do sistema (ex.: devolve o pagamento no painel do provedor) e só então
// registra aqui o que fez. Dar baixa NÃO muda a contribuição nem o repasse e não move dinheiro:
// marca o evento como tratado e grava, na auditoria financeira, a observação e quem a escreveu.
export function ModalResolverRevisao({ authFetch, revisao, aoFechar, aoResolvido, somenteLeitura = false }: ModalResolverRevisaoProps) {
  const [observacao, setObservacao] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const tentarDeNovo = revisao.situacao === 'vale_tentar_de_novo';
  const podeResolver = SITUACOES_PENDENTES.includes(revisao.situacao) && !somenteLeitura;

  const erros = useErrosFormulario(() => ({ observacao: erroObservacaoRevisao(observacao) }));

  const pedirConfirmacao = () => {
    if (erros.tentarEnviar()) {
      setConfirmando(true);
    }
  };

  const resolver = async () => {
    await executar(async () => {
      await pagamentoRevisaoApi.resolverRevisao(authFetch, revisao.idEvento, observacao.trim());
      mostrar('Revisão resolvida.', `Evento #${revisao.idEvento} marcado como tratado.`);
      aoResolvido();
      aoFechar();
    });
    // Falhou: fecha só a janelinha, para o erro aparecer no modal (quem deu certo já fechou tudo).
    setConfirmando(false);
  };

  return (
    <>
      <ModalFicha
        titulo={`Evento de pagamento #${revisao.idEvento}`}
        subtitulo={revisao.tipoEvento}
        badges={[<BadgeSituacaoRevisao key="situacao" situacao={revisao.situacao} />]}
        aoFechar={aoFechar}
        erro={erro}
        rodape={
          <RodapeAcoes
            aoCancelar={aoFechar}
            rotuloCancelar={podeResolver ? 'Cancelar' : 'Fechar'}
            acao={podeResolver ? { rotulo: 'Dar baixa', ocupado, aoClicar: pedirConfirmacao } : undefined}
          />
        }
      >
        <div className="space-y-6">
          <SecaoFicha titulo="O evento">
            <CampoFicha rotulo="Evento do provedor" valor={revisao.tipoEvento} />
            <CampoFicha rotulo="Provedor" valor={revisao.provedor} />
            <CampoFicha rotulo="Recebido em" valor={formatarDataHora(revisao.recebidoEm)} />
            {revisao.revisaoManualEm !== null && <CampoFicha rotulo="Em revisão manual desde" valor={formatarDataHora(revisao.revisaoManualEm)} />}
            <CampoFicha rotulo="Contribuição" valor={revisao.idContribuicao === null ? null : `#${revisao.idContribuicao}`} />
            <CampoFicha rotulo="Repasse" valor={revisao.idRepasse === null ? null : `#${revisao.idRepasse}`} />
            <CampoFicha rotulo="Erro de processamento" valor={revisao.motivo} largura="cheia" />
          </SecaoFicha>

          {podeResolver && (
            <SecaoFicha titulo="Dar baixa" colunas={1}>
              <CaixaAviso titulo="Antes de dar baixa, resolva por fora" icone="fa-triangle-exclamation" espacado>
                <p>
                  Dar baixa não devolve dinheiro, não muda a contribuição nem o repasse. Só marca o evento como tratado, depois de você ter agido (por
                  exemplo, devolvido o pagamento no painel do provedor).
                </p>
              </CaixaAviso>
              <CampoObservacaoRevisao
                rotulo="O que foi feito"
                dica="Fica na auditoria financeira, com o seu nome. Ex.: pagamento devolvido no painel do provedor em 12/10, comprovante no chamado 123."
                valor={observacao}
                aoMudar={setObservacao}
                erro={erros.erroDe('observacao')}
              />
            </SecaoFicha>
          )}

          {tentarDeNovo && (
            <CaixaAviso titulo="O sistema ainda tenta sozinho" icone="fa-circle-info">
              Este evento falhou por um motivo passageiro e o sistema tenta de novo a cada conferência. Se continuar sem dono, vai sozinho para revisão
              manual. Só dê baixa antes disso se já conferiu no painel do provedor que não há nada a aplicar.
            </CaixaAviso>
          )}
        </div>
      </ModalFicha>

      {confirmando && (
        <ModalConfirmacao
          titulo="Dar baixa neste evento?"
          rotuloConfirmar="Dar baixa"
          rotuloOcupado="Salvando..."
          ocupado={ocupado}
          aoConfirmar={() => void resolver()}
          aoCancelar={() => setConfirmando(false)}
        >
          <p>O evento #{revisao.idEvento} sai da fila de revisão e fica registrado como tratado, com o seu nome e a sua observação.</p>
          <p>Nada é devolvido nem alterado na contribuição ou no repasse.</p>
        </ModalConfirmacao>
      )}
    </>
  );
}
