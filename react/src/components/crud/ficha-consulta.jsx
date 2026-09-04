// Layout de FICHA pra telas "Consultar" (08-08-2026, pedido do Lucas: a
// versão antiga - pilha de textbox desabilitado, igual pra todo módulo -
// não escalava bem conforme o dado crescia, e "campo desabilitado" é o
// jeito errado de comunicar "isto nunca foi editável" (o desabilitado
// promete "você poderia editar, mas não pode" - aqui nada promete isso).
// Componente reutilizável de propósito (não específico de usuário) - o
// próximo módulo com tela de Consultar usa os mesmos 3 blocos abaixo, não
// escreve do zero.
//
// <FichaConsulta titulo="..." subtitulo="..." badges={...} acoes={...}>
//   <SecaoFicha titulo="Dados da conta">
//     <CampoFicha rotulo="..." valor={...} />
//   </SecaoFicha>
// </FichaConsulta>
//
// `largura` (10-08-2026, rodada Claude Web "embelezar o painel", item 4) -
// mesmo sistema de 2 medidas canônicas de cartao-formulario.jsx: 'media'
// (max-w-2xl, padrão - Consultar Configuração, ficha simples) e 'larga'
// (max-w-5xl - Consultar Usuário, que ganhou 2 colunas pelo mesmo motivo
// do Alterar Usuário). O layout em colunas não mora AQUI dentro - quem usa
// `largura="larga"` monta o próprio `grid lg:grid-cols-3` nos `children`,
// igual já é feito em alterar-usuario.jsx; este componente só garante o
// espaço pra isso caber.
const LARGURAS = {
  media: 'max-w-2xl',
  larga: 'max-w-5xl',
};

export function FichaConsulta({
  titulo,
  subtitulo,
  avatar,
  badges,
  acaoTopo,
  acoes,
  largura = 'media',
  children,
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-start justify-center p-4 sm:p-8 fundo-pagina">
      <div
        className={
          'w-full fundo-cartao rounded-2xl shadow-lg border borda-padrao ' + LARGURAS[largura]
        }
      >
        {/* Cabeçalho: `avatar` (25-08-2026, módulo 25-arquivo - antes o
            avatar era espremido dentro de um CampoFicha lá embaixo, no
            slot `acao` pensado pra um ícone pequeno tipo a setinha de
            login; uma foto de verdade ali ficava torta, desalinhada do
            próprio rótulo. Mesmo lugar visual que já existe em Alterar
            Usuário - foto ao lado do nome) + nome grande + e-mail abaixo,
            badges e `acaoTopo` (10-08-2026, item 4: "botão Alterar no topo
            da ficha" - fluxo consultar→alterar é o mais comum em painel
            admin, não fazia sentido só no rodapé) à direita - nada de
            campo de formulário aqui, de propósito. `rounded-t-2xl` aqui
            (não `overflow-hidden` no cartão inteiro, 10-08-2026) -
            overflow-hidden quebraria o rodapé `sticky` (cria um contexto
            de scroll próprio que o sticky não atravessa), mesmo problema
            de raiz do artefato de cantinho já corrigido em toast-provider/
            admin-sidebar nesta sessão: cada pedaço arredonda o PRÓPRIO
            canto, não depende de recorte de um pai. */}
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

// Título pequeno em maiúsculo separando cada bloco ("Dados da conta",
// "Acesso", "Papéis"...) - grid de 2 colunas em telas >=sm pros pares
// rótulo/valor, 1 coluna no mobile.
//
// `colunas={1}` (10-08-2026, achado do Lucas: card "Metadados" na coluna
// lateral do Alterar Usuário) - `sm:grid-cols-2` é baseado na largura da
// TELA, não do container; dentro de uma coluna lateral estreita (1/3 de
// uma página larga), o grid via pra 2 colunas mesmo sem espaço de
// verdade, cada metade ficando apertada - e-mail comprido esbarrava na
// borda do card. Sem essa prop, comportamento igual a sempre.
export function SecaoFicha({ titulo, children, colunas = 2 }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest texto-fraco mb-3 pb-2 border-b borda-padrao">
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
// histórico de login em consultar-usuario.jsx).
// `children` - conteúdo extra ABAIXO do valor (ex.: a lista expandida em
// si), continua fora do fluxo normal de rótulo/valor.
export function CampoFicha({ rotulo, valor, largura, acao, children }) {
  const temValor = valor !== null && valor !== undefined && valor !== '';

  return (
    <div className={largura === 'cheia' ? 'sm:col-span-2' : undefined}>
      <div className="text-[11px] font-bold texto-fraco uppercase tracking-widest mb-1">
        {rotulo}
      </div>
      <div className="flex items-center justify-between gap-2">
        {/* break-words + min-w-0 (10-08-2026, mesmo achado do Lucas do
            card Metadados) - min-w-0 é o que permite o span ENCOLHER
            dentro do flex (sem isso, break-words sozinho não bastava,
            flex item por padrão não aceita ficar menor que o próprio
            conteúdo e empurraria `acao` pra fora). */}
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
