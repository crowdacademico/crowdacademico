// Blocos de FICHA de leitura (Consultar e as partes de leitura do Alterar, nos modais, e Minha Conta): campo
// desabilitado é o jeito errado de comunicar "isto nunca foi editável" (o desabilitado promete "você poderia
// editar, mas não pode"), então a leitura é um par rótulo/valor. Reutilizável de propósito: o próximo módulo com
// tela de Consultar usa os mesmos 2 blocos abaixo, dentro do ModalFicha, não escreve do zero.
//
// <SecaoFicha titulo="Dados da conta">
//   <CampoFicha rotulo="..." valor={...} />
// </SecaoFicha>
import { Fragment } from 'react';
import type { ReactNode } from 'react';

// Título pequeno em maiúsculo separando cada bloco ("Dados da conta", "Acesso", "Papéis"...): grid de 2 colunas
// em telas >=sm para os pares rótulo/valor, 1 coluna no mobile.
//
// `colunas={1}`: `sm:grid-cols-2` é baseado na largura da TELA, não do container; dentro de uma coluna lateral
// estreita (1/3 de uma página larga, ex.: card "Metadados" do Alterar Usuário), o grid iria para 2 colunas
// mesmo sem espaço de verdade, cada metade ficando apertada (e-mail comprido esbarrava na borda do card). Sem
// essa prop, comportamento igual ao padrão.
// `nivel`: dentro de modal (título h2) a seção é h3; numa página (Minha Conta, título h1) é h2, para os
// títulos não pularem nível. Mesmo visual nos dois.
// `centralizada`: uma linha só de números, de ponta a ponta (o primeiro campo encosta na borda esquerda, o último na
// direita, o espaço que sobra fica entre eles), cada rótulo centralizado sobre o seu valor: o Financeiro do Consultar
// Campanha. Quantos campos houver; a grade inteira mora em `.ficha-centralizada` (4-componentes.css), sem classe de
// coluna do Tailwind, que venceria a regra do CSS. Abaixo de 1024 px, 2 colunas (1 no celular).
// `destaque`: título no tamanho de `.subtitulo` em vez do rótulo pequeno, para ficha dividida em partes grandes
// (a denúncia: denunciado, denunciante, decisão, contestação).
interface SecaoFichaProps {
  titulo: string;
  children?: ReactNode;
  colunas?: 1 | 2;
  nivel?: 2 | 3;
  destaque?: boolean;
  centralizada?: boolean;
}

export function SecaoFicha({ titulo, children, colunas = 2, nivel = 3, destaque = false, centralizada = false }: SecaoFichaProps) {
  const Titulo = nivel === 2 ? 'h2' : 'h3';
  return (
    <div>
      <Titulo className={(destaque ? 'subtitulo' : 'titulo-bloco') + ' titulo-bloco--linha'}>{titulo}</Titulo>
      <div
        className={
          'grid gap-x-6 gap-y-4 ' +
          (centralizada ? 'ficha-centralizada' : colunas === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')
        }
      >
        {children}
      </div>
    </div>
  );
}

// Par rótulo/valor - SEM caixa de input desabilitada (campo desabilitado
// comunica "você poderia editar, mas não pode"; aqui nada é editável
// mesmo). Valor vazio vira "-" em cinza claro, nunca caixa em branco.
//
// `largura="cheia"` ocupa as 2 colunas da seção (campo com valor longo, ou
// que tem controle extra - ver `acao`/`children`).
// `acao` - controle pequeno ao lado do valor (ex.: a setinha de expandir
// histórico de login em modal-consultar-usuario.tsx, ModalConsultarUsuario).
// `children` - conteúdo extra ABAIXO do valor (ex.: a lista expandida em
// si), continua fora do fluxo normal de rótulo/valor.
interface CampoFichaProps {
  rotulo: string;
  valor?: ReactNode;
  largura?: 'cheia';
  acao?: ReactNode;
  children?: ReactNode;
}

export function CampoFicha({ rotulo, valor, largura, acao, children }: CampoFichaProps) {
  const temValor = valor !== null && valor !== undefined && valor !== '';

  return (
    <div className={'campo-ficha' + (largura === 'cheia' ? ' sm:col-span-2' : '')}>
      <div className="rotulo-leitura mb-1">
        {rotulo}
      </div>
      <div className="campo-ficha__valor">
        {/* break-words + min-w-0: min-w-0 é o que permite o span ENCOLHER dentro do flex (sem isso,
            break-words sozinho não basta: flex item por padrão não aceita ficar menor que o próprio conteúdo
            e empurraria `acao` para fora). */}
        <span
          className={
            'paragrafo min-w-0 break-words texto-herdado ' +
            (temValor ? 'texto-forte' : 'texto-fraco opacity-50')
          }
        >
          {temValor ? valor : '-'}
        </span>
        {acao}
      </div>
      {children}
    </div>
  );
}

// Duas seções de ficha lado a lado, com as LINHAS alinhadas (Dados e Auditoria do Consultar Campanha). Duas SecaoFicha
// separadas não sabem a altura uma da outra: uma descrição de duas linhas descia só um lado. Aqui é uma grade só, e
// cada linha tem os campos dos dois lados, então a linha tem a altura do maior deles.
// - Cada lado tem duas colunas. Um campo sozinho no lado ocupa as duas; lado vazio numa linha guarda o lugar.
// - A partir de 1024 px, a esquerda tem 2/3 da largura e a direita 1/3 (como `.grade-ficha`). Abaixo disso, a ordem
//   do CSS (`.ficha-lado-a-lado`, 4-componentes.css) mostra primeiro todos os campos da esquerda e depois os da direita.
// - As colunas moram só no CSS, sem `grid-cols-*` do Tailwind: utilitário vence regra de componente, e a grade
//   ficava com 2 colunas (a direita caía embaixo da esquerda).
interface LinhaLadoALado {
  esquerda: ReactNode[];
  direita: ReactNode[];
}

interface FichaLadoALadoProps {
  tituloEsquerda: string;
  tituloDireita: string;
  linhas: LinhaLadoALado[];
}

function CelulasDoLado({ campos, lado }: { campos: ReactNode[]; lado: 'esquerda' | 'direita' }) {
  const classe = 'ficha-lado-a-lado__' + lado;
  if (campos.length <= 1) {
    return <div className={classe + ' sm:col-span-2'}>{campos[0]}</div>;
  }
  return (
    <>
      {campos.map((campo, indice) => (
        <div key={indice} className={classe}>
          {campo}
        </div>
      ))}
    </>
  );
}

export function FichaLadoALado({ tituloEsquerda, tituloDireita, linhas }: FichaLadoALadoProps) {
  return (
    <div className="ficha-lado-a-lado grid gap-x-6 gap-y-4">
      <h3 className="titulo-bloco titulo-bloco--linha mb-0 sm:col-span-2 ficha-lado-a-lado__esquerda">{tituloEsquerda}</h3>
      <h3 className="titulo-bloco titulo-bloco--linha mb-0 sm:col-span-2 ficha-lado-a-lado__direita max-lg:mt-2">{tituloDireita}</h3>
      {linhas.map((linha, indice) => (
        <Fragment key={indice}>
          <CelulasDoLado campos={linha.esquerda} lado="esquerda" />
          <CelulasDoLado campos={linha.direita} lado="direita" />
        </Fragment>
      ))}
    </div>
  );
}
