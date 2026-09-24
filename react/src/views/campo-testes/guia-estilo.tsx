// ============================================================================
// Guia de Estilo (24-09-2026): página só de DESENVOLVIMENTO, no grupo Campo de
// Testes do menu. Mostra os tokens e classes REAIS do sistema (cores nos dois
// temas lado a lado, com o contraste medido no navegador, tipografia e
// componentes), sem cópia de valor nenhum: se um token muda em 1-cores.css, a
// página muda junto. Serve para escolher e conferir cor/estilo olhando, em vez
// de imaginar. Não chama a API e não depende de login além do painel.
//
// Some do build de produção: a rota só existe dentro de `import.meta.env.DEV`
// (rotas.constants.ts), então nada daqui entra no pacote final.
// ============================================================================

import { useEffect, useId, useState, type ReactNode } from 'react';
import { CoresDoSistema, ComparadorVerdeTexto } from './guia-estilo-cores';
import { ComparativoTemas } from './guia-estilo-temas';

const CLASSES_TIPOGRAFICAS = [
  { classe: 'titulo-pagina', exemplo: 'Título de página' },
  { classe: 'titulo-secao', exemplo: 'Título de seção' },
  { classe: 'subtitulo', exemplo: 'Subtítulo' },
  { classe: 'paragrafo', exemplo: 'Parágrafo: texto corrido do sistema, em tamanho pequeno.' },
  { classe: 'paragrafo-denso', exemplo: 'parágrafo-denso: chave, id, log' },
  { classe: 'legenda', exemplo: 'Legenda e texto auxiliar' },
  { classe: 'titulo-bloco', exemplo: 'Título de bloco' },
  { classe: 'rotulo-campo', exemplo: 'Rótulo de campo' },
  { classe: 'rotulo-leitura', exemplo: 'Rótulo de leitura' },
];

function Tipografia() {
  return (
    <div className="space-y-3">
      {CLASSES_TIPOGRAFICAS.map(({ classe, exemplo }) => (
        <div key={classe} className="fundo-cartao rounded-lg border borda-padrao p-3">
          <p className="paragrafo-denso mb-1">.{classe}</p>
          <p className={classe}>{exemplo}</p>
        </div>
      ))}
    </div>
  );
}

const AVISOS = [
  { fundo: 'fundo-sucesso', texto: 'texto-sucesso', rotulo: 'Sucesso' },
  { fundo: 'fundo-erro', texto: 'texto-erro', rotulo: 'Erro' },
  { fundo: 'fundo-aviso', texto: 'texto-aviso', rotulo: 'Aviso' },
  { fundo: 'fundo-info', texto: 'texto-info', rotulo: 'Informação' },
];

function Componentes() {
  const idNormal = useId();
  const idErro = useId();
  const idDesabilitado = useId();

  return (
    <div className="space-y-4">
      <div>
        <p className="rotulo-leitura mb-2">Botões</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary">Primário</button>
          <button type="button" className="btn btn-secondary">Secundário</button>
          <button type="button" className="btn btn-danger">Perigo</button>
          <button type="button" className="btn btn-sucesso">Sucesso</button>
          <button type="button" className="btn btn-primary" disabled>Desabilitado</button>
        </div>
      </div>

      <div>
        <p className="rotulo-leitura mb-2">Badges</p>
        <div className="flex flex-wrap gap-2">
          <span className="badge badge-sucesso">sucesso</span>
          <span className="badge badge-neutro">neutro</span>
          <span className="badge badge-aviso">aviso</span>
          <span className="badge badge-erro">erro</span>
          <span className="badge badge-dev">&lt;dev&gt;</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="rotulo-leitura">Campos</p>
        <div>
          <label htmlFor={idNormal} className="rotulo-campo">Normal</label>
          <input id={idNormal} type="text" className="input-padrao" placeholder="Texto de exemplo" readOnly />
        </div>
        <div>
          <label htmlFor={idErro} className="rotulo-campo">Com erro</label>
          <input id={idErro} type="text" className="input-padrao borda-erro" defaultValue="Valor inválido" readOnly />
        </div>
        <div>
          <label htmlFor={idDesabilitado} className="rotulo-campo">Desabilitado</label>
          <input id={idDesabilitado} type="text" className="input-padrao" defaultValue="Não editável" disabled />
        </div>
      </div>

      <div>
        <p className="rotulo-leitura mb-2">Avisos</p>
        <div className="space-y-2">
          {AVISOS.map(({ fundo, texto, rotulo }) => (
            <p key={rotulo} className={`${fundo} ${texto} rounded-lg p-3 text-xs font-semibold`}>
              {rotulo}: mensagem de exemplo para conferir a cor do texto sobre o fundo.
            </p>
          ))}
        </div>
      </div>

      <div>
        <p className="rotulo-leitura mb-2">Cartões</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <p className="fundo-cartao rounded-lg border borda-padrao p-3 text-xs texto-padrao">fundo-cartao</p>
          <p className="fundo-elevado rounded-lg border borda-padrao p-3 text-xs texto-padrao">fundo-elevado</p>
          <p className="fundo-sutil rounded-lg border borda-padrao p-3 text-xs texto-padrao">fundo-sutil</p>
        </div>
      </div>
    </div>
  );
}

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="titulo-secao">{titulo}</h2>
        <p className="legenda mt-1">{descricao}</p>
      </div>
      {children}
    </section>
  );
}

export function GuiaEstilo() {
  // Nas amostras a medição roda uma vez, ao montar. Trocar a chave remonta tudo
  // e mede de novo: acontece sozinho quando o Vite aplica uma edição de CSS, e
  // pelo botão, se a edição não tiver sido percebida.
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot) {
      return;
    }
    const remedir = () => setVersao((atual) => atual + 1);
    hot.on('vite:afterUpdate', remedir);
    return () => hot.off('vite:afterUpdate', remedir);
  }, []);

  return (
    <div className="admin-content-painel space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="badge badge-dev">&lt;dev&gt;</span>
          <h1 className="titulo-pagina mt-2">Guia de Estilo</h1>
          <p className="paragrafo mt-1 max-w-3xl">
            Lê os tokens e classes reais do sistema, sem cópia: se uma cor mudar em <code>1-cores.css</code>, esta
            página muda junto. Só existe em <code>npm run dev</code>.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => setVersao((atual) => atual + 1)}>
          Remedir agora
        </button>
      </div>

      <div key={versao} className="space-y-8">
        <Secao
          titulo="Verde do texto no tema escuro"
          descricao="Compara candidatos sobre o cartão e sobre a página escura, com o contraste medido. É a decisão que estava pendente."
        >
          <ComparadorVerdeTexto />
        </Secao>

        <Secao
          titulo="Cores do sistema"
          descricao="Cada par texto/fundo nos dois temas, com a razão de contraste vista pelo navegador (verde = passa do 4,5:1 do WCAG AA). Os pares são os mesmos do npm run contraste."
        >
          <ComparativoTemas>
            <CoresDoSistema />
          </ComparativoTemas>
        </Secao>

        <Secao titulo="Tipografia" descricao="As classes de tipografia do sistema (2-tipografia.css).">
          <ComparativoTemas>
            <Tipografia />
          </ComparativoTemas>
        </Secao>

        <Secao titulo="Componentes" descricao="Botões, badges, campos, avisos e cartões como o sistema os usa (4-componentes.css).">
          <ComparativoTemas>
            <Componentes />
          </ComparativoTemas>
        </Secao>
      </div>
    </div>
  );
}
