// Casca compartilhada de Criar/Alterar/Excluir (09-08-2026) - era a MESMA
// estrutura (ícone circular + título + subtítulo + cartão branco
// centralizado) copiada e colada em 7 arquivos (criar/alterar-usuario,
// alterar-papel, criar/alterar/excluir-configuracao, excluir-usuario), já
// levemente divergente entre eles (algumas com border-slate-200, outras
// não escurecidas). Extraído aqui pelo mesmo motivo de FichaConsulta -
// "mesmo estilo que já usei em Consultar" (pedido do Lucas): um lugar só
// pra ajustar o visual do "cartão de formulário" inteiro do painel.
//
// REFEITO (10-08-2026, rodada Claude Web "embelezar o painel" - causa raiz
// do "Alterar parece um monte de card empilhado, confuso"): a versão
// anterior tinha `max-w-md` (448px) + `min-h-[...] flex items-center
// justify-center` + `max-h-[...] overflow-hidden` - MEDIDA E COMPORTAMENTO
// DE MODAL (centralizado na tela, altura travada com scroll próprio),
// mesmo sendo usado como PÁGINA em todo lugar (nenhum dos 7 usos é um
// modal de verdade). Um formulário como Alterar Usuário, com várias
// seções, ficava 33% mais estreito que Consultar (FichaConsulta,
// max-w-2xl) e ainda cortado em altura - daí a sensação de "empilhado e
// confuso". Agora é uma página normal: sem centralização vertical, sem
// trava de altura, rodapé `sticky bottom-0` (mesmo padrão Notion/Linear)
// em vez de "flex-column com scroll interno" pra manter Salvar/Cancelar
// visível.
//
// `largura` - 2 medidas canônicas (pedido indireto do Claude Web: "definir
// larguras canônicas em vez de cada tela escolher a sua"): 'media'
// (max-w-2xl, MESMA largura de FichaConsulta - consistência visual entre
// Consultar e um Alterar/Criar/Excluir simples de 1-2 campos) e 'larga'
// (max-w-5xl - só pra formulário grande o bastante pra virar 2 colunas,
// hoje só Alterar Usuário).
//
// `variante="perigo"` é só o ícone (vermelho, pra Excluir) - o resto do
// cartão é idêntico, não é um componente "de exclusão" separado.
const VARIANTES_ICONE = {
  padrao: 'bg-primary text-white',
  perigo: 'fundo-erro texto-erro',
};

const LARGURAS = {
  media: 'max-w-2xl',
  larga: 'max-w-5xl',
};

export function CartaoFormulario({
  icone,
  titulo,
  subtitulo,
  variante = 'padrao',
  largura = 'media',
  rodape,
  children,
}) {
  return (
    <div className="p-4 sm:p-8 fundo-pagina">
      <div className={'mx-auto w-full ' + LARGURAS[largura]}>
        {/* SEM overflow-hidden no cartão inteiro (10-08-2026, achado
            corrigindo o mesmo problema em ficha-consulta.jsx) -
            overflow-hidden cria um contexto de scroll que o `sticky` do
            rodapé não atravessa (ele simplesmente nunca gruda). Cada
            pedaço arredonda o PRÓPRIO canto (`rounded-t-3xl`/
            `rounded-b-3xl`) em vez de depender de recorte do pai - mesma
            lição do artefato de cantinho já corrigido em toast-provider/
            admin-sidebar nesta sessão. */}
        <div className="fundo-cartao rounded-3xl shadow-2xl border borda-forte">
          <div className="p-10 text-center border-b borda-padrao fundo-sutil rounded-t-3xl">
            <div
              className={
                'w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-bold text-2xl mb-5 shadow-lg ' +
                VARIANTES_ICONE[variante]
              }
            >
              <i className={'fa-solid ' + icone}></i>
            </div>
            <h2 className="titulo-pagina mb-2">{titulo}</h2>
            {subtitulo && <p className="text-sm texto-padrao font-medium">{subtitulo}</p>}
          </div>

          {children}

          {rodape && (
            <div className="p-6 border-t borda-padrao fundo-cartao rounded-b-3xl sticky bottom-0">
              {rodape}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
