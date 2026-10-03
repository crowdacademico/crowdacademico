import { useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { Carregando } from '../../components/layout/carregando';
import { Dica } from '../../components/layout/tooltip';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useDadosUsuario } from '../../services/1-usuario/hook/use-dados-usuario';
import {
  ROTULO_STATUS_PESQUISADOR,
  ROTULO_TIPO_VINCULO,
  ROTULO_TITULO_ACADEMICO,
  classeBadgeStatusPesquisador,
} from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { formatarCpfOuMotivoOculto, formatarData, formatarDataHora } from '../../services/constant/util/formatacao.util';
import { BotaoVerFotoPerfil } from './botao-ver-foto-perfil';
import { PainelScore } from './painel-score';
import { SecaoAceitesTermo } from './secao-aceites-termo';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioResponseLoginHistory } from '../../services/1-usuario/type/usuario.type';

interface ModalConsultarUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  aoFechar: () => void;
}

// Consultar: dados da conta, acesso (histórico de login), aceites do Termo de Uso, papéis e, de quem é pesquisador, o
// perfil e o score. Tudo buscado ao abrir; recebe só o `idUsuario`, então serve para qualquer lista (Usuários,
// Pesquisadores, Campo de Testes).
export function ModalConsultarUsuario({ auth, idUsuario, aoFechar }: ModalConsultarUsuarioProps) {
  const errosDaTela = useErroToast({ mostraTexto: true });
  const { erro } = errosDaTela;
  const { usuario, perfilPesquisador, avatarUrl, papeis } = useDadosUsuario(idUsuario, auth, errosDaTela);
  // Termo de Uso aceitos: vem sempre (informação de conformidade). Leitura auxiliar: falha aqui não trava o modal.
  const { dado: termosAceitos } = useBuscar(
    () => usuarioApi.listarTermosAceitos(auth.authFetch, idUsuario).catch(() => []),
    [idUsuario],
  );
  const [logins, setLogins] = useState<UsuarioResponseLoginHistory[] | null>(null);
  const [carregandoLogins, setCarregandoLogins] = useState(false);
  const [loginsAbertos, setLoginsAbertos] = useState(false);

  // Logins anteriores só ao abrir o histórico (detalhe raramente consultado).
  const aoAlternarLogins = async () => {
    if (loginsAbertos) {
      setLoginsAbertos(false);
      return;
    }
    setLoginsAbertos(true);
    if (logins !== null) return;
    setCarregandoLogins(true);
    try {
      setLogins(await usuarioApi.listarLogins(auth.authFetch, idUsuario));
    } catch {
      // Leitura auxiliar: falha aqui não trava o resto do modal.
    } finally {
      setCarregandoLogins(false);
    }
  };

  const loginsAnteriores = logins?.slice(1) ?? [];

  return (
    <ModalFicha
      // `carregando`: ModalFicha já esconde título/avatar sozinho enquanto `usuario` não chega, mostrando
      // "Carregando..." no lugar (ver comentário completo em modal-ficha.tsx).
      // Espera também os aceites do Termo, que vêm numa busca à parte: senão a janela crescia depois de aparecer.
      carregando={!usuario || termosAceitos === null}
      titulo={usuario?.nome ?? ''}
      subtitulo={usuario?.email}
      avatar={
        usuario && (
          <div className="relative shrink-0">
            <AvatarUsuario nome={usuario.nome} foto={avatarUrl} tamanho="lg" />
            {avatarUrl && (
              <div className="absolute bottom-0 right-0">
                <BotaoVerFotoPerfil url={avatarUrl} badge />
              </div>
            )}
          </div>
        )
      }
      aoFechar={aoFechar}
      rodape={<RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />}
    >
      {!usuario ? (
        erro ? (
          <MensagemErro texto={erro} className="paragrafo-destaque p-6 text-center texto-erro" />
        ) : (
          <p className="paragrafo p-6 text-center texto-fraco">Carregando...</p>
        )
      ) : (
        <>
          {/* Linhas alinhadas: "Dados da conta" ao lado de Papéis, "Acesso" ao lado dos Aceites do Termo; o Perfil de
              Pesquisador (quando houver) vem embaixo, na largura das duas primeiras colunas. */}
          <div className="grade-ficha gap-x-8 gap-y-10">
            <div className="lg:col-span-2">
              <SecaoFicha titulo="Dados da conta">
                <CampoFicha rotulo="id" valor={usuario.idUsuario} />
                <CampoFicha
                  rotulo="Foto de perfil"
                  valor={
                    avatarUrl ? (
                      <span className="inline-flex items-center gap-2">
                        <BotaoVerFotoPerfil url={avatarUrl} />
                        Foto cadastrada
                      </span>
                    ) : (
                      'Sem foto (usa iniciais)'
                    )
                  }
                />
                <CampoFicha rotulo="Criado em" valor={formatarData(usuario.criadoEm)} />
                <CampoFicha rotulo="E-mail verificado" valor={usuario.emailVerificado ? 'Sim' : 'Não'} />
              </SecaoFicha>
            </div>
            <SecaoFicha titulo="Papéis">
              <CampoFicha
                rotulo="Papéis atribuídos"
                largura="cheia"
                valor={
                  papeis === null
                    ? undefined
                    : papeis.length === 0
                      ? null
                      : papeis.map((papel) => papel.nomePapel).join(', ')
                }
              />
            </SecaoFicha>
            <div className="lg:col-span-2">
              <SecaoFicha titulo="Acesso">
                <CampoFicha
                  rotulo="Último login em"
                  largura="cheia"
                  valor={usuario.ultimoLoginEm ? formatarDataHora(usuario.ultimoLoginEm) : 'Nunca'}
                  acao={
                    usuario.ultimoLoginEm && (
                      <button
                        type="button"
                        onClick={() => void aoAlternarLogins()}
                        aria-label="Ver logins anteriores"
                        className="dica texto-fraco hover-texto-forte transition-colors shrink-0"
                      >
                        <i className={'fa-solid fa-chevron-down transition-transform' + (loginsAbertos ? ' rotate-180' : '')} aria-hidden="true"></i>
                        <Dica texto="Ver logins anteriores" curta />
                      </button>
                    )
                  }
                >
                  {loginsAbertos && (
                    <div className="paragrafo mt-2 rounded-lg border borda-padrao fundo-sutil p-3 max-h-64 overflow-y-auto texto-herdado">
                      {carregandoLogins ? (
                        <Carregando />
                      ) : loginsAnteriores.length === 0 ? (
                        <p className="texto-fraco">Nenhum login anterior registrado.</p>
                      ) : (
                        <ul className="space-y-1">
                          {loginsAnteriores.map((login, indice) => (
                            <li key={indice} className="texto-padrao">
                              {formatarDataHora(login.logadoEm)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </CampoFicha>
              </SecaoFicha>
            </div>
            <SecaoAceitesTermo auth={auth} termosAceitos={termosAceitos} aoErro={errosDaTela.reportarErro} />
            {perfilPesquisador && (
              <div className="lg:col-span-2">
                <SecaoFicha titulo="Perfil de Pesquisador">
                  <CampoFicha rotulo="CPF" valor={formatarCpfOuMotivoOculto(perfilPesquisador.cpf)} />
                  <CampoFicha
                    rotulo="Status"
                    valor={
                      <span className={'badge ' + classeBadgeStatusPesquisador(perfilPesquisador.statusPesquisador)}>
                        {ROTULO_STATUS_PESQUISADOR[perfilPesquisador.statusPesquisador]}
                      </span>
                    }
                  />
                  <CampoFicha rotulo="Título acadêmico" valor={ROTULO_TITULO_ACADEMICO[perfilPesquisador.tituloAcademico]} />
                  <CampoFicha rotulo="Tipo de vínculo" valor={ROTULO_TIPO_VINCULO[perfilPesquisador.tipoVinculo]} />
                  <CampoFicha rotulo="Vínculo institucional" valor={perfilPesquisador.vinculoInstitucional} />
                  <CampoFicha rotulo="Score atual" valor={perfilPesquisador.scoreAtual} />
                  <CampoFicha
                    rotulo="Ativado em"
                    valor={perfilPesquisador.ativadoEm ? formatarDataHora(perfilPesquisador.ativadoEm) : undefined}
                  />
                </SecaoFicha>
              </div>
            )}
          </div>

          {perfilPesquisador && (
            <>
              <div className="border-t borda-padrao"></div>
              <PainelScore auth={auth} idUsuario={idUsuario} />
            </>
          )}
        </>
      )}
    </ModalFicha>
  );
}
