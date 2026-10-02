import { useState } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { TelaCheia } from '../../components/crud/tela-cheia';
import { Carregando } from '../../components/layout/carregando';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO, TIPOS_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos.constants';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioResponseAcceptedTerm } from '../../services/1-usuario/type/usuario.type';
import type { TermoUsoResponse } from '../../services/5-termo-uso/type/termo-uso.type';

interface SecaoAceitesTermoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  // `null` = ainda carregando. A busca fica no modal, que espera por ela antes de aparecer (não "dança").
  termosAceitos: UsuarioResponseAcceptedTerm[] | null;
  aoErro: (erro: unknown) => void;
}

// Aceites do Termo de Uso de uma pessoa (Consultar e Alterar Usuário): só o ÚLTIMO aceite de cada tipo, um embaixo
// do outro, "Conta e contribuições" primeiro e o de pesquisador depois, se houver (decisão do Lucas: o histórico
// inteiro não ajuda aqui). A lista vem do mais novo para o mais antigo, então o primeiro de cada tipo é o último
// aceite. Clicar num aceite abre o texto daquela versão em tela cheia.
export function SecaoAceitesTermo({ auth, termosAceitos, aoErro }: SecaoAceitesTermoProps) {
  const [termoLido, setTermoLido] = useState<TermoUsoResponse | null>(null);
  const lerTermo = (idTermo: number) => void termoUsoApi.buscar(auth.authFetch, idTermo).then(setTermoLido, aoErro);
  const ultimos = TIPOS_TERMO.flatMap((tipo) => termosAceitos?.find((termo) => termo.tipo === tipo) ?? []);

  return (
    <>
      <SecaoFicha titulo="Aceites do Termo de Uso" colunas={1}>
        {termosAceitos === null ? (
          <Carregando />
        ) : ultimos.length === 0 ? (
          <p className="paragrafo texto-fraco">Nenhum termo aceito registrado.</p>
        ) : (
          ultimos.map((termo) => (
            <CampoFicha
              key={termo.tipo}
              rotulo={ROTULO_TIPO_TERMO[termo.tipo]}
              valor={
                <button
                  type="button"
                  onClick={() => lerTermo(termo.idTermo)}
                  className="texto-marca underline underline-offset-2 hover-texto-forte text-left"
                >
                  {termo.versao} - {formatarDataHora(termo.aceitoEm)}
                </button>
              }
            />
          ))
        )}
      </SecaoFicha>
      {termoLido && (
        <TelaCheia
          ativa
          titulo={`${ROTULO_TIPO_TERMO[termoLido.tipo]} - versão ${termoLido.versao}`}
          aoSair={() => setTermoLido(null)}
        >
          <pre className="paragrafo flex-1 overflow-y-auto whitespace-pre-wrap texto-padrao">
            {termoLido.conteudo}
          </pre>
        </TelaCheia>
      )}
    </>
  );
}
