import { useState } from 'react';
import { BadgeStatusDenuncia } from '../../components/crud/badge-status-denuncia';
import { BadgeStatusCampanha } from '../../components/crud/badge-status-campanha';
import { CaixaAviso } from '../../components/crud/caixa-aviso';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { denunciaApi } from '../../services/19-denuncia/api/denuncia.api';
import {
  ORDEM_STATUS_DENUNCIA,
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
}

// Julgar uma denúncia (RF-111): ler o que foi denunciado e decidir. Pendente e em análise só mudam a situação;
// resolvida (procedente) e improcedente pedem o porquê. Numa denúncia procedente contra campanha ativa, a moderação
// pode encerrar a campanha na mesma ação (RF-114): a campanha sai da página pública. Quem denunciou não julga a
// própria denúncia; o banco recusa e a mensagem aparece aqui.
export function ModalJulgarDenuncia({ authFetch, denuncia, aoFechar, aoJulgada }: ModalJulgarDenunciaProps) {
  const [status, setStatus] = useState<StatusDenuncia>(denuncia.status);
  const [justificativa, setJustificativa] = useState(denuncia.justificativaModeracao ?? '');
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false);
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const limite = useConfiguracoes().obterNumero('limite_caracteres_justificativa_denuncia', 1000);
  const podeEncerrarCampanha = denuncia.idCampanhaAlvo !== null && denuncia.statusCampanha === 'ativo';
  const pedeJustificativa = STATUS_DENUNCIA_DECIDIDA.has(status) || confirmandoEncerrar;

  const erros = useErrosFormulario(() => ({
    justificativa:
      pedeJustificativa && justificativa.trim() === ''
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
    <ModalFicha
      titulo={`Denúncia #${denuncia.idDenuncia}`}
      subtitulo={`${ROTULO_TIPO_DENUNCIA[denuncia.tipoMotivo]}: ${denuncia.tituloCampanha ?? denuncia.nomePesquisadorAlvo ?? '-'}`}
      badges={[<BadgeStatusDenuncia key="status" status={denuncia.status} />]}
      aoFechar={aoFechar}
      erro={erro}
      rodape={
        <RodapeAcoes
          aoCancelar={aoFechar}
          acao={
            confirmandoEncerrar
              ? { rotulo: 'Confirmar encerramento', rotuloOcupado: 'Encerrando...', ocupado, perigo: true, aoClicar: () => void encerrarCampanha() }
              : { rotulo: 'Salvar decisão', rotuloOcupado: 'Salvando...', ocupado, aoClicar: () => void salvar() }
          }
        />
      }
    >
      <div className="space-y-6">
        <SecaoFicha titulo="O que foi denunciado">
          <CampoFicha rotulo="Denunciante" valor={denuncia.nomeDenunciante ?? `#${denuncia.idUsuario}`} />
          <CampoFicha rotulo="E-mail" valor={denuncia.emailDenunciante} />
          <CampoFicha rotulo="Data" valor={formatarDataHora(denuncia.criadoEm)} />
          <CampoFicha rotulo="Motivo" valor={denuncia.motivo} />
          {denuncia.idCampanhaAlvo !== null && (
            <CampoFicha
              rotulo="Campanha"
              valor={
                <span className="inline-flex flex-wrap items-center gap-2">
                  #{denuncia.idCampanhaAlvo} {denuncia.tituloCampanha}
                  {denuncia.statusCampanha && <BadgeStatusCampanha campanha={{ status: denuncia.statusCampanha, dataInicio: null }} />}
                </span>
              }
              largura="cheia"
            />
          )}
          {denuncia.idPesquisadorAlvo !== null && (
            <CampoFicha rotulo="Pesquisador" valor={`#${denuncia.idPesquisadorAlvo} ${denuncia.nomePesquisadorAlvo ?? ''}`} largura="cheia" />
          )}
          <CampoFicha rotulo="Relato" valor={denuncia.relato} largura="cheia" />
        </SecaoFicha>

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
      </div>
    </ModalFicha>
  );
}
