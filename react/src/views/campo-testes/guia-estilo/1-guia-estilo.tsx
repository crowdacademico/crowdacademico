// ============================================================================
// Guia de Estilo: página só de DESENVOLVIMENTO. Mostra os tokens e classes
// REAIS do sistema (cores nos dois temas com contraste medido, tipografia,
// componentes), sem copiar valor: se um token muda em 1-cores.css, a página
// muda junto. Não chama a API e não grava nada.
//
// Arquivos desta pasta: 2 cores, 3 componentes globais, 4 painéis de tema,
// 5 utilitário de contraste, 6 JSON com a lista de pares de contraste.
//
// Fora da pasta:
//   - rota: services/router/rotas.constants.ts (dentro de import.meta.env.DEV,
//     por isso nada daqui entra no build de produção)
//   - menu: grupo CAMPO DE TESTES, views/admin/admin-menu.constants.ts
//   - CSS: 2 linhas de seletor [data-tema-local] em assets/css/1-cores.css
//
// Dependência: o `npm run contraste` (react/scripts/contraste-tokens.mjs) lê
// 6-pares-contraste.json daqui. Ao remover o guia, mova o JSON e ajuste o script.
// Detalhes: DOCUMENTACAO_FRONTEND.md, seção "Guia de Estilo".
// ============================================================================

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CoresDoSistema } from './2-guia-estilo-cores';
import { ComparativoTemas } from './4-guia-estilo-temas';
import { Avatares, BordasComContraste, BotaoDev, CamposExtras, InterativosGlobais } from './3-guia-estilo-extras';
import { PilulaCarregandoModal } from '../../../components/crud/modal-ficha';

// Todas as classes de texto do sistema (2-tipografia.css), na ordem da escala, com o papel de cada uma (DS-10).
const CLASSES_TIPOGRAFICAS = [
  { classe: 'titulo-pagina', papel: 'título da página e dos cartões soltos', exemplo: 'Título de página' },
  { classe: 'titulo-secao', papel: 'título de lista e de modal; nome da marca', exemplo: 'Título de seção' },
  { classe: 'subtitulo', papel: 'título de bloco grande', exemplo: 'Subtítulo' },
  { classe: 'paragrafo', papel: 'texto corrido (sempre peso normal)', exemplo: 'Parágrafo: texto corrido do sistema.' },
  { classe: 'paragrafo-destaque', papel: 'texto com destaque: nome, item de menu, mensagem de erro', exemplo: 'Parágrafo com destaque' },
  { classe: 'legenda', papel: 'texto de apoio pequeno (sempre peso normal)', exemplo: 'Legenda e texto auxiliar' },
  { classe: 'legenda-destaque', papel: 'legenda com destaque: erro ou aviso embaixo de um campo', exemplo: 'Legenda com destaque' },
  { classe: 'paragrafo-denso', papel: 'texto técnico: chave, id, log', exemplo: 'parágrafo-denso: chave_tecnica_123' },
  { classe: 'titulo-bloco', papel: 'título pequeno de seção (Dados da conta, Metadados)', exemplo: 'Título de bloco' },
  { classe: 'rotulo-campo', papel: 'rótulo de campo de formulário', exemplo: 'Rótulo de campo' },
  { classe: 'rotulo-leitura', papel: 'rótulo de um valor exibido; contador', exemplo: 'Rótulo de leitura' },
];

// Amostra com o tamanho, o peso e a fonte MEDIDOS no texto (getComputedStyle), não escritos à mão: se a classe
// mudar no CSS, o número aqui muda junto.
function AmostraTipografia({ classe, papel, exemplo }: { classe: string; papel: string; exemplo: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [medida, setMedida] = useState('');
  useEffect(() => {
    if (!ref.current) return;
    const estilo = getComputedStyle(ref.current);
    setMedida(`${estilo.fontSize} · peso ${estilo.fontWeight} · ${estilo.fontFamily.split(',')[0].replace(/"/g, '')}`);
  }, []);
  return (
    <div className="fundo-cartao rounded-lg border borda-padrao p-3">
      <p className="paragrafo-denso mb-1">
        .{classe} <span className="texto-fraco">({medida})</span>
      </p>
      <p className="legenda mb-2">{papel}</p>
      <p ref={ref} className={classe}>
        {exemplo}
      </p>
    </div>
  );
}

function Tipografia() {
  return (
    <div className="space-y-3">
      {CLASSES_TIPOGRAFICAS.map((item) => (
        <AmostraTipografia key={item.classe} {...item} />
      ))}
      <div className="fundo-cartao rounded-lg border borda-padrao p-3 space-y-1">
        <p className="paragrafo-denso">.enfase · .texto-herdado</p>
        <p className="paragrafo">
          Dentro de um texto, <span className="enfase">.enfase</span> deixa só uma parte em semi-negrito, sem mudar o
          tamanho. Link de texto: <span className="link-texto">link-texto</span>.
        </p>
        <p className="legenda">
          Numa legenda, a <span className="enfase">ênfase</span> continua do tamanho da legenda.
        </p>
      </div>
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
  const idCompacto = useId();

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
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button type="button" className="btn btn-primary btn-destaque">Chamada (btn-destaque)</button>
          <button type="button" className="btn btn-secondary btn-pequeno">Pequeno (btn-pequeno)</button>
          <button type="button" className="btn-pilula">
            <i className="fa-solid fa-expand" aria-hidden="true"></i> Pílula
          </button>
          <button type="button" className="btn-pilula btn-pilula-rotulo">
            <i className="fa-solid fa-expand" aria-hidden="true"></i> Pílula na linha do rótulo
          </button>
        </div>
      </div>

      <div>
        <p className="rotulo-leitura mb-2">Ícones (sozinhos; dentro de texto, herdam o tamanho)</p>
        <div className="flex flex-wrap items-end gap-6 paragrafo texto-padrao">
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-clock icone-pequeno" aria-hidden="true"></i> icone-pequeno
          </span>
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-xmark icone-grande" aria-hidden="true"></i> icone-grande
          </span>
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-flask icone-destaque texto-marca" aria-hidden="true"></i> icone-destaque
          </span>
        </div>
      </div>

      <div>
        <p className="rotulo-leitura mb-2">Número de métrica (cards do Dashboard)</p>
        <div className="flex flex-wrap gap-8">
          <span className="numero-metrica texto-forte">28</span>
          <span className="numero-metrica texto-forte">
            <span className="numero-metrica__simbolo">R$</span>257.800,00
          </span>
        </div>
      </div>

      <BotaoDev />

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
        {/* Campo compacto (filtro das tabelas, "Mostrar" da paginação): não usa o estilo de campo inteiro, só o anel
            de foco, com .foco-marca. Clique nos dois para comparar o anel. */}
        <div>
          <label htmlFor={idCompacto} className="rotulo-campo">Compacto (foco-marca)</label>
          <input id={idCompacto} type="text" className="paragrafo w-full sm:w-64 border borda-forte rounded-lg fundo-sutil py-2.5 px-3 outline-none foco-marca texto-herdado" placeholder="Filtrar..." />
        </div>
      </div>

      <div>
        <p className="rotulo-leitura mb-2">Avisos</p>
        <div className="space-y-2">
          {AVISOS.map(({ fundo, texto, rotulo }) => (
            <p key={rotulo} className={`${fundo} ${texto} rounded-lg p-3 legenda-destaque texto-herdado`}>
              {rotulo}: mensagem de exemplo para conferir a cor do texto sobre o fundo.
            </p>
          ))}
        </div>
      </div>

      <CamposExtras />

      <Avatares />

      <BordasComContraste />

      <div>
        <p className="rotulo-leitura mb-2">Cartões</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <p className="fundo-cartao rounded-lg border borda-padrao p-3 legenda texto-padrao">fundo-cartao</p>
          <p className="fundo-elevado rounded-lg border borda-padrao p-3 legenda texto-padrao">fundo-elevado</p>
          <p className="fundo-sutil rounded-lg border borda-padrao p-3 legenda texto-padrao">fundo-sutil</p>
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
  // e mede de novo: acontece sozinho quando o Vite aplica uma edição de CSS.
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
      <div>
        <span className="badge badge-dev">&lt;dev&gt;</span>
        <h1 className="titulo-pagina mt-2">Guia de Estilo</h1>
        <p className="paragrafo mt-1">
          Lê os tokens e classes reais do sistema, sem cópia: se uma cor mudar em <code>1-cores.css</code>, esta
          página muda junto. Só existe em <code>npm run dev</code>.
        </p>
      </div>

      <div key={versao} className="space-y-8">
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

        <Secao titulo="Componentes" descricao="Botões, badges, campos, avisos e cartões como o sistema os usa (4-componentes.css). São só exemplos visuais: os botões não fazem nada, mas hover e foco funcionam.">
          <ComparativoTemas>
            <Componentes />
          </ComparativoTemas>
        </Secao>
      </div>

      <Secao
        titulo="Modal, toast, dica e tabela"
        descricao="Componentes globais: seguem o tema do cabeçalho, então troque o tema lá em cima para vê-los no claro e no escuro."
      >
        <InterativosGlobais />
      </Secao>

      {/* O mesmo componente do modal, parado: na tela de verdade ele some em menos de 1 segundo e é difícil de ver. */}
      <Secao
        titulo="Carregando do modal"
        descricao='A pílula "Carregando..." que aparece no lugar de um modal enquanto ele busca os dados (ModalFicha). Aqui fica parada, sobre o mesmo fundo escurecido, para dar para olhar com calma.'
      >
        <div className="relative h-40 rounded-xl fundo-escurecido flex items-start justify-center pt-6">
          <PilulaCarregandoModal />
        </div>
      </Secao>

    </div>
  );
}
