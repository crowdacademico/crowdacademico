// Blocos de FICHA de leitura (Consultar e as partes de leitura do Alterar, nos modais, e Minha Conta): campo
// desabilitado é o jeito errado de comunicar "isto nunca foi editável" (o desabilitado promete "você poderia
// editar, mas não pode"), então a leitura é um par rótulo/valor. Reutilizável de propósito: o próximo módulo com
// tela de Consultar usa os mesmos 2 blocos abaixo, dentro do ModalFicha, não escreve do zero.
//
// <SecaoFicha titulo="Dados da conta">
//   <CampoFicha rotulo="..." valor={...} />
// </SecaoFicha>
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
interface SecaoFichaProps {
  titulo: string;
  children?: ReactNode;
  colunas?: 1 | 2;
  nivel?: 2 | 3;
}

export function SecaoFicha({ titulo, children, colunas = 2, nivel = 3 }: SecaoFichaProps) {
  const Titulo = nivel === 2 ? 'h2' : 'h3';
  return (
    <div>
      <Titulo className="titulo-bloco mb-3 pb-2 border-b borda-padrao">{titulo}</Titulo>
      <div
        className={
          'grid gap-x-6 gap-y-4 ' + (colunas === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')
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
    <div className={largura === 'cheia' ? 'sm:col-span-2' : undefined}>
      <div className="rotulo-leitura mb-1">
        {rotulo}
      </div>
      <div className="flex items-center justify-between gap-2">
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
