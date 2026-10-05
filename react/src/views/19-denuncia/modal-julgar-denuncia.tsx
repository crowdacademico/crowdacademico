import { useState } from 'react';
import { BadgeStatusDenuncia } from '../../components/crud/badge-status-denuncia';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalConfirmacao } from '../../components/crud/modal-confirmacao';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { denunciaApi } from '../../services/19-denuncia/api/denuncia.api';
import {
  CLASSE_BADGE_STATUS_CONTESTACAO,
  ORDEM_STATUS_DENUNCIA,
  ROTULO_STATUS_CONTESTACAO,
  ROTULO_STATUS_DENUNCIA,
  ROTULO_TIPO_DENUNCIA,
  STATUS_DENUNCIA_DECIDIDA,
} from '../../services/19-denuncia/constants/status-denuncia.constants';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import { contarCaracteres } from '../../services/constant/util/validacao.util';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import type { DenunciaResponse, StatusDenuncia } from '../../services/19-denuncia/type/denuncia.type';

interface ModalJulgarDenunciaProps {
  authFetch: AuthFetch;
  denuncia: DenunciaResponse;
  aoFechar: () => void;
  aoJulgada: () => void;
  // Consultar (olho): a mesma ficha, só para ler, sem decidir.
  somenteLeitura?: boolean;
}

// Julgar uma denúncia (RF-111): ler o que foi denunciado e decidir. Pendente e em análise só mudam a situação;
// resolvida (procedente) e improcedente pedem o porquê. Numa denúncia procedente contra campanha ativa, a moderação
// pode encerrar a campanha na mesma ação (RF-114): a campanha sai da página pública. Quem denunciou não julga a
// própria denúncia; o banco recusa e a mensagem aparece aqui. Com uma contestação do pesquisador esperando análise
// (RF-033), a decisão é sobre ela: aceitar torna a denúncia improcedente (a nota se recalcula) e recusar a mantém,
// sempre com justificativa.
export function ModalJulgarDenuncia({ authFetch, denuncia, aoFechar, aoJulgada, somenteLeitura = false }: ModalJulgarDenunciaProps) {
  const [status, setStatus] = useState<StatusDenuncia>(denuncia.status);
  const [justificativa, setJustificativa] = useState(denuncia.justificativaModeracao ?? '');
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);
  const [justificativaContestacao, setJustificativaContestacao] = useState('');
  // Decisão da contestação esperando o OK na janelinha de confirmação: true = aceitar, false = recusar.
  const [confirmandoContestacao, setConfirmandoContestacao] = useState<boolean | null>(null);
  const contestacaoPendente = denuncia.contestacaoStatus === 'pendente';
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const limite = useConfiguracoes().obterNumero('limite_caracteres_justificativa_denuncia', 1000);
  const podeEncerrarCampanha = denuncia.idCampanhaAlvo !== null && denuncia.statusCampanha === 'ativo';
  const pedeJustificativa = STATUS_DENUNCIA_DECIDIDA.has(status) || confirmandoEncerrar;

  const erros = useErrosFormulario(() => ({
    justificativaContestacao:
      contestacaoPendente &&
      (justificativaContestacao.trim() === ''
        ? 'Escreva a justificativa da decisão.'
        : contarCaracteres(justificativaContestacao) > limite &&
          `A justificativa passou do limite de ${limite.toLocaleString('pt-BR')} caracteres.`),
    justificativa:
      !contestacaoPendente && pedeJustificativa && justificativa.trim() === ''
        ? 'Escreva por que a denúncia foi decidida assim.'
        : contarCaracteres(justificativa) > limite && `A justificativa passou do limite de ${limite.toLocaleString('pt-BR')} caracteres.`,
  }));

  const salvar = async () => {
    if (!erros.tentarEnviar()) return;
    await executar(async () => {
      await denunciaApi.julgar(authFetch, denuncia.idDenuncia, status, STATUS_DENUNCIA_DECIDIDA.has(status) ? justificativa.trim() : undefined);
      mostrar('Denúncia atualizada.', ROTULO_STATUS_DENUNCIA[status]);
      aoJulgada();
      aoFechar();
    });
  };

  const decidirContestacao = async (aceitar: boolean) => {
    if (!erros.tentarEnviar()) return;
    await executar(async () => {
      await denunciaApi.decidirContestacao(authFetch, denuncia.idDenuncia, aceitar, justificativaContestacao.trim());
      mostrar(
        aceitar ? 'Contestação aceita.' : 'Contestação recusada.',
        aceitar ? 'A denúncia ficou improcedente e a pontuação do pesquisador foi recalculada.' : 'A denúncia continua procedente.',
      );
      aoJulgada();
      aoFechar();
    });
    setConfirmandoContestacao(null);
  };

  // Confere a justificativa antes de abrir a confirmação: o erro aparece no campo, não na janelinha.
  const pedirConfirmacaoContestacao = (aceitar: boolean) => {
    if (erros.tentarEnviar()) setConfirmandoContestacao(aceitar);
  };

  const encerrarCampanha = async () => {
    if (!erros.tentarEnviar()) return;
    await executar(async () => {
      await denunciaApi.encerrarCampanha(authFetch, denuncia.idDenuncia, justificativa.trim());
      mostrar('Campanha encerrada por moderação.', 'A denúncia ficou resolvida e a campanha saiu da página pública.');
      aoJulgada();
      aoFechar();
    });
  };

  return (
    <>
      <ModalFicha
        titulo={`Denúncia #${denuncia.idDenuncia}`}
        subtitulo={`${ROTULO_TIPO_DENUNCIA[denuncia.tipoMotivo]}: ${denuncia.tituloCampanha ?? denuncia.nomePesquisadorAlvo ?? '-'}`}
        badges={[<BadgeStatusDenuncia key="status" status={denuncia.status} />]}
        aoFechar={aoFechar}
        erro={erro}
        rodape={
          somenteLeitura ? (
            <RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />
          ) : (
            <RodapeAcoes
              aoCancelar={aoFechar}
              acao={
                contestacaoPendente
                  ? [
                      { rotulo: 'Recusar contestação', perigo: true, aoClicar: () => pedirConfirmacaoContestacao(false) },
                      { rotulo: 'Aceitar contestação', aoClicar: () => pedirConfirmacaoContestacao(true) },
                    ]
                  : confirmandoEncerrar
                  ? { rotulo: 'Confirmar encerramento', rotuloOcupado: 'Encerrando...', ocupado, perigo: true, aoClicar: () => void encerrarCampanha() }
                  : { rotulo: 'Salvar decisão', rotuloOcupado: 'Salvando...', ocupado, aoClicar: () => void salvar() }
              }
            />
          )
        }
      >
        <div className="space-y-6">
          <SecaoFicha titulo="O que foi denunciado">
            <CampoFicha rotulo="ID do denunciante" valor={denuncia.idUsuario} />
            <CampoFicha rotulo="Denunciante" valor={denuncia.nomeDenunciante} />
            <CampoFicha rotulo="E-mail" valor={denuncia.emailDenunciante} />
            <CampoFicha rotulo="Data" valor={formatarDataHora(denuncia.criadoEm)} />
            <CampoFicha rotulo="Motivo" valor={denuncia.motivo} largura="cheia" />
            {denuncia.idCampanhaAlvo !== null && (
              <>
                <CampoFicha rotulo="ID da campanha" valor={denuncia.idCampanhaAlvo} />
                <CampoFicha rotulo="Campanha denunciada" valor={denuncia.tituloCampanha} />
              </>
            )}
            {denuncia.idPesquisadorAlvo !== null && (
              <>
                <CampoFicha rotulo="ID do pesquisador" valor={denuncia.idPesquisadorAlvo} />
                <CampoFicha rotulo="Pesquisador denunciado" valor={denuncia.nomePesquisadorAlvo} />
              </>
            )}
            <CampoFicha rotulo="Relato" valor={denuncia.relato} largura="cheia" />
          </SecaoFicha>

          {denuncia.contestacao !== null && denuncia.contestacaoStatus !== null && (
            <SecaoFicha titulo="Contestação do pesquisador">
              <CampoFicha rotulo="Data" valor={formatarDataHora(denuncia.contestadaEm)} />
              <CampoFicha
                rotulo="Situação"
                valor={
                  <span className={'badge ' + CLASSE_BADGE_STATUS_CONTESTACAO[denuncia.contestacaoStatus]}>
                    {ROTULO_STATUS_CONTESTACAO[denuncia.contestacaoStatus]}
                  </span>
                }
              />
              <CampoFicha rotulo="Por que é injusta" valor={denuncia.contestacao} largura="cheia" />
              {denuncia.justificativaContestacao && (
                <CampoFicha rotulo="Justificativa da decisão" valor={denuncia.justificativaContestacao} largura="cheia" />
              )}
            </SecaoFicha>
          )}

          {somenteLeitura ? (
            <SecaoFicha titulo="Decisão">
              <CampoFicha rotulo="Situação" valor={<BadgeStatusDenuncia status={denuncia.status} />} />
              {denuncia.justificativaModeracao && (
                <CampoFicha rotulo="Justificativa da moderação" valor={denuncia.justificativaModeracao} largura="cheia" />
              )}
            </SecaoFicha>
          ) : contestacaoPendente ? (
            <SecaoFicha titulo="Decidir a contestação" colunas={1}>
              <CaixaAviso titulo="O que cada decisão faz">
                Aceitar torna esta denúncia improcedente, e a pontuação do pesquisador se recalcula sozinha. Uma campanha
                encerrada por moderação continua encerrada. Recusar mantém a denúncia procedente.
              </CaixaAviso>
              <Campo rotulo="Justificativa da decisão" erro={erros.erroDe('justificativaContestacao')}>
                {({ atributos, classeErro }) => (
                  <>
                    <textarea
                      {...atributos}
                      rows={4}
                      value={justificativaContestacao}
                      onChange={(evento) => setJustificativaContestacao(evento.target.value)}
                      className={'input-padrao' + classeErro}
                    />
                    <ContadorCaracteres texto={justificativaContestacao} limite={limite} />
                  </>
                )}
              </Campo>
            </SecaoFicha>
          ) : (
            <SecaoFicha titulo="Decisão" colunas={1}>
              {!confirmandoEncerrar && (
                <Campo rotulo="Situação">
                  {({ atributos }) => (
                    <select
                      {...atributos}
                      value={status}
                      onChange={(evento) => setStatus(evento.target.value as StatusDenuncia)}
                      className="input-padrao"
                    >
                      {ORDEM_STATUS_DENUNCIA.map((opcao) => (
                        <option key={opcao} value={opcao}>
                          {opcao === 'resolvida' ? 'Resolvida (procedente)' : ROTULO_STATUS_DENUNCIA[opcao]}
                        </option>
                      ))}
                    </select>
                  )}
                </Campo>
              )}
              {pedeJustificativa && (
                <Campo rotulo={confirmandoEncerrar ? 'Por que a campanha está sendo encerrada' : 'Justificativa da decisão'} erro={erros.erroDe('justificativa')}>
                  {({ atributos, classeErro }) => (
                    <>
                      <textarea
                        {...atributos}
                        rows={4}
                        value={justificativa}
                        onChange={(evento) => setJustificativa(evento.target.value)}
                        className={'input-padrao' + classeErro}
                      />
                      <ContadorCaracteres texto={justificativa} limite={limite} />
                    </>
                  )}
                </Campo>
              )}
              {podeEncerrarCampanha &&
                (confirmandoEncerrar ? (
                  <CaixaAviso tom="erro" icone="fa-triangle-exclamation" titulo="Encerrar a campanha por moderação">
                    A denúncia fica resolvida e a campanha sai da página pública na hora: não recebe mais apoio, e os
                    comentários e endossos deixam de aparecer. Não dá para desfazer pela tela.{' '}
                    <button type="button" className="link-texto" onClick={() => setConfirmandoEncerrar(false)}>
                      Voltar
                    </button>
                  </CaixaAviso>
                ) : (
                  <div>
                    <button type="button" className="btn btn-pequeno btn-secondary" onClick={() => setConfirmandoEncerrar(true)}>
                      Procedente: encerrar a campanha
                    </button>
                  </div>
                ))}
            </SecaoFicha>
          )}
        </div>
      </ModalFicha>
      {confirmandoContestacao !== null && (
        <ModalConfirmacao
          titulo={confirmandoContestacao ? 'Aceitar a contestação?' : 'Recusar a contestação?'}
          rotuloConfirmar={confirmandoContestacao ? 'Aceitar contestação' : 'Recusar contestação'}
          rotuloOcupado="Enviando..."
          perigo={!confirmandoContestacao}
          exigirCiencia
          ocupado={ocupado}
          aoConfirmar={() => void decidirContestacao(confirmandoContestacao)}
          aoCancelar={() => setConfirmandoContestacao(null)}
        >
          {confirmandoContestacao ? (
            <p>A denúncia passa a improcedente e a pontuação do pesquisador é recalculada na hora. Uma campanha encerrada por moderação continua encerrada.</p>
          ) : (
            <p>A denúncia continua procedente e segue pesando na pontuação do pesquisador. Esta denúncia não pode ser contestada de novo.</p>
          )}
          <p>O pesquisador vê o resultado, com a sua justificativa, na Minha Conta.</p>
        </ModalConfirmacao>
      )}
    </>
  );
}
