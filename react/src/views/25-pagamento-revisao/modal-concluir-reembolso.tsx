import { useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Tooltip } from '../../components/layout/tooltip';
import { ROTULO_MEIO_PAGAMENTO } from '../../services/22-contribuicao/constants/contribuicao.constants';
import { pagamentoRevisaoApi } from '../../services/25-pagamento-revisao/api/pagamento-revisao.api';
import { fraseDoEventoFinanceiro } from '../../services/25-pagamento-revisao/util/evento-financeiro.util';
import { erroObservacaoRevisao } from '../../services/25-pagamento-revisao/util/observacao-revisao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { CampoObservacaoRevisao } from './campo-observacao-revisao';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { ReembolsoManualResponse } from '../../services/25-pagamento-revisao/type/pagamento-revisao.type';

interface ModalConcluirReembolsoProps {
  authFetch: AuthFetch;
  reembolso: ReembolsoManualResponse;
  tituloCampanha: string;
  aoFechar: () => void;
  aoConcluido: () => void;
  // Consultar (olho): só para ler, sem registrar a devolução.
  somenteLeitura?: boolean;
}

// Registrar que uma contribuição em reembolso manual foi devolvida. O estorno automático desistiu, então uma pessoa
// devolve o dinheiro pelo painel do provedor e só depois registra aqui como fez; o Nest confere com o provedor e
// recusa se ele não mostrar a devolução (não existe devolução por fora do processador). O valor é sempre
// o inteiro da contribuição (só leitura, o banco recusa outro). A contribuição passa para "devolvida" e a ação fica na
// auditoria financeira, com quem registrou. Este registro NÃO move dinheiro.
export function ModalConcluirReembolso({ authFetch, reembolso, tituloCampanha, aoFechar, aoConcluido, somenteLeitura = false }: ModalConcluirReembolsoProps) {
  const valor = reembolso.valorADevolver;
  const [observacao, setObservacao] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);

  const erros = useErrosFormulario(() => ({
    observacao: erroObservacaoRevisao(observacao),
  }));

  const pedirConfirmacao = () => {
    if (erros.tentarEnviar()) {
      setConfirmando(true);
    }
  };

  const concluir = async () => {
    await executar(async () => {
      await pagamentoRevisaoApi.concluirReembolsoManual(authFetch, reembolso.idContribuicao, valor, observacao.trim());
      mostrar('Devolução registrada.', `Contribuição #${reembolso.idContribuicao}: ${formatarMoeda(valor)} devolvidos.`);
      aoConcluido();
      aoFechar();
    });
    setConfirmando(false);
  };

  return (
    <>
      <ModalFicha
        titulo={`Reembolso manual: contribuição #${reembolso.idContribuicao}`}
        subtitulo={tituloCampanha}
        aoFechar={aoFechar}
        erro={erro}
        rodape={
          <RodapeAcoes
            aoCancelar={aoFechar}
            rotuloCancelar={somenteLeitura ? 'Fechar' : 'Cancelar'}
            largura={somenteLeitura ? undefined : 'md'}
            acao={somenteLeitura ? undefined : { rotulo: 'Registrar devolução', ocupado, aoClicar: pedirConfirmacao }}
          />
        }
      >
        <div className="space-y-6">
          <SecaoFicha titulo="A contribuição">
            <CampoFicha rotulo="Campanha" valor={`${tituloCampanha} (#${reembolso.idCampanha})`} largura="cheia" />
            <CampoFicha rotulo="Quem contribuiu" valor={reembolso.idUsuario === null ? 'Sem conta (contribuição sem login)' : `Usuário #${reembolso.idUsuario}`} />
            <CampoFicha rotulo="Meio de pagamento" valor={ROTULO_MEIO_PAGAMENTO[reembolso.meioPagamento]} />
            <CampoFicha rotulo="Valor pago (com a tarifa)" valor={formatarMoeda(reembolso.valorBruto)} />
            <CampoFicha rotulo="Valor a devolver" valor={formatarMoeda(reembolso.valorADevolver)} />
            <CampoFicha rotulo="Tentativas de estorno automático" valor={reembolso.tentativas} />
            <CampoFicha rotulo="Tem chave Pix verificada" valor={<BadgeBooleano valor={reembolso.contribuinteTemContaVerificada} />} />
            <CampoFicha rotulo="Último motivo" valor={fraseDoEventoFinanceiro(reembolso.ultimoMotivo)} largura="cheia" />
          </SecaoFicha>

          {!somenteLeitura && (
            <SecaoFicha titulo="Registrar a devolução" colunas={1}>
              <CaixaAviso
                titulo={
                  <>
                    O sistema não devolve o dinheiro{' '}
                    <Tooltip texto="O sistema confere com o provedor e só aceita se ele mostrar a devolução. O valor a devolver é o valor inteiro da contribuição; a tarifa de pagamento não volta." />
                  </>
                }
                icone="fa-triangle-exclamation"
                tom="aviso"
              >
                Devolva pelo painel do provedor de pagamento e só então registre aqui.
              </CaixaAviso>
              <CampoObservacaoRevisao
                rotulo="Como a devolução foi feita"
                dica="Quando e como foi feita no painel do provedor. Fica na auditoria financeira, com o seu nome."
                valor={observacao}
                aoMudar={setObservacao}
                erro={erros.erroDe('observacao')}
              />
            </SecaoFicha>
          )}
        </div>
      </ModalFicha>

      {confirmando && (
        <ModalConfirmacao
          titulo="Registrar esta devolução?"
          rotuloConfirmar="Registrar devolução"
          rotuloOcupado="Salvando..."
          ocupado={ocupado}
          exigirCiencia
          aoConfirmar={() => void concluir()}
          aoCancelar={() => setConfirmando(false)}
        >
          <p>
            A contribuição #{reembolso.idContribuicao} passa para &quot;devolvida&quot;, com {formatarMoeda(valor)} registrados como devolvidos. Isso não
            dá para desfazer.
          </p>
          <p>Este registro não devolve dinheiro. O sistema confere com o provedor antes: se ele não mostrar a devolução, nada muda.</p>
        </ModalConfirmacao>
      )}
    </>
  );
}
