import { useEffect, useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { papelPermissaoApi, permissaoApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { detalhePermissao } from '../../services/2-papel-permissao/constants/permissao-nomes-amigaveis.constants';
import { descricaoPapel } from '../../services/2-papel-permissao/constants/papel-descricoes.constants';
import { ModalDetalhePermissao } from './modal-detalhe-permissao';
import { Carregando } from '../../components/layout/carregando';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { PapelResponse, PermissaoResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';

interface ModalConsultarPapelProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  papel: PapelResponse;
  aoFechar: () => void;
}

// Consultar: mostra as permissões concedidas ao papel, lidas ao vivo da matriz Papel × Permissão (mesmas 2
// chamadas de matriz-papel-permissao.tsx/modal-detalhe-permissao.tsx), nunca hardcoded. `PapelResponse` só tem
// `idPapel`/`nome`/`codigo` (o `codigo` fixo acha a descrição do papel). Cada badge abre o MESMO
// `ModalDetalhePermissao` que a tabela de Permissões usa no botão "Saiba mais": zero lógica de detalhe
// duplicada.
export function ModalConsultarPapel({ auth, papel, aoFechar }: ModalConsultarPapelProps) {
  const [permissoes, setPermissoes] = useState<PermissaoResponse[] | null>(null);
  const [permissaoDetalhada, setPermissaoDetalhada] = useState<PermissaoResponse | null>(null);

  useEffect(() => {
    Promise.all([permissaoApi.listar(auth.authFetch), papelPermissaoApi.listar(auth.authFetch)])
      .then(([todasPermissoes, vinculos]) => {
        const idsDoPapel = new Set(
          vinculos.filter((v) => v.idPapel === papel.idPapel).map((v) => v.idPermissao),
        );
        setPermissoes(todasPermissoes.filter((p) => idsDoPapel.has(p.idPermissao)));
      })
      .catch(() => setPermissoes([]));
  }, [auth.authFetch, papel.idPapel]);

  return (
    <>
      <ModalFicha
        titulo={papel.nome}
        aoFechar={aoFechar}
        rodape={
          <RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />
        }
      >
        <SecaoFicha titulo="Dados">
          <CampoFicha rotulo="id" valor={papel.idPapel} />
          <CampoFicha rotulo="Nome" valor={papel.nome} largura="cheia" />
          <CampoFicha rotulo="Para que serve" valor={descricaoPapel(papel.codigo) ?? '-'} largura="cheia" />
        </SecaoFicha>

        <SecaoFicha titulo="Permissões deste papel" colunas={1}>
          {permissoes === null ? (
            <Carregando />
          ) : permissoes.length === 0 ? (
            <p className="paragrafo texto-fraco">Nenhuma permissão concedida a este papel ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {permissoes.map((permissao) => (
                <button
                  key={permissao.idPermissao}
                  type="button"
                  onClick={() => setPermissaoDetalhada(permissao)}
                  className="btn btn-secondary text-xs py-1.5 px-3"
                >
                  {detalhePermissao(permissao.nome).nome}
                </button>
              ))}
            </div>
          )}
        </SecaoFicha>
      </ModalFicha>

      {permissaoDetalhada && (
        <ModalDetalhePermissao
          permissao={permissaoDetalhada}
          authFetch={auth.authFetch}
          aoFechar={() => setPermissaoDetalhada(null)}
        />
      )}
    </>
  );
}
