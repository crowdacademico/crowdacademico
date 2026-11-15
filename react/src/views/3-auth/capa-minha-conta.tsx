import { useEffect, useState } from 'react';
import { AvatarUsuario } from '../../components/layout/avatar-usuario';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { seguirCampanhaApi } from '../../services/16-seguir/api/seguir-campanha.api';
import { seguirPesquisadorApi } from '../../services/16-seguir/api/seguir-pesquisador.api';
import { contribuicaoApi } from '../../services/22-contribuicao/api/contribuicao.api';
import { formatarMesAno } from '../../services/constant/util/formatacao.util';

interface CapaMinhaContaProps {
  auth: Pick<UseAuthReturn, 'usuario' | 'authFetch'>;
}

interface Numeros {
  apoios: number | null;
  campanhasSeguidas: number | null;
  pesquisadoresSeguidos: number | null;
  minhasCampanhas: number | null;
}

const contar = <T,>(promessa: Promise<T[]>, filtro?: (item: T) => boolean) =>
  promessa.then((lista) => (filtro ? lista.filter(filtro) : lista).length).catch(() => null);

// Capa da Minha Conta (14-11-2026, "personalidade" pedida pelo Lucas e pela Alexia, mistura de duas referências):
// faixa no degradê da área pública (sem a grade, como o topo do pesquisador) com a foto sobreposta à borda (perfil de
// rede social) e uma fileira de números REAIS da própria conta (painel de cursos). Fica no topo de todas as seções.
export function CapaMinhaConta({ auth }: CapaMinhaContaProps) {
  const usuario = auth.usuario;
  const [numeros, setNumeros] = useState<Numeros | null>(null);
  const idUsuario = usuario?.idUsuario;
  const ehPesquisador = usuario?.ehPesquisador === true;

  useEffect(() => {
    if (idUsuario === undefined) return;
    const controle = { ativo: true };
    void Promise.all([
      contar(contribuicaoApi.minhas(auth.authFetch), (c) => c.status === 'confirmado' || c.status === 'repassado'),
      contar(seguirCampanhaApi.listarMinhas(auth.authFetch)),
      contar(seguirPesquisadorApi.listarMinhas(auth.authFetch)),
      ehPesquisador ? contar(campanhaApi.listar(auth.authFetch, { idUsuario })) : Promise.resolve(null),
    ]).then(([apoios, campanhasSeguidas, pesquisadoresSeguidos, minhasCampanhas]) => {
      if (controle.ativo) setNumeros({ apoios, campanhasSeguidas, pesquisadoresSeguidos, minhasCampanhas });
    });
    return () => {
      controle.ativo = false;
    };
  }, [auth.authFetch, idUsuario, ehPesquisador]);

  if (!usuario) return null;
  const membroDesde = usuario.criadoEm ? formatarMesAno(usuario.criadoEm) : null;
  const valor = (n: number | null | undefined) => (n === undefined ? '…' : n === null ? '—' : String(n));
  const tiles = [
    { rotulo: 'Apoios pagos', icone: 'fa-hand-holding-heart', valor: valor(numeros?.apoios) },
    { rotulo: 'Campanhas que sigo', icone: 'fa-bell', valor: valor(numeros?.campanhasSeguidas) },
    { rotulo: 'Pesquisadores que sigo', icone: 'fa-user-graduate', valor: valor(numeros?.pesquisadoresSeguidos) },
    ...(ehPesquisador ? [{ rotulo: 'Minhas campanhas', icone: 'fa-flask', valor: valor(numeros?.minhasCampanhas) }] : []),
  ];

  return (
    <div className="border-b borda-padrao">
      {/* Só o degradê, sem a grade quadriculada: o mesmo topo da página do pesquisador. */}
      <div className="h-28 sm:h-32 rounded-t-2xl superficie-escura" aria-hidden="true" />
      <div className="px-6 sm:px-8 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14">
          <div className="p-1 rounded-full fundo-cartao shadow-lg w-fit shrink-0 relative">
            <AvatarUsuario nome={usuario.nome} foto={usuario.avatarUrl} tamanho="xxl" forma="circulo" />
          </div>
          <div className="min-w-0 flex-1 sm:pb-1">
            <p className="titulo-secao texto-forte break-words">{usuario.nome}</p>
            <div className="paragrafo flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1 texto-fraco">
              <span className="break-all">{usuario.email}</span>
              <span className={'badge gap-1 ' + (usuario.emailVerificado ? 'badge-sucesso' : 'fundo-aviso texto-aviso')}>
                <i
                  className={'fa-solid icone-pequeno ' + (usuario.emailVerificado ? 'fa-check' : 'fa-triangle-exclamation')}
                  aria-hidden="true"
                ></i>
                {usuario.emailVerificado ? 'E-mail verificado' : 'E-mail não verificado'}
              </span>
              {ehPesquisador && <span className="badge badge-info">Pesquisador</span>}
              {membroDesde && <span>Membro desde {membroDesde}</span>}
            </div>
          </div>
        </div>

        <dl className={`grid grid-cols-2 gap-3 mt-6 ${ehPesquisador ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {tiles.map((tile) => (
            <div key={tile.rotulo} className="flex items-center gap-3 rounded-xl border borda-padrao fundo-sutil px-4 py-3 min-w-0">
              <span className="w-10 h-10 rounded-full fundo-cartao flex items-center justify-center texto-marca shrink-0" aria-hidden="true">
                <i className={`fa-solid ${tile.icone}`} />
              </span>
              <div className="min-w-0 flex flex-col-reverse">
                <dt className="legenda texto-fraco truncate">{tile.rotulo}</dt>
                <dd className="numero text-xl font-bold texto-forte">{tile.valor}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
