import { useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { Campo } from '../../components/input/campo';
import { MedidorSenha } from '../../components/input/medidor-senha';
import { SeletorFotoPerfil } from '../../components/input/seletor-foto-perfil';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import { BarraAbasBotoes } from '../../components/layout/barra-abas-botoes';
import { Carregando } from '../../components/layout/carregando';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useDadosUsuario } from '../../services/1-usuario/hook/use-dados-usuario';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { ROTULO_STATUS_PESQUISADOR } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';
import { SENHA_DEV } from '../../services/constant/constants/senha-dev.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { formatarCpf, formatarCpfOuMotivoOculto, formatarData } from '../../services/constant/util/formatacao.util';
import { CamposVinculoPerfil } from '../6-perfil-pesquisador/campos-vinculo-perfil';
import { SecaoModeracaoPesquisador } from '../6-perfil-pesquisador/secao-moderacao-pesquisador';
import { PainelLinksAcademicos } from './painel-links-academicos';
import { PainelPapeisUsuario } from './painel-papeis-usuario';
import { SecaoModeracao } from './secao-moderacao';
import type { AbaBotao } from '../../components/layout/barra-abas-botoes';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TipoVinculo, TituloAcademico } from '../../services/6-perfil-pesquisador/constants/status-pesquisador.constants';

interface ModalAlterarUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

type Aba = 'conta' | 'papeis' | 'moderacao' | 'pesquisador';

interface FormPerfil {
  tipoVinculo: TipoVinculo;
  vinculoInstitucional: string;
  tituloAcademico: TituloAcademico;
}

// Foto escolhida e ainda não salva: `undefined` = nenhuma escolha nova; `id: null` = "Remover foto".
type FotoNova = { id: number | null; url: string | null } | undefined;

// "Vale na hora": as ações destas partes gravam no clique, sem esperar um Salvar.
function AvisoValeNaHora() {
  return (
    <p className="text-xs texto-fraco flex items-center gap-2">
      <i className="fa-solid fa-bolt"></i>
      As ações abaixo valem na hora do clique, sem botão Salvar.
    </p>
  );
}

// Alterar Usuário em abas, cada uma com um jeito só de gravar (antes, um "Salvar" que valia só para parte da tela
// convivia com ações que gravavam na hora, e "Cancelar" parecia desfazer o que já estava gravado):
// - Conta: foto, nome e senha, com o próprio Salvar;
// - Papéis e Moderação: tudo grava na hora do clique;
// - Pesquisador (só de quem é): o perfil com o próprio Salvar; CPF, links e suspensão do pesquisador gravam na hora.
// Salvar uma aba não fecha o modal: a outra aba pode ter alteração em andamento. O aviso de "alteração não salva"
// olha as duas abas com Salvar. Criar perfil para quem ainda não é pesquisador fica no upgrade
// (modal-upgrade-pesquisador.tsx), que passa pelo Termo de upgrade.
export function ModalAlterarUsuario({ auth, idUsuario, aoFechar, aoAtualizado }: ModalAlterarUsuarioProps) {
  const { mostrar } = useToast();
  const errosDaTela = useErroToast({ mostraTexto: true });
  const { erro, reportarErro, limparErro } = errosDaTela;
  const { ocupado: salvando, executar: executarSalvando } = useEnvio(reportarErro, limparErro);
  const { ocupado: desbloqueando, executar: executarDesbloqueando } = useEnvio(reportarErro, limparErro);
  const { ocupado: redefinindoSenhaDev, executar: executarRedefinindoSenhaDev } = useEnvio(reportarErro, limparErro);
  const [aba, setAba] = useState<Aba>('conta');

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

  const salvarConta = async () => {
    if (!conta.tentarEnviar()) return;
    await executarSalvando(async () => {
      await usuarioApi.atualizar(auth.authFetch, idUsuario, {
        nome,
        ...(novaSenha ? { novaSenha } : {}),
        ...(fotoNova !== undefined ? { idImagemPerfil: fotoNova.id } : {}),
      });
      setBase({ nome, avatarUrl: fotoNova !== undefined ? fotoNova.url : base.avatarUrl });
      setNovaSenha('');
      setFotoNova(undefined);
      conta.limpar();
      mostrar('Conta alterada com sucesso.', `ID: ${idUsuario} foi alterado`);
      aoAtualizado();
    });
  };

  const salvarPerfil = async () => {
    if (!formPerfil || !perfil.tentarEnviar()) return;
    await executarSalvando(async () => {
      await perfilPesquisadorApi.atualizar(auth.authFetch, idUsuario, {
        tipoVinculo: formPerfil.tipoVinculo,
        ...(formPerfil.tipoVinculo === 'institucional' ? { vinculoInstitucional: formPerfil.vinculoInstitucional } : {}),
        tituloAcademico: formPerfil.tituloAcademico,
      });
      setBasePerfil(formPerfil);
      perfil.limpar();
      mostrar('Perfil de pesquisador alterado com sucesso.', `ID: ${idUsuario} foi alterado`);
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

  // A bolinha no nome da aba avisa que ela tem alteração ainda não salva.
  const abas: AbaBotao<Aba>[] = [
    { chave: 'conta', rotulo: sujoConta ? 'Conta •' : 'Conta', icone: 'fa-user' },
    { chave: 'papeis', rotulo: 'Papéis', icone: 'fa-user-shield' },
    { chave: 'moderacao', rotulo: 'Moderação', icone: 'fa-gavel' },
    ...(perfilPesquisador
      ? [{ chave: 'pesquisador' as const, rotulo: sujoPerfil ? 'Pesquisador •' : 'Pesquisador', icone: 'fa-flask' }]
      : []),
  ];

  const rodape =
    usuario &&
    (aba === 'conta' || aba === 'pesquisador' ? (
      <RodapeAcoes
        aoCancelar={fechar}
        rotuloCancelar="Fechar"
        acao={{
          rotulo: aba === 'conta' ? 'Salvar conta' : 'Salvar perfil',
          rotuloOcupado: 'Salvando...',
          ocupado: salvando,
          desabilitado: aba === 'conta' ? !sujoConta : !sujoPerfil,
          aoClicar: () => void (aba === 'conta' ? salvarConta() : salvarPerfil()),
        }}
      />
    ) : (
      <RodapeAcoes aoCancelar={fechar} rotuloCancelar="Fechar" />
    ));

  return (
    <ModalFicha
      variasTelas
      // `carregando`: mesmo mecanismo de ModalConsultarUsuario.
      carregando={!usuario}
      titulo={base.nome}
      subtitulo={usuario?.email}
      avatar={usuario && <AvatarUsuario nome={base.nome} foto={fotoNova !== undefined ? fotoNova.url : base.avatarUrl} tamanho="lg" />}
      aoFechar={fechar}
      rodape={rodape}
    >
      {carregando ? (
        <Carregando className="p-6 text-center" />
      ) : !usuario ? (
        <MensagemErro texto={erro} className="p-6 text-center texto-erro text-sm font-bold" />
      ) : (
        <>
          <BarraAbasBotoes abas={abas} ativa={aba} aoTrocar={setAba} className="-mt-2" />
          <MensagemErro texto={erro} />

          {aba === 'conta' && (
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
                    <p className="text-xs texto-fraco">A foto nova só vale depois de "Salvar conta".</p>
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
          )}

          {aba === 'papeis' && (
            <>
              <AvisoValeNaHora />
              <PainelPapeisUsuario
                auth={auth}
                idUsuario={idUsuario}
                papeis={papeis ?? []}
                aoMudarPapeis={setPapeis}
                aoAtualizado={aoAtualizado}
              />
            </>
          )}

          {aba === 'moderacao' && (
            <>
              <AvisoValeNaHora />
              <div className="flex items-center justify-between gap-3 rounded-lg border borda-forte p-3">
                <p className="text-xs texto-fraco">
                  Zera o contador de tentativas de login falhas e libera a conta, caso esteja bloqueada temporariamente.
                </p>
                <button type="button" onClick={aoDesbloquear} disabled={desbloqueando} className="btn btn-secondary shrink-0">
                  {desbloqueando ? 'Desbloqueando...' : 'Desbloquear login'}
                </button>
              </div>
              <SecaoModeracao auth={auth} idUsuario={idUsuario} />
            </>
          )}

          {aba === 'pesquisador' && formPerfil && perfilPesquisador && (
            <>
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

              <div className="border-t borda-padrao"></div>
              <AvisoValeNaHora />

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

              <PainelLinksAcademicos auth={auth} idUsuario={idUsuario} />

              <div className="border-t borda-padrao"></div>
              <SecaoModeracaoPesquisador auth={auth} idUsuario={idUsuario} />
            </>
          )}
        </>
      )}
    </ModalFicha>
  );
}
