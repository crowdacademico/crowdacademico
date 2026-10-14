import { useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { Campo } from '../../components/input/campo';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { ROTULO_MEIO_PAGAMENTO } from '../../services/22-contribuicao/constants/contribuicao.constants';
import { pagamentoRevisaoApi } from '../../services/32-pagamento-revisao/api/pagamento-revisao.api';
import { erroObservacaoRevisao, erroValorDevolvido } from '../../services/32-pagamento-revisao/util/observacao-revisao.util';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { CampoObservacaoRevisao } from './campo-observacao-revisao';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { ReembolsoManualResponse } from '../../services/32-pagamento-revisao/type/pagamento-revisao.type';

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
// devolve o dinheiro FORA do sistema (painel do provedor ou Pix) e só depois registra aqui: o valor que de fato foi
// devolvido (de R$ 0,01 até o valor pago) e como foi feito. A contribuição passa para "devolvida" e a ação fica na
// auditoria financeira, com quem registrou. Este registro NÃO move dinheiro.
export function ModalConcluirReembolso({ authFetch, reembolso, tituloCampanha, aoFechar, aoConcluido, somenteLeitura = false }: ModalConcluirReembolsoProps) {
  const [valor, setValor] = useState(String(reembolso.valorADevolver));
  const [observacao, setObservacao] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);

  const erros = useErrosFormulario(() => ({
    valor: erroValorDevolvido(valor, reembolso.valorBruto),
    observacao: erroObservacaoRevisao(observacao),
  }));

  // Acima do líquido, mas ainda dentro do que o banco aceita (o valor pago): deixa passar, com um aviso.
  const acimaDoLiquido = !erroValorDevolvido(valor, reembolso.valorBruto) && Number(valor) > reembolso.valorADevolver;

  const pedirConfirmacao = () => {
    if (erros.tentarEnviar()) {
      setConfirmando(true);
    }
  };

  const concluir = async () => {
    await executar(async () => {
      await pagamentoRevisaoApi.concluirReembolsoManual(authFetch, reembolso.idContribuicao, Number(valor), observacao.trim());
      mostrar('Devolução registrada.', `Contribuição #${reembolso.idContribuicao}: ${formatarMoeda(Number(valor))} devolvidos.`);
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
            <CampoFicha rotulo="Valor pago" valor={formatarMoeda(reembolso.valorBruto)} />
            <CampoFicha rotulo="Valor a devolver (líquido)" valor={formatarMoeda(reembolso.valorADevolver)} />
            <CampoFicha rotulo="Tentativas de estorno automático" valor={reembolso.tentativas} />
            <CampoFicha rotulo="Tem chave Pix verificada" valor={<BadgeBooleano valor={reembolso.contribuinteTemContaVerificada} />} />
            <CampoFicha rotulo="Último motivo" valor={reembolso.ultimoMotivo} largura="cheia" />
          </SecaoFicha>

          {!somenteLeitura && (
            <SecaoFicha titulo="Registrar a devolução" colunas={1}>
              <CaixaAviso titulo="O sistema não devolve o dinheiro" icone="fa-triangle-exclamation" tom="aviso" espacado>
                <p>
                  Devolva por fora (painel do provedor ou Pix) e só então registre aqui. O valor a devolver já desconta a taxa da plataforma, que fica
                  retida. A chave Pix da pessoa não é mostrada neste painel.
                </p>
                <p>Ao registrar, a contribuição passa para &quot;devolvida&quot; e isso não dá para desfazer.</p>
              </CaixaAviso>
              <Campo
                rotulo="Valor devolvido (R$)"
                dica={
                  acimaDoLiquido
                    ? `Atenção: maior que o líquido a devolver (${formatarMoeda(reembolso.valorADevolver)}). Confira se a taxa da plataforma deveria ficar retida.`
                    : `De R$ 0,01 até ${formatarMoeda(reembolso.valorBruto)} (o valor pago). Sugerido: o líquido, ${formatarMoeda(reembolso.valorADevolver)}.`
                }
                erro={erros.erroDe('valor')}
              >
                {({ atributos, classeErro }) => (
                  <input
                    {...atributos}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    value={valor}
                    onChange={(evento) => setValor(evento.target.value)}
                    className={'input-padrao' + classeErro}
                  />
                )}
              </Campo>
              <CampoObservacaoRevisao
                rotulo="Como a devolução foi feita"
                dica="Data, meio e comprovante. Fica na auditoria financeira, com o seu nome."
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
            A contribuição #{reembolso.idContribuicao} passa para &quot;devolvida&quot;, com {formatarMoeda(Number(valor))} registrados como devolvidos. Isso não
            dá para desfazer.
          </p>
          <p>Este registro não devolve dinheiro: confirme só se a devolução já foi feita por fora.</p>
        </ModalConfirmacao>
      )}
    </>
  );
}
