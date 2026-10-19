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
import { pagamentoRevisaoApi } from '../../services/25-pagamento-revisao/api/pagamento-revisao.api';
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

// Reenfileirar um repasse em erro. A causa (chave Pix errada, saldo na conta do provedor, etc.) é corrigida FORA do
// sistema; aqui a pessoa diz o que corrigiu e o repasse volta para a fila (erro -> pendente, tentativas zeradas) para o
// sistema tentar a transferência de novo. A ação é auditada com a observação e quem a fez. Se a transferência já foi
// feita por fora, NÃO reenfileirar: o pesquisador receberia em duplicidade. Repasse que só espera a chave Pix do
// pesquisador não tem o que reenfileirar (ele sai da lista sozinho quando a chave for verificada).
export function ModalReenfileirarRepasse({ authFetch, repasse, aoFechar, aoReenfileirado, somenteLeitura = false }: ModalReenfileirarRepasseProps) {
  const [observacao, setObservacao] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const emErro = repasse.status === 'erro';
  const podeReenfileirar = emErro && !somenteLeitura;

  const erros = useErrosFormulario(() => ({ observacao: erroObservacaoRevisao(observacao) }));

  const pedirConfirmacao = () => {
    if (erros.tentarEnviar()) {
      setConfirmando(true);
    }
  };

  const reenfileirar = async () => {
    await executar(async () => {
      await pagamentoRevisaoApi.reenfileirarRepasse(authFetch, repasse.idRepasse, observacao.trim());
      mostrar('Repasse reenfileirado.', `Repasse #${repasse.idRepasse}: o sistema vai tentar a transferência de novo.`);
      aoReenfileirado();
      aoFechar();
    });
    setConfirmando(false);
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
            largura={podeReenfileirar ? 'md' : undefined}
            acao={podeReenfileirar ? { rotulo: 'Reenfileirar repasse', ocupado, aoClicar: pedirConfirmacao } : undefined}
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
            <CampoFicha rotulo="Último motivo" valor={repasse.ultimoMotivo} largura="cheia" />
          </SecaoFicha>

          {podeReenfileirar && (
            <SecaoFicha titulo="Reenfileirar" colunas={1}>
              <CaixaAviso titulo="Corrija a causa antes de reenfileirar" icone="fa-triangle-exclamation" tom="erro" espacado>
                <p>
                  Reenfileirar zera as tentativas e devolve o repasse para a fila: o sistema tenta a transferência de novo, e se ela der certo o dinheiro
                  sai de verdade para o pesquisador.
                </p>
                <p>Se a transferência já foi feita por fora do sistema, não reenfileire: o pesquisador receberia duas vezes.</p>
              </CaixaAviso>
              {repasse.aguardandoConta && (
                <CaixaAviso titulo="O pesquisador ainda não tem chave Pix verificada" icone="fa-circle-info" tom="aviso">
                  Reenfileirar agora só deixaria o repasse esperando. Peça para ele cadastrar a chave Pix primeiro.
                </CaixaAviso>
              )}
              <CampoObservacaoRevisao
                rotulo="O que foi corrigido"
                dica="Fica na auditoria financeira, com o seu nome. Ex.: chave Pix do pesquisador corrigida, saldo da conta do provedor reposto."
                valor={observacao}
                aoMudar={setObservacao}
                erro={erros.erroDe('observacao')}
              />
            </SecaoFicha>
          )}

          {!emErro && (
            <CaixaAviso titulo="Nada a reenfileirar aqui" icone="fa-circle-info">
              Este repasse espera o pesquisador cadastrar e verificar a chave Pix onde vai receber. Quando isso acontecer, ele sai desta lista e entra
              na fila de transferência sozinho.
            </CaixaAviso>
          )}
        </div>
      </ModalFicha>

      {confirmando && (
        <ModalConfirmacao
          titulo="Reenfileirar este repasse?"
          rotuloConfirmar="Reenfileirar"
          rotuloOcupado="Salvando..."
          ocupado={ocupado}
          perigo
          exigirCiencia
          aoConfirmar={() => void reenfileirar()}
          aoCancelar={() => setConfirmando(false)}
        >
          <p>
            O repasse #{repasse.idRepasse} ({formatarMoeda(repasse.valorLiquido)}) volta para a fila e o sistema tenta transferir de novo. Se der certo, o
            dinheiro sai para o pesquisador.
          </p>
          <p>Confirme só se a causa do erro foi corrigida e a transferência não foi feita por fora.</p>
        </ModalConfirmacao>
      )}
    </>
  );
}
