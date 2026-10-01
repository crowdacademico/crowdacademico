import { useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { TabelaLinksAcademicos } from '../../components/crud/tabelas/1-tabela-links-academicos';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { Campo } from '../../components/input/campo';
import { MedidorSenha } from '../../components/input/medidor-senha';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { Carregando } from '../../components/layout/carregando';
import { Dica } from '../../components/layout/tooltip';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useDadosUsuario } from '../../services/1-usuario/hook/use-dados-usuario';
import { papelApi, usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { descricaoPapel } from '../../services/2-papel-permissao/constants/papel-descricoes.constants';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { ROTULO_STATUS_PESQUISADOR } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { linkAcademicoApi } from '../../services/7-link-academico/api/link-academico.api';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { SENHA_DEV } from '../../services/constant/constants/senha-dev.constants';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { useOpcoesDiasSuspensao } from '../../services/constant/hook/use-opcoes-dias-suspensao';
import { formatarCpf, formatarCpfOuMotivoOculto, formatarData } from '../../services/constant/util/formatacao.util';
import { CamposVinculoPerfil } from '../6-perfil-pesquisador/campos-vinculo-perfil';
import { SecaoModeracaoPesquisador } from '../6-perfil-pesquisador/secao-moderacao-pesquisador';
import { SecaoModeracao } from './secao-moderacao';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioPapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';
import type { TipoVinculo, TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import type { LinkAcademicoRequestCreate, LinkAcademicoResponse } from '../../services/7-link-academico/type/link-academico.type';

interface ModalAlterarUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

interface FormPerfil {
  tipoVinculo: TipoVinculo;
  vinculoInstitucional: string;
  tituloAcademico: TituloAcademico;
}

// Foto escolhida e ainda não salva: `undefined` = nenhuma escolha nova; `id: null` = "Remover foto".
type FotoNova = { id: number | null; url: string | null } | undefined;

// "Vale na hora": as ações destas partes gravam no clique, sem esperar o Salvar.
function AvisoValeNaHora() {
  return (
    <p className="text-xs texto-fraco flex items-center gap-2">
      <i className="fa-solid fa-bolt"></i>
      As ações abaixo valem na hora do clique, sem botão Salvar.
    </p>
  );
}

// Alterar Usuário: uma tela só, que rola. Em cima, o que espera o Salvar do rodapé (foto, nome, senha e, de quem é
// pesquisador, o perfil); embaixo, o que grava na hora do clique (papéis, moderação, CPF, links e suspensão do
// pesquisador), cada parte com o aviso "vale na hora". O Salvar grava a conta e o perfil juntos, só o que mudou, e
// não fecha o modal. Criar perfil para quem ainda não é pesquisador fica no upgrade (modal-upgrade-pesquisador.tsx),
// que passa pelo Termo de upgrade.
export function ModalAlterarUsuario({ auth, idUsuario, aoFechar, aoAtualizado }: ModalAlterarUsuarioProps) {
  const { mostrar } = useToast();
  const errosDaTela = useErroToast({ mostraTexto: true });
  const { erro, reportarErro, limparErro } = errosDaTela;
  const { ocupado: salvando, executar: executarSalvando } = useEnvio(reportarErro, limparErro);
  const { ocupado: desbloqueando, executar: executarDesbloqueando } = useEnvio(reportarErro, limparErro);
  const { ocupado: redefinindoSenhaDev, executar: executarRedefinindoSenhaDev } = useEnvio(reportarErro, limparErro);

  // Conta: o que está gravado (`base`) e o que está sendo editado.
  const [base, setBase] = useState({ nome: '', avatarUrl: null as string | null });
  const [nome, setNome] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [fotoNova, setFotoNova] = useState<FotoNova>(undefined);
  // Pesquisador: idem.
  const [basePerfil, setBasePerfil] = useState<FormPerfil | null>(null);
  const [formPerfil, setFormPerfil] = useState<FormPerfil | null>(null);
  const [cpfCorrecao, setCpfCorrecao] = useState('');

  const { usuario, perfilPesquisador, papeis, setPapeis, carregando } = useDadosUsuario(idUsuario, auth, errosDaTela, (dados) => {
    setBase({ nome: dados.usuario.nome, avatarUrl: dados.avatarUrl });
    setNome(dados.usuario.nome);
    setNovaSenha('');
    setFotoNova(undefined);
    const perfil = dados.perfilPesquisador
      ? {
          tipoVinculo: dados.perfilPesquisador.tipoVinculo,
          vinculoInstitucional: dados.perfilPesquisador.vinculoInstitucional ?? '',
          tituloAcademico: dados.perfilPesquisador.tituloAcademico,
        }
      : null;
    setBasePerfil(perfil);
    setFormPerfil(perfil);
    setCpfCorrecao('');
  });

  const sujoConta = nome !== base.nome || novaSenha !== '' || fotoNova !== undefined;
  const sujoPerfil =
    formPerfil !== null &&
    basePerfil !== null &&
    (formPerfil.tipoVinculo !== basePerfil.tipoVinculo ||
      formPerfil.vinculoInstitucional !== basePerfil.vinculoInstitucional ||
      formPerfil.tituloAcademico !== basePerfil.tituloAcademico);
  useAvisoAlteracaoNaoSalva(sujoConta || sujoPerfil);

  const fechar = () => {
    if (!confirmarSaida(sujoConta || sujoPerfil)) {
      return;
    }
    aoAtualizado();
    aoFechar();
  };

  // Salvar e as ações ficam sempre clicáveis: faltando algo, o erro aparece embaixo do campo.
  const conta = useErrosFormulario(() => ({
    nome: nome.trim().length < 2 && 'Nome precisa ter pelo menos 2 caracteres.',
    senha: novaSenha !== '' && novaSenha.length < 8 && 'A nova senha precisa ter pelo menos 8 caracteres.',
  }));
  const perfil = useErrosFormulario(() => ({
    vinculoInstitucional:
      formPerfil?.tipoVinculo === 'institucional' && formPerfil.vinculoInstitucional.trim() === '' && 'Informe a instituição.',
  }));
  const cpf = useErrosFormulario(() => ({ cpf: cpfCorrecao.length !== 11 && 'Digite os 11 números do CPF.' }));

  // Um Salvar para a conta e o perfil: confere os dois antes de gravar qualquer um, e grava só o que mudou.
  const salvar = async () => {
    const contaOk = !sujoConta || conta.tentarEnviar();
    const perfilOk = !sujoPerfil || perfil.tentarEnviar();
    if (!contaOk || !perfilOk) return;
    await executarSalvando(async () => {
      if (sujoConta) {
        await usuarioApi.atualizar(auth.authFetch, idUsuario, {
          nome,
          ...(novaSenha ? { novaSenha } : {}),
          ...(fotoNova !== undefined ? { idImagemPerfil: fotoNova.id } : {}),
        });
        setBase({ nome, avatarUrl: fotoNova !== undefined ? fotoNova.url : base.avatarUrl });
        setNovaSenha('');
        setFotoNova(undefined);
        conta.limpar();
      }
      if (sujoPerfil) {
        await perfilPesquisadorApi.atualizar(auth.authFetch, idUsuario, {
          tipoVinculo: formPerfil.tipoVinculo,
          ...(formPerfil.tipoVinculo === 'institucional' ? { vinculoInstitucional: formPerfil.vinculoInstitucional } : {}),
          tituloAcademico: formPerfil.tituloAcademico,
        });
        setBasePerfil(formPerfil);
        perfil.limpar();
      }
      mostrar('Usuário alterado com sucesso.', `ID: ${idUsuario} foi alterado`);
      aoAtualizado();
    });
  };

  const salvarCorrecaoCpf = async () => {
    if (!cpf.tentarEnviar()) return;
    await executarSalvando(async () => {
      await perfilPesquisadorApi.corrigirCpf(auth.authFetch, idUsuario, { cpf: cpfCorrecao });
      setCpfCorrecao('');
      cpf.limpar();
      mostrar('CPF corrigido com sucesso.');
      aoAtualizado();
    });
  };

  const aoDesbloquear = () =>
    void executarDesbloqueando(async () => {
      await usuarioApi.desbloquear(auth.authFetch, idUsuario);
      mostrar('Login desbloqueado com sucesso.', `ID: ${idUsuario} pode tentar logar novamente`);
    });

  const aoRedefinirSenhaDev = () =>
    void executarRedefinindoSenhaDev(async () => {
      await usuarioApi.atualizar(auth.authFetch, idUsuario, { novaSenha: SENHA_DEV });
      mostrar('Senha redefinida com sucesso.', `ID: ${idUsuario} teve a senha redefinida para "${SENHA_DEV}"`);
    });

  return (
    <ModalFicha
      // `carregando`: mesmo mecanismo de ModalConsultarUsuario.
      carregando={!usuario}
      titulo={base.nome}
      subtitulo={usuario?.email}
      avatar={usuario && <AvatarUsuario nome={base.nome} foto={fotoNova !== undefined ? fotoNova.url : base.avatarUrl} tamanho="lg" />}
      aoFechar={fechar}
      rodape={
        usuario && (
          <RodapeAcoes
            aoCancelar={fechar}
            rotuloCancelar="Fechar"
            acao={{
              rotulo: 'Salvar',
              rotuloOcupado: 'Salvando...',
              ocupado: salvando,
              desabilitado: !sujoConta && !sujoPerfil,
              aoClicar: () => void salvar(),
            }}
          />
        )
      }
    >
      {carregando ? (
        <Carregando className="p-6 text-center" />
      ) : !usuario ? (
        <MensagemErro texto={erro} className="p-6 text-center texto-erro text-sm font-bold" />
      ) : (
        <>
          <MensagemErro texto={erro} />

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              <SecaoFicha titulo="Dados da conta">
                <div className="sm:col-span-2 flex items-center gap-4">
                  <SeletorFotoPerfil
                    authFetch={auth.authFetch}
                    nome={nome || base.nome}
                    url={fotoNova !== undefined ? fotoNova.url : base.avatarUrl}
                    tamanho="lg"
                    aoAlterar={(id, url) => setFotoNova({ id, url })}
                  />
                  <p className="text-xs texto-fraco">A foto nova só vale depois de "Salvar".</p>
                </div>
                <Campo rotulo="Nome" erro={conta.erroDe('nome')} className="sm:col-span-2">
                  {({ atributos, classeErro }) => (
                    <input
                      {...atributos}
                      type="text"
                      value={nome}
                      onChange={(evento) => setNome(evento.target.value)}
                      className={'input-padrao' + classeErro}
                    />
                  )}
                </Campo>
              </SecaoFicha>

              <SecaoFicha titulo="Senha">
                <Campo rotulo="Nova senha (opcional)" erro={conta.erroDe('senha')} className="sm:col-span-2">
                  {({ atributos, classeErro }) => (
                    <>
                      <input
                        {...atributos}
                        type="password"
                        value={novaSenha}
                        onChange={(evento) => setNovaSenha(evento.target.value)}
                        className={'input-padrao' + classeErro}
                        placeholder="Deixe em branco para não trocar"
                        autoComplete="new-password"
                      />
                      <MedidorSenha senha={novaSenha} />
                    </>
                  )}
                </Campo>
              </SecaoFicha>

              {formPerfil && perfilPesquisador && (
                <SecaoFicha titulo="Perfil de Pesquisador">
                  <CamposVinculoPerfil
                    tipoVinculo={formPerfil.tipoVinculo}
                    vinculoInstitucional={formPerfil.vinculoInstitucional}
                    tituloAcademico={formPerfil.tituloAcademico}
                    rotuloVinculoInstitucional="Vínculo institucional"
                    aoAlterarTipoVinculo={(tipo) => setFormPerfil({ ...formPerfil, tipoVinculo: tipo })}
                    aoAlterarVinculoInstitucional={(valor) => setFormPerfil({ ...formPerfil, vinculoInstitucional: valor })}
                    aoAlterarTituloAcademico={(titulo) => setFormPerfil({ ...formPerfil, tituloAcademico: titulo })}
                    erroVinculoInstitucional={perfil.erroDe('vinculoInstitucional')}
                  />
                  <CampoFicha rotulo="Score atual" valor={perfilPesquisador.scoreAtual} />
                </SecaoFicha>
              )}
            </div>

            <div className="space-y-6">
              <SecaoFicha titulo="Metadados" colunas={1}>
                <CampoSomenteLeitura rotulo="id" valor={idUsuario} />
                <CampoSomenteLeitura rotulo="E-mail" valor={usuario.email} />
                <CampoSomenteLeitura rotulo="E-mail verificado" valor={usuario.emailVerificado ? 'Sim' : 'Não'} />
                <CampoSomenteLeitura rotulo="Criado em" valor={usuario.criadoEm && formatarData(usuario.criadoEm)} />
                {perfilPesquisador && (
                  <CampoSomenteLeitura
                    rotulo="Status (pesquisador)"
                    valor={ROTULO_STATUS_PESQUISADOR[perfilPesquisador.statusPesquisador]}
                  />
                )}
              </SecaoFicha>

              {import.meta.env.DEV && (
                <div className="fundo-cartao border border-dashed borda-dev fundo-dev-sutil rounded-xl p-4">
                  <span className="badge badge-dev">&lt;dev&gt;</span>
                  <p className="text-xs texto-fraco mt-2 mb-3">
                    Redefine a senha direto pra "{SENHA_DEV}", na hora, sem digitar nada. Só pra testar login.
                  </p>
                  <button type="button" onClick={aoRedefinirSenhaDev} disabled={redefinindoSenhaDev} className="btn btn-secondary w-full">
                    {redefinindoSenhaDev ? 'Redefinindo...' : 'Redefinir senha dev'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="border-t borda-padrao"></div>
          <AvisoValeNaHora />

          <SecaoFicha titulo="Papéis" colunas={1}>
            <PapeisDoUsuario
              auth={auth}
              idUsuario={idUsuario}
              papeis={papeis ?? []}
              aoMudarPapeis={setPapeis}
              aoAtualizado={aoAtualizado}
            />
          </SecaoFicha>

          <SecaoFicha titulo="Moderação" colunas={1}>
            <div className="flex items-center justify-between gap-3 rounded-lg border borda-forte p-3">
              <p className="text-xs texto-fraco">
                Zera o contador de tentativas de login falhas e libera a conta, caso esteja bloqueada temporariamente.
              </p>
              <button type="button" onClick={aoDesbloquear} disabled={desbloqueando} className="btn btn-secondary shrink-0">
                {desbloqueando ? 'Desbloqueando...' : 'Desbloquear login'}
              </button>
            </div>
            <SecaoModeracao auth={auth} idUsuario={idUsuario} />
          </SecaoFicha>

          {perfilPesquisador && (
            <>
              <SecaoFicha titulo="CPF">
                <CampoFicha rotulo="CPF atual" valor={formatarCpfOuMotivoOculto(perfilPesquisador.cpf)} largura="cheia" />
                <div className="sm:col-span-2 flex items-end gap-2 rounded-lg border borda-forte p-3">
                  <label className="text-xs flex-1 flex flex-col gap-1">
                    Corrigir CPF (suporte/admin)
                    <input
                      type="text"
                      value={formatarCpf(cpfCorrecao)}
                      onChange={(evento) => setCpfCorrecao(evento.target.value.replace(/\D/g, '').slice(0, 11))}
                      aria-invalid={Boolean(cpf.erroDe('cpf'))}
                      className={'input-padrao' + (cpf.erroDe('cpf') ? ' borda-erro' : '')}
                    />
                    {cpf.erroDe('cpf') && <span className="texto-erro font-semibold">{cpf.erroDe('cpf')}</span>}
                  </label>
                  <button type="button" className="btn btn-secondary shrink-0" onClick={() => void salvarCorrecaoCpf()}>
                    Salvar CPF
                  </button>
                </div>
              </SecaoFicha>

              <LinksAcademicosDoUsuario auth={auth} idUsuario={idUsuario} />

              <SecaoModeracaoPesquisador auth={auth} idUsuario={idUsuario} />
            </>
          )}
        </>
      )}
    </ModalFicha>
  );
}

// Fora do componente: é chamado só no clique, nunca durante o desenho da tela.
function daquiADias(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
}

interface PapeisDoUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  papeis: UsuarioPapelResponse[];
  aoMudarPapeis: (papeis: UsuarioPapelResponse[]) => void;
  aoAtualizado: () => void;
}

// Papéis da conta: atribuir, suspender por um prazo com motivo, reativar e revogar. Tudo grava na hora. Uma ação por
// vez (`ocupado` guarda qual), e depois de cada uma a lista é buscada de novo.
function PapeisDoUsuario({ auth, idUsuario, papeis, aoMudarPapeis, aoAtualizado }: PapeisDoUsuarioProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const opcoesDiasSuspensao = useOpcoesDiasSuspensao();
  const { dado: catalogo } = useBuscar(() => papelApi.listar(auth.authFetch), []);
  const [ocupado, setOcupado] = useState<number | 'atribuir' | null>(null);
  const [idPapelParaAtribuir, setIdPapelParaAtribuir] = useState('');
  const [papelSuspendendoId, setPapelSuspendendoId] = useState<number | null>(null);
  const [motivoSuspensao, setMotivoSuspensao] = useState('');

  const papeisDisponiveis = (catalogo ?? []).filter((papel) => !papeis.some((atual) => atual.idPapel === papel.idPapel));
  const papelEscolhido = (catalogo ?? []).find((papel) => papel.idPapel === Number(idPapelParaAtribuir));
  const descricaoEscolhido = papelEscolhido ? descricaoPapel(papelEscolhido.codigo) : undefined;

  // "Atribuir" fica sempre clicável: sem papel escolhido, o erro aparece embaixo do campo. O motivo da suspensão
  // idem (pelo menos 3 caracteres).
  const atribuicao = useErrosFormulario(() => ({
    papel: idPapelParaAtribuir === '' && 'Escolha um papel para atribuir.',
  }));
  const suspensao = useErrosFormulario(() => ({
    motivo: motivoSuspensao.trim().length < 3 && 'Informe o motivo (pelo menos 3 caracteres).',
  }));

  // Executa a ação, busca a lista nova de papéis e mostra o aviso de sucesso.
  const executar = async (qual: number | 'atribuir', acao: () => Promise<unknown>, titulo: string, descricao: string) => {
    limparErro();
    setOcupado(qual);
    try {
      await acao();
      aoMudarPapeis(await usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario));
      mostrar(titulo, descricao);
      aoAtualizado();
      return true;
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const aoAtribuir = async () => {
    if (!atribuicao.tentarEnviar() || !papelEscolhido) return;
    const ok = await executar(
      'atribuir',
      () => usuarioPapelApi.atribuir(auth.authFetch, idUsuario, papelEscolhido.idPapel),
      'Papel atribuído com sucesso.',
      `ID: ${idUsuario} agora tem o papel "${papelEscolhido.nome}"`,
    );
    if (ok) {
      setIdPapelParaAtribuir('');
      atribuicao.limpar();
    }
  };

  const aoSuspender = async (papel: UsuarioPapelResponse, dias: number) => {
    if (!suspensao.tentarEnviar()) return;
    const motivo = motivoSuspensao.trim();
    const ate = daquiADias(dias);
    const ok = await executar(
      papel.idPapel,
      () => usuarioPapelApi.suspender(auth.authFetch, idUsuario, papel.idPapel, ate, motivo),
      'Papel suspenso com sucesso.',
      `"${papel.nomePapel}" suspenso até ${formatarData(ate)}`,
    );
    if (ok) {
      setPapelSuspendendoId(null);
      setMotivoSuspensao('');
      suspensao.limpar();
    }
  };

  const aoReativar = (papel: UsuarioPapelResponse) =>
    void executar(
      papel.idPapel,
      () => usuarioPapelApi.revogarSuspensao(auth.authFetch, idUsuario, papel.idPapel),
      'Papel reativado com sucesso.',
      `"${papel.nomePapel}" voltou a valer normalmente`,
    );

  const aoRevogar = (papel: UsuarioPapelResponse) => {
    // O "×" é pequeno e fica colado no nome do papel: um clique sem querer tirava o papel na hora.
    if (!window.confirm(`Revogar o papel "${papel.nomePapel}"? A conta perde na hora o que este papel permite.`)) {
      return;
    }
    void executar(
      papel.idPapel,
      () => usuarioPapelApi.remover(auth.authFetch, idUsuario, papel.idPapel),
      'Papel revogado com sucesso.',
      `ID: ${idUsuario} perdeu o papel "${papel.nomePapel}"`,
    );
  };

  return (
    <div className="space-y-4">
      <MensagemErro texto={erro} />

      <div className="flex flex-wrap gap-2">
        {papeis.length === 0 && <p className="text-xs texto-fraco">Nenhum papel atribuído ainda.</p>}
        {papeis.map((papel) => {
          const suspenso = papel.suspensoAte && new Date(papel.suspensoAte) > new Date();
          return (
            <span key={papel.idPapel} className="inline-flex flex-col items-start gap-1">
              <span className={'badge flex items-center gap-2 ' + (suspenso ? 'fundo-aviso texto-aviso' : 'badge-neutro')}>
                {papel.nomePapel}
                {suspenso && <i className="fa-solid fa-clock text-[10px]"></i>}
                {suspenso ? (
                  <button
                    type="button"
                    onClick={() => aoReativar(papel)}
                    disabled={ocupado === papel.idPapel}
                    className="dica font-bold hover:underline disabled:opacity-50"
                  >
                    {ocupado === papel.idPapel ? '…' : 'reativar'}
                    <Dica texto="Reativar agora" curta />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPapelSuspendendoId((atual) => (atual === papel.idPapel ? null : papel.idPapel))}
                      className="dica texto-fraco hover-texto-forte"
                      aria-label={`Suspender "${papel.nomePapel}" por um tempo`}
                    >
                      <i className="fa-solid fa-clock text-[10px]"></i>
                      <Dica texto={`Suspender "${papel.nomePapel}" por um tempo`} curta />
                    </button>
                    <button
                      type="button"
                      onClick={() => aoRevogar(papel)}
                      disabled={ocupado === papel.idPapel}
                      className="dica texto-erro font-bold hover-texto-erro disabled:opacity-50"
                      aria-label={`Revogar "${papel.nomePapel}"`}
                    >
                      ×
                      <Dica texto={`Revogar "${papel.nomePapel}"`} curta />
                    </button>
                  </>
                )}
              </span>
              {papelSuspendendoId === papel.idPapel && (
                <span className="flex flex-col gap-1 fundo-cartao border borda-forte rounded-lg p-1.5">
                  <input
                    value={motivoSuspensao}
                    onChange={(evento) => setMotivoSuspensao(evento.target.value)}
                    placeholder="Motivo (obrigatório)"
                    aria-label={`Motivo da suspensão de "${papel.nomePapel}"`}
                    aria-invalid={Boolean(suspensao.erroDe('motivo'))}
                    className={'input-padrao text-xs py-1' + (suspensao.erroDe('motivo') ? ' borda-erro' : '')}
                  />
                  {suspensao.erroDe('motivo') && (
                    <span className="text-[10px] texto-erro font-semibold">{suspensao.erroDe('motivo')}</span>
                  )}
                  <span className="flex gap-1">
                    {opcoesDiasSuspensao.map((dias) => (
                      <button
                        key={dias}
                        type="button"
                        onClick={() => void aoSuspender(papel, dias)}
                        disabled={ocupado === papel.idPapel}
                        className="text-[10px] font-bold texto-padrao hover-fundo-sutil px-1.5 py-0.5 rounded"
                      >
                        {dias}d
                      </button>
                    ))}
                  </span>
                </span>
              )}
            </span>
          );
        })}
      </div>

      {catalogo !== null && papeisDisponiveis.length === 0 ? (
        <p className="text-xs texto-fraco">Esta conta já tem todos os papéis que existem.</p>
      ) : (
        <div className="flex flex-col gap-2 max-w-md">
          <select
            value={idPapelParaAtribuir}
            onChange={(evento) => setIdPapelParaAtribuir(evento.target.value)}
            aria-label="Papel para atribuir"
            aria-invalid={Boolean(atribuicao.erroDe('papel'))}
            className={'input-padrao' + (atribuicao.erroDe('papel') ? ' borda-erro' : '')}
          >
            <option value="">Selecione um papel...</option>
            {papeisDisponiveis.map((papel) => (
              <option key={papel.idPapel} value={papel.idPapel}>
                {papel.nome}
              </option>
            ))}
          </select>
          {atribuicao.erroDe('papel') && <p className="text-xs texto-erro font-semibold">{atribuicao.erroDe('papel')}</p>}
          {/* O que o papel escolhido libera, antes de atribuir. */}
          {descricaoEscolhido && <p className="text-xs texto-fraco">{descricaoEscolhido}</p>}
          <button type="button" onClick={() => void aoAtribuir()} disabled={ocupado === 'atribuir'} className="btn btn-primary">
            {ocupado === 'atribuir' ? 'Atribuindo...' : 'Atribuir'}
          </button>
        </div>
      )}
    </div>
  );
}

interface LinksAcademicosDoUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
}

// Links acadêmicos de outro pesquisador. Cada ação grava na hora; o erro vai no aviso flutuante (a tabela não tem
// texto de erro próprio).
function LinksAcademicosDoUsuario({ auth, idUsuario }: LinksAcademicosDoUsuarioProps) {
  const { mostrar } = useToast();
  const { reportarErro } = useErroToast();
  const { obterConfiguracao } = useConfiguracoes();
  const valorLimiteLinks = obterConfiguracao('limite_links_academicos_perfil', 5);
  const limiteLinks = typeof valorLimiteLinks === 'number' ? valorLimiteLinks : 5;
  const { dado, recarregar } = useBuscar(() => linkAcademicoApi.listarDoUsuario(auth.authFetch, idUsuario), [idUsuario]);
  const links = dado ?? [];
  // Só os tipos que podem ir no perfil do pesquisador.
  const { dado: tiposLink } = useBuscar(() => tipoLinkApi.listar(auth.authFetch, { escopo: 'perfil' }), []);

  // Chamadas da tabela (components/crud/tabelas/1-tabela-links-academicos.tsx): devolvem true quando deu certo.
  const executar = async (acao: () => Promise<unknown>, mensagem: string): Promise<boolean> => {
    try {
      await acao();
      recarregar();
      mostrar(mensagem);
      return true;
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      return false;
    }
  };

  const adicionarLink = (dados: LinkAcademicoRequestCreate) =>
    executar(() => linkAcademicoApi.criarParaOutro(auth.authFetch, idUsuario, dados), 'Link acadêmico adicionado com sucesso.');

  const removerLink = (link: LinkAcademicoResponse) =>
    executar(() => linkAcademicoApi.remover(auth.authFetch, link.idLinkAcademico), 'Link acadêmico excluído com sucesso.');

  // O tipo não muda depois de criado: o PATCH leva url e rótulo (rótulo apagado vai como null; a ordem fica).
  const salvarLink = (link: LinkAcademicoResponse, { url, rotulo }: LinkAcademicoRequestCreate) =>
    executar(
      () => linkAcademicoApi.alterar(auth.authFetch, link.idLinkAcademico, { url, rotulo: rotulo ? rotulo : null }),
      'Link acadêmico alterado com sucesso.',
    );

  return (
    <div>
      <h3 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">
        Links acadêmicos ({links.length} de {limiteLinks})
      </h3>
      <TabelaLinksAcademicos
        links={links}
        tiposLink={tiposLink ?? []}
        podeAdicionar={links.length < limiteLinks}
        aoAdicionar={adicionarLink}
        aoSalvar={salvarLink}
        aoExcluir={(link) => void removerLink(link)}
      />
    </div>
  );
}
