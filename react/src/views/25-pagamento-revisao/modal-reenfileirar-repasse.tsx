import { useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { BadgeStatusRepasse } from '../../components/crud/badge-status-repasse';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Tooltip } from '../../components/layout/tooltip';
import { pagamentoRevisaoApi } from '../../services/25-pagamento-revisao/api/pagamento-revisao.api';
import { fraseDoEventoFinanceiro } from '../../services/25-pagamento-revisao/util/evento-financeiro.util';
import { erroObservacaoRevisao } from '../../services/25-pagamento-revisao/util/observacao-revisao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { CampoObservacaoRevisao } from './campo-observacao-revisao';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { RepasseAtencaoResponse } from '../../services/25-pagamento-revisao/type/pagamento-revisao.type';

interface ModalReenfileirarRepasseProps {
  authFetch: AuthFetch;
  repasse: RepasseAtencaoResponse;
  aoFechar: () => void;
  aoReenfileirado: () => void;
  // Consultar (olho): só para ler, mesmo com o repasse em erro.
  somenteLeitura?: boolean;
}

// Repasse em erro, duas saídas, as duas auditadas com a observação e quem fez:
//  - Reenfileirar: a causa (chave Pix errada, saldo na conta do provedor, etc.) foi corrigida FORA do sistema e o repasse
//    volta para a fila (erro -> pendente, tentativas zeradas) para o sistema tentar a transferência de novo;
//  - Marcar como pago: o provedor concluiu a transferência depois de o sistema marcar erro (o aviso chegou atrasado).
//    erro -> concluido, sem nova transferência; reenfileirar aqui pagaria duas vezes. O Nest consulta o provedor na
//    hora e recusa se ele não confirmar: não existe pagamento por fora do processador.
// Repasse que só espera a chave Pix do pesquisador não tem ação (sai da lista sozinho quando a chave for verificada).
type AcaoRepasse = 'reenfileirar' | 'marcarPago';

const CONFIRMACAO: Record<AcaoRepasse, { titulo: string; rotulo: string }> = {
  reenfileirar: { titulo: 'Reenfileirar este repasse?', rotulo: 'Reenfileirar' },
  marcarPago: { titulo: 'Marcar este repasse como pago?', rotulo: 'Marcar como pago' },
};

export function ModalReenfileirarRepasse({ authFetch, repasse, aoFechar, aoReenfileirado, somenteLeitura = false }: ModalReenfileirarRepasseProps) {
  const [observacao, setObservacao] = useState('');
  const [confirmando, setConfirmando] = useState<AcaoRepasse | null>(null);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const emErro = repasse.status === 'erro';
  const podeReenfileirar = emErro && !somenteLeitura;

  const erros = useErrosFormulario(() => ({ observacao: erroObservacaoRevisao(observacao) }));

  const pedirConfirmacao = (acao: AcaoRepasse) => {
    if (erros.tentarEnviar()) {
      setConfirmando(acao);
    }
  };

  const aplicar = async (acao: AcaoRepasse) => {
    await executar(async () => {
      if (acao === 'reenfileirar') {
        await pagamentoRevisaoApi.reenfileirarRepasse(authFetch, repasse.idRepasse, observacao.trim());
        mostrar('Repasse reenfileirado.', `Repasse #${repasse.idRepasse}: o sistema vai tentar a transferência de novo.`);
      } else {
        await pagamentoRevisaoApi.marcarRepassePago(authFetch, repasse.idRepasse, observacao.trim());
        mostrar('Repasse marcado como pago.', `Repasse #${repasse.idRepasse}: concluído, sem nova transferência.`);
      }
      aoReenfileirado();
      aoFechar();
    });
    setConfirmando(null);
  };

  return (
    <>
      <ModalFicha
        titulo={`Repasse #${repasse.idRepasse}`}
        subtitulo={repasse.titulo}
        badges={[<BadgeStatusRepasse key="status" status={repasse.status} aguardandoConta={repasse.aguardandoConta} />]}
        aoFechar={aoFechar}
        erro={erro}
        rodape={
          <RodapeAcoes
            aoCancelar={aoFechar}
            rotuloCancelar={podeReenfileirar ? 'Cancelar' : 'Fechar'}
            largura={podeReenfileirar ? 'xl' : undefined}
            acao={
              podeReenfileirar
                ? [
                    { rotulo: 'Marcar como pago', ocupado, aoClicar: () => pedirConfirmacao('marcarPago') },
                    { rotulo: 'Reenfileirar', ocupado, aoClicar: () => pedirConfirmacao('reenfileirar') },
                  ]
                : undefined
            }
          />
        }
      >
        <div className="space-y-6">
          <SecaoFicha titulo="O repasse">
            <CampoFicha rotulo="Campanha" valor={`${repasse.titulo} (#${repasse.idCampanha})`} largura="cheia" />
            <CampoFicha rotulo="Valor líquido" valor={formatarMoeda(repasse.valorLiquido)} />
            <CampoFicha rotulo="Tentativas de transferência" valor={repasse.tentativas} />
            <CampoFicha
              rotulo="Pesquisador tem chave Pix verificada"
              valor={<BadgeBooleano valor={!repasse.aguardandoConta} />}
            />
            <CampoFicha rotulo="Transferência no provedor" valor={repasse.idTransferenciaApi} />
            <CampoFicha rotulo="Último motivo" valor={fraseDoEventoFinanceiro(repasse.ultimoMotivo)} largura="cheia" />
          </SecaoFicha>

          {podeReenfileirar && (
            <SecaoFicha titulo="Resolver o erro" colunas={1}>
              <CaixaAviso
                titulo={
                  <>
                    Confira no painel do provedor antes de escolher{' '}
                    <Tooltip texto="Reenfileirar: a causa foi corrigida e o sistema tenta a transferência de novo; se der certo, o dinheiro sai de verdade para o pesquisador. Marcar como pago: o provedor concluiu a transferência depois de o sistema marcar erro (o aviso chegou atrasado); o sistema confere com o provedor na hora e só aceita se ele confirmar." />
                  </>
                }
                icone="fa-triangle-exclamation"
                tom="erro"
              >
                Se o provedor já concluiu a transferência, marque como pago e nunca reenfileire: o pesquisador receberia duas vezes.
              </CaixaAviso>
              {repasse.aguardandoConta && (
                <CaixaAviso titulo="O pesquisador ainda não tem chave Pix verificada" icone="fa-circle-info" tom="aviso">
                  Reenfileirar agora só deixaria o repasse esperando. Peça para ele cadastrar a chave Pix primeiro.
                </CaixaAviso>
              )}
              <CampoObservacaoRevisao
                rotulo="O que foi feito"
                dica="Fica na auditoria financeira, com o seu nome. Ex.: chave Pix do pesquisador corrigida; ou aviso de transferência concluída que chegou atrasado."
                valor={observacao}
                aoMudar={setObservacao}
                erro={erros.erroDe('observacao')}
              />
            </SecaoFicha>
          )}

          {!emErro && (
            <CaixaAviso titulo="Nada a fazer aqui" icone="fa-circle-info">
              Este repasse espera o pesquisador cadastrar e verificar a chave Pix onde vai receber. Quando isso acontecer, ele sai desta lista e entra
              na fila de transferência sozinho.
            </CaixaAviso>
          )}
        </div>
      </ModalFicha>

      {confirmando && (
        <ModalConfirmacao
          titulo={CONFIRMACAO[confirmando].titulo}
          rotuloConfirmar={CONFIRMACAO[confirmando].rotulo}
          rotuloOcupado="Salvando..."
          ocupado={ocupado}
          perigo
          exigirCiencia
          aoConfirmar={() => void aplicar(confirmando)}
          aoCancelar={() => setConfirmando(null)}
        >
          {confirmando === 'reenfileirar' ? (
            <>
              <p>
                O repasse #{repasse.idRepasse} ({formatarMoeda(repasse.valorLiquido)}) volta para a fila e o sistema tenta transferir de novo. Se der
                certo, o dinheiro sai para o pesquisador.
              </p>
              <p>Confirme só se a causa do erro foi corrigida.</p>
            </>
          ) : (
            <>
              <p>
                O repasse #{repasse.idRepasse} ({formatarMoeda(repasse.valorLiquido)}) fica concluído, sem nova transferência, e as contribuições dele
                passam para repassadas. Isso não dá para desfazer.
              </p>
              <p>O sistema confere com o provedor antes de concluir: se ele não confirmar a transferência, nada muda.</p>
            </>
          )}
        </ModalConfirmacao>
      )}
    </>
  );
}
