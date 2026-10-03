import { useEffect, useState } from 'react';
import { AcaoLinha } from '../../components/crud/acao-linha';
import { BadgeStatusCampanha } from '../../components/crud/badge-status-campanha';
import { CaixaBuscaSugestoes } from '../../components/input/caixa-busca-sugestoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { STATUS_ACEITA_SEGUIR } from '../../services/12-campanha/constants/status-campanha.constants';
import { seguirCampanhaApi } from '../../services/16-seguir-campanha/api/seguir-campanha.api';
import { LIMITE_SUGESTOES_COMBOBOX } from '../../services/campo-testes/constants/campo-testes.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { contemTermo, normalizarBusca } from '../../services/constant/util/busca.util';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import { ModalConsultarCampanha } from '../12-campanha/modal-consultar-campanha';
import { ModalDenunciar } from '../19-denuncia/modal-denunciar';
import { EstadoVazio } from '../../components/crud/estado-vazio';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { SeguirCampanhaResponse } from '../../services/16-seguir-campanha/type/seguir-campanha.type';

// T4: as campanhas que a conta logada segue (RF-010, RF-011). Seguir uma campanha publicada, deixar de seguir e
// consultar (o Consultar mostra as atualizações publicadas, que é o que quem segue recebe por e-mail quando o
// módulo de e-mail existir, RF-053).
export function CampanhasSeguidas({ auth }: PropsPagina) {
  const [seguidas, setSeguidas] = useState<SeguirCampanhaResponse[]>([]);
  const [campanhas, setCampanhas] = useState<CampanhaResponse[]>([]);
  const [busca, setBusca] = useState('');
  const [escolhida, setEscolhida] = useState<CampanhaResponse | null>(null);
  const [consultandoId, setConsultandoId] = useState<number | null>(null);
  const [denunciandoId, setDenunciandoId] = useState<number | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { reportarErro } = useErroToast();
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro);

  useEffect(() => {
    if (auth.carregando) return;
    seguirCampanhaApi.listarMinhas(auth.authFetch).then(setSeguidas).catch(reportarErro);
    campanhaApi.listar(auth.authFetch).then(setCampanhas).catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.carregando, auth.authFetch, chaveRecarga]);

  const recarregar = () => setChaveRecarga((atual) => atual + 1);
  const porId = new Map(campanhas.map((campanha) => [campanha.idCampanha, campanha]));
  const idsSeguidos = new Set(seguidas.map((item) => item.idCampanha));

  // Só campanha publicada aparece para seguir (a página dela é pública); a que já sigo sai da lista.
  const sugestoes = (() => {
    const termo = normalizarBusca(busca);
    if (!termo) return [];
    return campanhas
      .filter((campanha) => STATUS_ACEITA_SEGUIR.has(campanha.status) && !idsSeguidos.has(campanha.idCampanha))
      .filter((campanha) => String(campanha.idCampanha).includes(termo) || contemTermo(campanha.titulo, termo))
      .slice(0, LIMITE_SUGESTOES_COMBOBOX);
  })();

  const seguir = async () => {
    if (!escolhida) return;
    await executar(async () => {
      await seguirCampanhaApi.seguir(auth.authFetch, escolhida.idCampanha);
      mostrar('Agora você segue esta campanha.', escolhida.titulo);
      setEscolhida(null);
      setBusca('');
      recarregar();
    });
  };

  const deixarDeSeguir = async (idCampanha: number) => {
    await executar(async () => {
      await seguirCampanhaApi.deixarDeSeguir(auth.authFetch, idCampanha);
      mostrar('Você deixou de seguir a campanha.', porId.get(idCampanha)?.titulo);
      recarregar();
    });
  };

  return (
    <div className="admin-content-painel">
      <section className="crud-secao space-y-6">
        <div className="crud-secao__cabecalho">
          <h1 className="titulo-secao">Campanhas Seguidas</h1>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <CaixaBuscaSugestoes
            className="flex-1 max-w-(--largura-campo-busca)"
            rotulo="Seguir uma campanha"
            placeholder="Digite o id ou o título..."
            valor={busca}
            aoDigitar={(texto) => {
              setBusca(texto);
              setEscolhida(null);
            }}
            sugestoes={sugestoes.map((campanha) => ({
              id: campanha.idCampanha,
              texto: campanha.titulo,
              extra: <BadgeStatusCampanha campanha={campanha} />,
            }))}
            aoEscolher={(sugestao) => {
              setEscolhida(porId.get(sugestao.id) ?? null);
              setBusca(sugestao.texto);
            }}
          />
          <button type="button" onClick={() => void seguir()} disabled={!escolhida || ocupado} className="btn btn-primary">
            Seguir
          </button>
        </div>

        {seguidas.length === 0 ? (
          <EstadoVazio compacto icone="fa-bell" titulo="Você ainda não segue nenhuma campanha." texto="Busque uma campanha publicada acima e clique em Seguir." />
        ) : (
          <div className="crud-tabela__wrapper">
            <table className="crud-tabela">
              <thead>
                <tr>
                  <th className="crud-tabela__col--id">id</th>
                  <th>Título</th>
                  <th className="crud-tabela__celula--centralizada">Status</th>
                  <th>Seguida em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {seguidas.map((item) => {
                  const campanha = porId.get(item.idCampanha);
                  return (
                    <tr key={item.idSegCampanha}>
                      <td className="crud-tabela__col--id">{item.idCampanha}</td>
                      <td>{campanha?.titulo ?? `Campanha #${item.idCampanha}`}</td>
                      <td className="crud-tabela__celula--centralizada">{campanha && <BadgeStatusCampanha campanha={campanha} />}</td>
                      <td>{formatarDataHora(item.seguidoEm)}</td>
                      <td>
                        <div className="crud-tabela__acoes">
                          <AcaoLinha rotulo="Consultar" icone="fa-eye" onClick={() => setConsultandoId(item.idCampanha)} />
                          <AcaoLinha rotulo="Deixar de seguir" icone="fa-bell-slash" variante="excluir" onClick={() => void deixarDeSeguir(item.idCampanha)} />
                          <AcaoLinha
                            rotulo="Denunciar"
                            icone="fa-flag"
                            variante="excluir"
                            onClick={() => setDenunciandoId(item.idCampanha)}
                            indisponivel={campanha?.status === 'ativo' ? undefined : 'Só campanha ativa pode ser denunciada.'}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {consultandoId !== null && (
        <ModalConsultarCampanha auth={auth} idCampanha={consultandoId} aoFechar={() => setConsultandoId(null)} />
      )}
      {denunciandoId !== null && (
        <ModalDenunciar
          authFetch={auth.authFetch}
          alvo={{ idCampanhaAlvo: denunciandoId }}
          nomeAlvo={porId.get(denunciandoId)?.titulo ?? `Campanha #${denunciandoId}`}
          aoFechar={() => setDenunciandoId(null)}
        />
      )}
    </div>
  );
}
