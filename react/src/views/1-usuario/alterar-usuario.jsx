import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { papelApi, usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { SecaoModeracao } from './secao-moderacao';

// Precisa bater com o hash seedado em arquivos_banco_dados/07_seed_dados.sql
// ([07-D-1]) — se alguém trocar a senha de dev do seed, troca aqui também.
// Só existe pra dar um jeito rápido de voltar a ter uma senha CONHECIDA pra
// testar login depois que a senha real de alguém foi trocada/esquecida —
// nunca em produção (ver selo <dev> no botão abaixo).
const SENHA_DEV = 'DevTcc123!';

// Segunda view do padrão "uma página por operação de CRUD" (a primeira foi
// criar-usuario.jsx) — pedido do Lucas, 02-08-2026: Alterar/Excluir saem de
// dentro da tabela (GenericTable) e viram rota própria, com todos os dados
// visíveis e um botão de confirmar/cancelar no fim, em vez de edição em
// linha misturada com a listagem.
//
// Seções via <SecaoFicha> (09-08-2026, "mesmo estilo que já usei em
// Consultar" — pedido do Lucas) — reaproveita o MESMO componente de
// ficha-consulta.jsx aqui, mesmo sendo formulário editável: o "estilo" que
// o Lucas gostou (título pequeno maiúsculo separando blocos) não é
// exclusivo de campo somente-leitura, serve pra organizar qualquer grupo
// de campos.
export function AlterarUsuario({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [usuario, setUsuario] = useState(null);
  const [nome, setNome] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [redefinindoSenhaDev, setRedefinindoSenhaDev] = useState(false);
  // Papéis do usuário — pedido do Lucas (03-08-2026): "criar um usuário e
  // promover ele a um cargo, incluindo o de administrador", pela interface,
  // não digitando ID cru (o widget "Papéis de um usuário" já fazia isso,
  // mas pedindo o id_usuario na mão — aqui já se sabe de quem é).
  const [papeisAtuais, setPapeisAtuais] = useState([]);
  const [catalogoPapeis, setCatalogoPapeis] = useState([]);
  const [idPapelParaAtribuir, setIdPapelParaAtribuir] = useState('');
  const [atribuindoPapel, setAtribuindoPapel] = useState(false);
  const [revogandoPapel, setRevogandoPapel] = useState(null);
  const [desbloqueando, setDesbloqueando] = useState(false);

  useEffect(() => {
    Promise.all([
      usuarioApi.buscar(auth.authFetch, id),
      usuarioPapelApi.listarPorUsuario(auth.authFetch, id).catch(() => []),
      papelApi.listar(auth.authFetch),
    ])
      .then(([dadosUsuario, papeisDoUsuario, catalogo]) => {
        setUsuario(dadosUsuario);
        setNome(dadosUsuario.nome);
        setPapeisAtuais(papeisDoUsuario);
        setCatalogoPapeis(catalogo);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Só os papéis que este usuário AINDA não tem — evita tentar atribuir de
  // novo um papel que já está na lista de cima (o backend recusaria com
  // 409, mas nem oferecer a opção é mais claro que deixar tentar e falhar).
  const papeisDisponiveis = catalogoPapeis.filter(
    (papel) => !papeisAtuais.some((atual) => atual.idPapel === papel.idPapel),
  );

  // "sujo" (09-08-2026, Bloco I do prompt do Claude Web) — só compara os
  // campos que o próprio <form> salva (nome/senha); atribuir/revogar papel
  // já salva na hora (cada clique é sua própria requisição), não faz
  // parte do "salvar" deste formulário.
  const sujo = usuario !== null && (nome !== usuario.nome || novaSenha !== '');
  useAvisoAlteracaoNaoSalva(sujo);

  const aoCancelar = () => {
    if (sujo && !window.confirm('Você tem alterações não salvas. Sair mesmo assim?')) {
      return;
    }
    navigate(-1);
  };

  const aoAtribuirPapel = async () => {
    if (!idPapelParaAtribuir) {
      return;
    }
    limparErro();
    setAtribuindoPapel(true);
    try {
      const papelEscolhido = catalogoPapeis.find(
        (papel) => papel.idPapel === Number(idPapelParaAtribuir),
      );
      // `id` vem de useParams() — SEMPRE string, mesmo quando a URL só tem
      // dígitos (ex.: "/usuarios/8/alterar" → id === "8", não 8). O corpo
      // desta requisição é validado por AtribuirPapelRequestDto com
      // `@IsInt()` de verdade (diferente da URL de baixo, em
      // aoRevogarPapel, onde o Nest converte sozinho via ParseIntPipe) —
      // sem o Number() aqui, "idUsuario" chegava como texto e a validação
      // rejeitava com "idUsuario must be an integer number".
      await usuarioPapelApi.atribuir(auth.authFetch, Number(id), Number(idPapelParaAtribuir));
      const papeisAtualizados = await usuarioPapelApi.listarPorUsuario(auth.authFetch, id);
      setPapeisAtuais(papeisAtualizados);
      setIdPapelParaAtribuir('');
      mostrar(
        'Papel atribuído com sucesso.',
        `ID: ${id} agora tem o papel "${papelEscolhido?.nome}"`,
      );
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setAtribuindoPapel(false);
    }
  };

  // Suspender/reativar UM papel por um tempo (09-08-2026, Bloco G) — em vez
  // de remover (aoRevogarPapel, abaixo): preserva quando foi atribuído,
  // volta sozinho no prazo. `papelSuspendendoId` só controla qual badge
  // está mostrando o mini-seletor de dias, não dispara nada sozinho.
  const [papelSuspendendoId, setPapelSuspendendoId] = useState(null);
  const [enviandoSuspensaoPapel, setEnviandoSuspensaoPapel] = useState(null);
  const [reativandoPapel, setReativandoPapel] = useState(null);

  const aoSuspenderPapel = async (papel, dias) => {
    limparErro();
    setEnviandoSuspensaoPapel(papel.idPapel);
    try {
      // Só roda dentro do clique (indireto via onClick={() =>
      // aoSuspenderPapel(papel, dias)}), nunca durante render; a regra não
      // segue a indireção da 2ª função inline pra confirmar isso sozinha.
      // eslint-disable-next-line react-hooks/purity
      const ate = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
      await usuarioPapelApi.suspender(auth.authFetch, id, papel.idPapel, ate);
      const papeisAtualizados = await usuarioPapelApi.listarPorUsuario(auth.authFetch, id);
      setPapeisAtuais(papeisAtualizados);
      setPapelSuspendendoId(null);
      mostrar(
        'Papel suspenso com sucesso.',
        `"${papel.nomePapel}" suspenso até ${new Date(ate).toLocaleDateString('pt-BR')}`,
      );
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviandoSuspensaoPapel(null);
    }
  };

  const aoReativarPapel = async (papel) => {
    limparErro();
    setReativandoPapel(papel.idPapel);
    try {
      await usuarioPapelApi.revogarSuspensao(auth.authFetch, id, papel.idPapel);
      const papeisAtualizados = await usuarioPapelApi.listarPorUsuario(auth.authFetch, id);
      setPapeisAtuais(papeisAtualizados);
      mostrar('Papel reativado com sucesso.', `"${papel.nomePapel}" voltou a valer normalmente`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setReativandoPapel(null);
    }
  };

  const aoRevogarPapel = async (papel) => {
    limparErro();
    setRevogandoPapel(papel.idPapel);
    try {
      await usuarioPapelApi.remover(auth.authFetch, id, papel.idPapel);
      const papeisAtualizados = await usuarioPapelApi.listarPorUsuario(auth.authFetch, id);
      setPapeisAtuais(papeisAtualizados);
      mostrar('Papel revogado com sucesso.', `ID: ${id} perdeu o papel "${papel.nomePapel}"`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setRevogandoPapel(null);
    }
  };

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const dados = { nome };
      if (novaSenha) {
        dados.novaSenha = novaSenha;
      }
      await usuarioApi.atualizar(auth.authFetch, id, dados);
      mostrar('Usuário alterado com sucesso.', `ID: ${id} foi alterado`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  // liberar_bloqueio_login() (03_funcoes_seguranca.sql) existia no banco
  // desde sempre, mas nenhum endpoint chamava ela — achado ao investigar
  // "o que falta no painel admin" (03-08-2026, pedido do Lucas): uma
  // conta bloqueada por excesso de tentativas de login não tinha NENHUM
  // jeito de ser desbloqueada pelo painel, só direto no banco. Botão
  // sempre visível (não é recurso <dev> — é uma ação administrativa de
  // verdade); clicar numa conta que não está bloqueada é inofensivo (só
  // zera campos que já estavam zerados).
  const aoDesbloquear = async () => {
    limparErro();
    setDesbloqueando(true);
    try {
      await usuarioApi.desbloquear(auth.authFetch, id);
      mostrar('Login desbloqueado com sucesso.', `ID: ${id} pode tentar logar novamente`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setDesbloqueando(false);
    }
  };

  const aoRedefinirSenhaDev = async () => {
    limparErro();
    setRedefinindoSenhaDev(true);
    try {
      await usuarioApi.atualizar(auth.authFetch, id, { novaSenha: SENHA_DEV });
      mostrar('Senha redefinida com sucesso.', `ID: ${id} teve a senha redefinida para "${SENHA_DEV}"`);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setRedefinindoSenhaDev(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-user-pen"
      titulo="Alterar Usuário"
      subtitulo="Deixe a senha em branco para não alterá-la."
      rodape={
        usuario && (
          <div className="flex gap-3">
            <button type="button" onClick={aoCancelar} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              form="form-alterar-usuario"
              disabled={enviando || !sujo}
              className="btn btn-primary flex-1"
            >
              {enviando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )
      }
    >
      {carregando ? (
        <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>
      ) : !usuario ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <form id="form-alterar-usuario" onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          {/* Cabeçalho de identidade (09-08-2026, Bloco I: "a pessoa
              precisa saber QUEM está editando") — mesmo espírito do
              cabeçalho de FichaConsulta, mas dentro do corpo rolável
              (o cabeçalho fixo do card já usa o espaço pro título
              genérico "Alterar Usuário"). */}
          <div className="flex items-center gap-3 pb-4 border-b borda-padrao">
            <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shrink-0">
              {usuario.nome?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="font-bold texto-forte truncate">{usuario.nome}</p>
              <p className="text-xs texto-fraco truncate">{usuario.email}</p>
            </div>
          </div>

          <SecaoFicha titulo="Dados da conta">
            <CampoSomenteLeitura rotulo="id" valor={usuario.idUsuario} />
            <CampoSomenteLeitura rotulo="E-mail" valor={usuario.email} />
            <CampoSomenteLeitura
              rotulo="E-mail verificado"
              valor={usuario.emailVerificado ? 'Sim' : 'Não'}
            />
            <div>
              <label className="rotulo-campo">
                Nome
              </label>
              <input
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                required
                className="input-padrao"
              />
            </div>
          </SecaoFicha>

          <SecaoFicha titulo="Acesso">
            <div className="sm:col-span-2">
              <label className="rotulo-campo">
                Nova senha (opcional)
              </label>
              <input
                type="password"
                value={novaSenha}
                onChange={(evento) => setNovaSenha(evento.target.value)}
                className="input-padrao"
                placeholder="••••••••"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border borda-forte p-3">
              <p className="text-xs texto-fraco">
                Zera o contador de tentativas de login falhas e libera a conta, caso esteja
                bloqueada temporariamente.
              </p>
              <button
                type="button"
                onClick={aoDesbloquear}
                disabled={desbloqueando}
                className="btn btn-secondary shrink-0"
              >
                {desbloqueando ? 'Desbloqueando...' : 'Desbloquear login'}
              </button>
            </div>

            <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-dashed border-purple-300 bg-purple-50 p-3">
              <div>
                <span className="badge badge-dev">&lt;dev&gt;</span>
                <p className="text-xs texto-fraco mt-1">
                  Redefine a senha direto pra "{SENHA_DEV}", sem digitar nada. Só pra testar
                  login.
                </p>
              </div>
              <button
                type="button"
                onClick={aoRedefinirSenhaDev}
                disabled={redefinindoSenhaDev}
                className="btn btn-secondary shrink-0"
              >
                {redefinindoSenhaDev ? 'Redefinindo...' : 'Redefinir senha dev'}
              </button>
            </div>
          </SecaoFicha>

          <SecaoModeracao auth={auth} idUsuario={usuario.idUsuario} />

          <SecaoFicha titulo="Papéis">
            <div className="sm:col-span-2">
              <div className="flex flex-wrap gap-2 mb-3">
                {papeisAtuais.length === 0 && (
                  <p className="text-xs texto-fraco">Nenhum papel atribuído ainda.</p>
                )}
                {papeisAtuais.map((papel) => {
                  const suspenso = papel.suspensoAte && new Date(papel.suspensoAte) > new Date();
                  return (
                    <span key={papel.idPapel} className="inline-flex flex-col items-start gap-1">
                      <span
                        className={
                          'badge flex items-center gap-2 ' +
                          (suspenso ? 'fundo-aviso texto-aviso' : 'badge-neutro')
                        }
                      >
                        {papel.nomePapel}
                        {suspenso && <i className="fa-solid fa-clock text-[10px]"></i>}
                        {suspenso ? (
                          <button
                            type="button"
                            onClick={() => aoReativarPapel(papel)}
                            disabled={reativandoPapel === papel.idPapel}
                            className="font-bold hover:underline disabled:opacity-50"
                            title="Reativar agora"
                          >
                            {reativandoPapel === papel.idPapel ? '…' : 'reativar'}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setPapelSuspendendoId((atual) =>
                                  atual === papel.idPapel ? null : papel.idPapel,
                                )
                              }
                              className="texto-fraco hover-texto-forte"
                              title={`Suspender "${papel.nomePapel}" por um tempo`}
                            >
                              <i className="fa-solid fa-clock text-[10px]"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => aoRevogarPapel(papel)}
                              disabled={revogandoPapel === papel.idPapel}
                              className="text-red-600 font-bold hover:text-red-800 disabled:opacity-50"
                              title={`Revogar "${papel.nomePapel}"`}
                            >
                              ×
                            </button>
                          </>
                        )}
                      </span>
                      {papelSuspendendoId === papel.idPapel && (
                        <span className="flex gap-1 fundo-cartao border borda-forte rounded-lg p-1.5">
                          {[1, 7, 30].map((dias) => (
                            <button
                              key={dias}
                              type="button"
                              onClick={() => aoSuspenderPapel(papel, dias)}
                              disabled={enviandoSuspensaoPapel === papel.idPapel}
                              className="text-[10px] font-bold texto-padrao hover-fundo-sutil px-1.5 py-0.5 rounded"
                            >
                              {dias}d
                            </button>
                          ))}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              {papeisDisponiveis.length === 0 ? (
                // ANTES (achado do Lucas, 03-08-2026: "não consigo atribuir
                // papel pra ninguém"): este bloco inteiro só existia
                // `{papeisDisponiveis.length > 0 && (...)}` — quando não
                // sobrava nenhum papel pra atribuir (ex.: catálogo ainda não
                // carregou, ou o usuário já tem todos), o seletor E o botão
                // simplesmente SUMIAM da tela, sem nenhuma mensagem
                // explicando por quê — parecia "atribuir não funciona", não
                // "não há nada pra atribuir agora". Corrigido: sempre mostra
                // alguma coisa, nunca um vazio sem explicação.
                <p className="text-xs texto-fraco">
                  Nenhum papel adicional disponível pra atribuir (o catálogo ainda
                  está carregando, ou este usuário já tem todos os papéis existentes).
                </p>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={idPapelParaAtribuir}
                    onChange={(evento) => setIdPapelParaAtribuir(evento.target.value)}
                    className="input-padrao flex-1"
                  >
                    <option value="">Selecione um papel...</option>
                    {papeisDisponiveis.map((papel) => (
                      <option key={papel.idPapel} value={papel.idPapel}>
                        {papel.nome}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={aoAtribuirPapel}
                    disabled={!idPapelParaAtribuir || atribuindoPapel}
                    className="btn btn-primary shrink-0"
                  >
                    {atribuindoPapel ? 'Atribuindo...' : 'Atribuir'}
                  </button>
                </div>
              )}
            </div>
          </SecaoFicha>
        </form>
      )}
    </CartaoFormulario>
  );
}
