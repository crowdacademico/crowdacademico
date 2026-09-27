// Espelham os limites físicos das colunas `codigo VARCHAR(20)` e `nome VARCHAR(100)` de `tipo_link`
// (01_extensoes_enums_tabelas.sql): não é regra de negócio ajustável (por isso não mora em `configuracoes`), é
// o tamanho real das colunas no banco. Compartilhados entre Criar e Alterar; `codigo` só é editável na criação
// (a chave é estável depois, ver ModalAlterarTipoLink em modal-tipo-link.tsx).
export const LIMITE_CODIGO_TIPO_LINK = 20;
export const LIMITE_NOME_TIPO_LINK = 100;

// Convenção de código: MAIÚSCULO_COM_UNDERSCORE, igual todo `codigo` já seedado (LATTES, ORCID, RESEARCHGATE...).
export const REGEX_CODIGO_TIPO_LINK = /^[A-Z0-9_]+$/;

export const DICA_DOMINIOS_TIPO_LINK =
  'Mecanismo de validação principal: o host da URL precisa estar nesta lista. Um ou mais domínios separados ' +
  'por vírgula. Deixe em branco pra aceitar qualquer domínio (ex.: "Outro").';

export const DICA_REGEX_TIPO_LINK =
  'Complemento opcional aos domínios acima, use só quando o domínio sozinho não garante uma URL válida. ' +
  'Deixe em branco quando o domínio já for suficiente.';

export function regexValida(padrao: string): boolean {
  if (!padrao) {
    return true;
  }
  try {
    new RegExp(padrao);
    return true;
  } catch {
    return false;
  }
}

// "github.com, gist.github.com" -> ['github.com', 'gist.github.com']; "" -> []: `dominio` é NOT NULL DEFAULT
// '{}', array vazio é o único jeito de dizer "sem restrição de domínio".
export function paraDominios(texto: string): string[] {
  return texto
    .split(',')
    .map((valor) => valor.trim())
    .filter(Boolean);
}
