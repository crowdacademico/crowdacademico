// ============================================================================
// ESTE ARQUIVO EXISTE SOLENEMENTE PARA O CAMPO DE TESTES.
// NÃO ESTÁ NOS REQUISITOS FUNCIONAIS E NEM ESTARÁ.
// ============================================================================

import { useEffect, useState } from 'react';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useElenco } from '../../services/campo-testes/hook/use-elenco';

const ROTULO_STATUS = {
  vivo: 'sessão viva',
  entrando: 'entrando...',
  erro: 'falhou',
};

// Presente em toda tela do Campo de Testes. ERA um "+ ator" escolhendo de
// um roster fixo (services/campo-testes/constants/atores-seed.js),
// apagado em 23-08-2026 (pedido do Lucas: "usaremos os registros
// normais"). Agora busca a lista REAL de usuários (mesma usuarioApi que
// a tela admin de Usuários já usa) uma vez, e filtra por nome/e-mail
// enquanto digita: qualquer conta do sistema pode entrar no elenco, não
// só um punhado escolhido a dedo.
export function BarraElenco({ auth }) {
  const elenco = useElenco();
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    usuarioApi.listar(auth.authFetch).then(setUsuarios).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const idsNoElenco = new Set(Object.keys(elenco.atores).map(Number));
  const chavesVivas = Object.keys(elenco.atores).filter((idUsuario) => elenco.atores[idUsuario].status === 'vivo');
  // "Mesmo logado como admin, parece que o administrador não tem poder
  // nenhum" (achado do Lucas, 23-08-2026) — é por isto: aprovar/rejeitar/
  // mexer em orçamento e cronograma sempre passam por um ADMIN DO
  // ELENCO (`idAdminVivo`), nunca pela sessão real (`auth`), de propósito
  // (fetchComoAtor é o que deixa a ação atribuída/testável, ver Registro
  // de Chamadas). Sem esse atalho, quem já está logado como admin
  // precisava caçar a si mesmo na busca "+ ator" antes de qualquer ação
  // de admin funcionar — nada quebrado, só nada óbvio.
  const jaTemAdminNoElenco = chavesVivas.some((idUsuario) => elenco.atores[idUsuario].papeis.includes('admin'));
  const precisaDeAtalhoAdmin = auth.ehAdmin && !jaTemAdminNoElenco && auth.usuario;

  const termo = termoBusca.trim().toLowerCase();
  const resultadosBusca = termo
    ? usuarios
        .filter((usuario) => !idsNoElenco.has(usuario.idUsuario))
        .filter((usuario) => usuario.nome.toLowerCase().includes(termo) || usuario.email.toLowerCase().includes(termo))
        .slice(0, 8)
    : [];

  return (
    <div className="elenco-barra">
      <div className="elenco-barra__rotulo">Elenco</div>

      <div className="elenco-barra__chips">
        {Object.entries(elenco.atores).map(([idUsuario, estado]) => {
          const titulo = estado.status === 'erro' ? `${ROTULO_STATUS.erro}: ${estado.erro}` : ROTULO_STATUS[estado.status];
          return (
            <span key={idUsuario} className="elenco-chip" title={titulo}>
              <span className={`elenco-chip__bolinha elenco-chip__bolinha--${estado.status}`}></span>
              {estado.usuario?.nome ?? `usuário #${idUsuario}`}
              {estado.status === 'vivo' && (
                <>
                  <i
                    className={`fa-solid fa-flask ${estado.temPerfilPesquisador ? 'texto-sucesso' : 'texto-fraco'}`}
                    title={estado.temPerfilPesquisador ? 'Tem perfil de pesquisador' : 'Sem perfil de pesquisador'}
                  ></i>
                  {estado.papeis.includes('admin') && (
                    <i className="fa-solid fa-shield-halved texto-sucesso" title="Tem campanha_aprovar (admin)"></i>
                  )}
                  <button
                    type="button"
                    onClick={() => elenco.sairDoElenco(Number(idUsuario))}
                    aria-label={`Tirar ${estado.usuario?.nome ?? idUsuario} do elenco`}
                    title="Sair do elenco"
                    className="texto-fraco hover-texto-forte"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </>
              )}
            </span>
          );
        })}

        <div className="relative">
          <button type="button" className="btn btn-secondary text-xs" onClick={() => setBuscaAberta((atual) => !atual)}>
            + ator <i className="fa-solid fa-chevron-down"></i>
          </button>
          {buscaAberta && (
            <div className="absolute left-0 mt-1 w-64 fundo-cartao border borda-padrao rounded-lg shadow-lg z-20 overflow-hidden">
              <input
                type="text"
                autoFocus
                placeholder="Nome ou e-mail..."
                value={termoBusca}
                onChange={(evento) => setTermoBusca(evento.target.value)}
                className="w-full px-3 py-2 text-sm border-b borda-padrao outline-none"
              />
              {resultadosBusca.map((usuario) => (
                <button
                  key={usuario.idUsuario}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10"
                  onClick={() => {
                    elenco.entrarComoUsuario({ idUsuario: usuario.idUsuario, email: usuario.email });
                    setBuscaAberta(false);
                    setTermoBusca('');
                  }}
                >
                  {usuario.nome}
                  <span className="block texto-fraco text-xs">{usuario.email}</span>
                </button>
              ))}
              {termo && resultadosBusca.length === 0 && (
                <p className="px-3 py-2 text-xs texto-fraco">Nenhum usuário encontrado.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {precisaDeAtalhoAdmin && (
        <div className="elenco-botao-acao mb-1">
          <button
            type="button"
            className="btn btn-secondary text-xs"
            onClick={() => elenco.entrarComoUsuario({ idUsuario: auth.usuario.idUsuario, email: auth.usuario.email })}
          >
            <i className="fa-solid fa-shield-halved"></i> Adicionar {auth.usuario.nome} (você) como Admin
          </button>
          <span className="elenco-botao-acao__motivo">
            Aprovar, rejeitar e mexer em orçamento/cronograma pedem um Admin AQUI no elenco, não a sua sessão real.
          </span>
        </div>
      )}

      <div className="elenco-barra__linha-acao">
        <span>Agindo como:</span>
        <select
          className="elenco-barra__select"
          value={elenco.atorPadrao ?? ''}
          onChange={(evento) => elenco.selecionarAtorPadrao(evento.target.value ? Number(evento.target.value) : null)}
        >
          <option value="">- nenhum -</option>
          {chavesVivas.map((idUsuario) => (
            <option key={idUsuario} value={idUsuario}>
              {elenco.atores[idUsuario].usuario?.nome ?? `usuário #${idUsuario}`}
            </option>
          ))}
        </select>

        {Object.keys(elenco.atores).length > 0 && (
          <button type="button" className="btn btn-secondary text-xs" onClick={() => elenco.descartarElenco()}>
            <i className="fa-solid fa-trash"></i> Descartar elenco
          </button>
        )}
      </div>
    </div>
  );
}
