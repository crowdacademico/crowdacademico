// Aba "Identidade Visual" (09-08-2026, Bloco H) — placeholder HONESTO, não
// fingido: o caminho já está desenhado (configuracoes ganharia as chaves
// 'logo_id_arquivo'/'favicon_id_arquivo', apontando pra uma linha de
// `arquivo` — zero tabela nova, mesmo padrão de id_imagem_perfil em
// usuario). `25-arquivo` (upload) já existe hoje — o que falta não é mais
// o upload em si, é construir a tela de gerenciar logo/favicon que
// consumiria ele; ninguém pediu essa tela ainda.
export function DashboardIdentidadeVisual() {
  return (
    <div className="fundo-cartao border borda-forte rounded-xl shadow-sm p-8 text-center">
      <div className="w-14 h-14 fundo-sutil rounded-2xl mx-auto flex items-center justify-center texto-fraco text-2xl mb-4">
        <i className="fa-solid fa-image"></i>
      </div>
      <h3 className="subtitulo mb-2">Ainda não implementado</h3>
      <p className="text-sm texto-fraco max-w-md mx-auto">
        Gerenciar logo/favicon do site aqui depende do módulo de upload de arquivo
        (25-arquivo), que ainda não existe. O caminho já está desenhado — quando o upload
        existir, isto vira um upload + duas chaves em Configurações ("logo_id_arquivo" /
        "favicon_id_arquivo"), sem precisar de tabela nova.
      </p>
    </div>
  );
}
