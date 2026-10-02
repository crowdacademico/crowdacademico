import { useState } from 'react';
import type { ReactNode } from 'react';
import { RodapePaginacao } from '../../pagination/rodape-paginacao';
import { EstadoVazio } from '../estado-vazio';
import { BarraFiltros } from '../../search/barra-filtros';
import { LIMIAR_FILTRO } from '../../search/limiar-filtro.constants';
import { paginarClientSide } from '../../../services/constant/util/paginacao.util';
import { contemTermo, normalizarBusca } from '../../../services/constant/util/busca.util';

// Base das listagens do Campo de Testes (bancada do pesquisador e da campanha): registros de demonstração
// aparecem riscados e sem ações ("bloqueados"), com uma caixa para escondê-los (ligada por padrão), busca por
// texto, uma faceta e paginação. O GenericTable não faz linha bloqueada, por isso esta base própria.

export interface ColunaBancada<T> {
  rotulo: string;
  celula: (linha: T) => ReactNode;
  // 'id': coluna de id (centralizada, largura de id); 'centralizada': valor curto centralizado.
  tipo?: 'id' | 'centralizada';
  // Risca o valor quando a linha é bloqueada (colunas de identificação; números e ações não).
  riscar?: boolean;
}

export interface FacetaBancada<T> {
  rotulo: string;
  valores: (linha: T) => string[];
  ordenar?: (a: string, b: string) => number;
  inicial?: string[];
}

interface TabelaBancadaProps<T> {
  titulo: string;
  rotuloOcultar: string;
  linhas: T[];
  chave: (linha: T) => number;
  colunas: ColunaBancada<T>[];
  bloqueada: (linha: T) => boolean;
  textosBusca: (linha: T) => (string | number | null | undefined)[];
  faceta: FacetaBancada<T>;
  acoes: (linha: T, bloqueada: boolean) => ReactNode;
  carregando?: boolean;
  erro?: string | null;
}

const CLASSE_TIPO = {
  id: 'crud-tabela__coluna-id crud-tabela__celula--centralizada',
  centralizada: 'crud-tabela__celula--centralizada',
};

export function TabelaBancada<T>({
  titulo,
  rotuloOcultar,
  linhas,
  chave,
  colunas,
  bloqueada,
  textosBusca,
  faceta,
  acoes,
  carregando = false,
  erro = null,
}: TabelaBancadaProps<T>) {
  const [ocultarBloqueados, setOcultarBloqueados] = useState(true);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>(faceta.inicial ?? []);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<number | 'todos'>(10);

  // Opções da faceta: só os valores que aparecem nos dados, sem lista fixa.
  const opcoes = [...new Set(linhas.flatMap(faceta.valores))].sort(faceta.ordenar ?? ((a, b) => a.localeCompare(b, 'pt-BR')));

  const termo = normalizarBusca(filtroTexto);
  const filtradas = linhas
    .filter((linha) => !ocultarBloqueados || !bloqueada(linha))
    .filter((linha) => selecionados.length === 0 || faceta.valores(linha).some((valor) => selecionados.includes(valor)))
    .filter((linha) => !termo || textosBusca(linha).some((valor) => contemTermo(valor, termo)));
  const { totalPaginas, paginaAtual, itensPagina } = paginarClientSide(filtradas, pagina, tamanhoPagina);

  const colunasTotais = colunas.length + 1;
  // Lista vazia: o mesmo estado vazio da GenericTable (ícone e frase), não um texto solto.
  const mensagem: ReactNode = carregando
    ? 'Carregando...'
    : erro
      ? erro
      : itensPagina.length === 0
        ? termo
          ? <EstadoVazio icone="fa-magnifying-glass" titulo="Nenhum registro bate com o filtro." texto="Tente outro termo ou limpe o filtro." />
          : <EstadoVazio icone="fa-inbox" titulo="Nada por aqui ainda." />
        : null;

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <h2 className="subtitulo">{titulo}</h2>
        <label className="legenda flex items-center gap-1.5 texto-herdado">
          <input
            type="checkbox"
            checked={ocultarBloqueados}
            onChange={(evento) => {
              setOcultarBloqueados(evento.target.checked);
              setPagina(1);
            }}
          />
          {rotuloOcultar}
        </label>
      </div>

      <BarraFiltros
        mostrarBusca={linhas.length > LIMIAR_FILTRO}
        valorBusca={filtroTexto}
        aoMudarBusca={(valor) => {
          setFiltroTexto(valor);
          setPagina(1);
        }}
        facetas={[
          {
            chave: faceta.rotulo,
            rotulo: faceta.rotulo,
            opcoes,
            selecionados,
            aoAlternar: (valor) => {
              setSelecionados((atuais) => (atuais.includes(valor) ? atuais.filter((v) => v !== valor) : [...atuais, valor]));
              setPagina(1);
            },
            aoLimpar: () => {
              setSelecionados([]);
              setPagina(1);
            },
          },
        ]}
      />

      <div className="crud-tabela__wrapper">
        <table className="crud-tabela mb-4">
          <thead>
            <tr>
              {colunas.map((coluna) => (
                <th key={coluna.rotulo} className={coluna.tipo ? CLASSE_TIPO[coluna.tipo] : undefined}>
                  {coluna.rotulo}
                </th>
              ))}
              <th className="crud-tabela__celula--centralizada">Ações</th>
            </tr>
          </thead>
          <tbody>
            {mensagem !== null && (
              <tr>
                <td colSpan={colunasTotais} className={!carregando && erro ? 'texto-erro enfase' : 'texto-fraco'}>
                  {mensagem}
                </td>
              </tr>
            )}
            {!carregando &&
              !erro &&
              itensPagina.map((linha) => {
                const estaBloqueada = bloqueada(linha);
                return (
                  <tr key={chave(linha)} className={estaBloqueada ? 'texto-fraco' : undefined}>
                    {colunas.map((coluna) => (
                      <td
                        key={coluna.rotulo}
                        className={coluna.tipo ? CLASSE_TIPO[coluna.tipo] : undefined}
                        style={estaBloqueada && coluna.riscar ? { textDecoration: 'line-through' } : undefined}
                      >
                        {coluna.celula(linha)}
                      </td>
                    ))}
                    <td className="crud-tabela__celula--centralizada">{acoes(linha, estaBloqueada)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <RodapePaginacao
        total={filtradas.length}
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        tamanhoPagina={tamanhoPagina}
        className="mb-4"
        aoMudarPagina={setPagina}
        aoMudarTamanho={(tamanho) => {
          setTamanhoPagina(tamanho);
          setPagina(1);
        }}
      />
    </>
  );
}
