// Layout de FICHA para telas "Consultar": a versão antiga (pilha de textbox desabilitado, igual para todo
// módulo) não escalava conforme o dado crescia, e "campo desabilitado" é o jeito errado de comunicar "isto
// nunca foi editável" (o desabilitado promete "você poderia editar, mas não pode"). Componente reutilizável de
// propósito (não específico de usuário): o próximo módulo com tela de Consultar usa os mesmos 3 blocos abaixo,
// não escreve do zero.
//
// <FichaConsulta titulo="..." subtitulo="..." badges={...} acoes={...}>
//   <SecaoFicha titulo="Dados da conta">
//     <CampoFicha rotulo="..." valor={...} />
//   </SecaoFicha>
// </FichaConsulta>
//
// `largura`: 2 medidas próprias deste componente: 'media' (max-w-2xl, padrão: ficha simples) e 'larga'
// (max-w-5xl: Consultar Usuário, com 2 colunas). O layout em colunas não mora AQUI dentro: quem usa
// `largura="larga"` monta o próprio `grid lg:grid-cols-3` nos `children`, como em modal-usuario.tsx
// (ModalAlterarUsuario); este componente só garante o espaço para isso caber.
//
// `largura` aqui é um vocabulário PRÓPRIO e independente: `CartaoFormulario` só tem 'media', e `ModalFicha` nem
// tem prop de largura (é sempre max-w-5xl fixo). Não confundir um com o outro por analogia.
import type { ReactNode } from 'react';

type LarguraFicha = 'media' | 'larga';

const LARGURAS: Record<LarguraFicha, string> = {
  media: 'max-w-2xl',
  larga: 'max-w-5xl',
};

interface FichaConsultaProps {
  titulo: string;
  subtitulo?: string;
  avatar?: ReactNode;
  badges?: ReactNode[];
  acaoTopo?: ReactNode;
  acoes?: ReactNode;
  largura?: LarguraFicha;
  children?: ReactNode;
}

export function FichaConsulta({
  titulo,
  subtitulo,
  avatar,
  badges,
  acaoTopo,
  acoes,
  largura = 'media',
  children,
}: FichaConsultaProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center p-4 sm:p-8 fundo-pagina">
      <div
        className={
          'w-full fundo-cartao rounded-2xl shadow-lg border borda-padrao ' + LARGURAS[largura]
        }
      >
        {/* Cabeçalho: `avatar` (a foto de verdade, ao lado do nome, como em Alterar Usuário; um avatar
            espremido num CampoFicha lá embaixo, no slot `acao` pensado para um ícone pequeno, ficaria torto
            e desalinhado do próprio rótulo) + nome grande + e-mail abaixo, badges e `acaoTopo` (botão
            Alterar no topo da ficha: o fluxo consultar→alterar é o mais comum em painel admin) à direita.
            Nada de campo de formulário aqui, de propósito. `rounded-t-2xl` aqui, não `overflow-hidden` no
            cartão inteiro: overflow-hidden quebraria o rodapé `sticky` (cria um contexto de scroll próprio
            que o sticky não atravessa); cada pedaço arredonda o PRÓPRIO canto, não depende de recorte de um
            pai. */}
        <div className="px-8 py-6 border-b borda-padrao fundo-sutil rounded-t-2xl flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {avatar}
            <div className="min-w-0">
              <h2 className="titulo-secao truncate">{titulo}</h2>
              {subtitulo && <p className="text-sm texto-fraco mt-1 break-words">{subtitulo}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {badges && badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-end">{badges}</div>
            )}
            {acaoTopo}
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">{children}</div>

        {acoes && (
          <div className="px-8 py-5 border-t borda-padrao fundo-cartao rounded-b-2xl sticky bottom-0">
            {acoes}
          </div>
        )}
      </div>
    </div>
  );
}

// Título pequeno em maiúsculo separando cada bloco ("Dados da conta", "Acesso", "Papéis"...): grid de 2 colunas
// em telas >=sm para os pares rótulo/valor, 1 coluna no mobile.
//
// `colunas={1}`: `sm:grid-cols-2` é baseado na largura da TELA, não do container; dentro de uma coluna lateral
// estreita (1/3 de uma página larga, ex.: card "Metadados" do Alterar Usuário), o grid iria para 2 colunas
// mesmo sem espaço de verdade, cada metade ficando apertada (e-mail comprido esbarrava na borda do card). Sem
// essa prop, comportamento igual ao padrão.
interface SecaoFichaProps {
  titulo: string;
  children?: ReactNode;
  colunas?: 1 | 2;
}

export function SecaoFicha({ titulo, children, colunas = 2 }: SecaoFichaProps) {
  return (
    <div>
      <h3 className="titulo-bloco mb-3 pb-2 border-b borda-padrao">
        {titulo}
      </h3>
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
// histórico de login em modal-usuario.tsx, ModalConsultarUsuario).
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
            'text-sm min-w-0 break-words ' +
            (temValor ? 'font-medium texto-forte' : 'texto-fraco opacity-50')
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
