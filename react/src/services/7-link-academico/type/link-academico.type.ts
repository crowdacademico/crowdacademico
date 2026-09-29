// Espelha nest/src/7-link-academico/dto (só os campos que a tela usa).

// Espelha link-academico.response.ts.
export interface LinkAcademicoResponse {
  idLinkAcademico: number;
  idTipoLink: number;
  url: string;
  rotulo: string | null;
}

// Espelha link-academico.request-create.ts: o que a tabela devolve ao adicionar (rótulo vazio não é enviado).
export interface LinkAcademicoRequestCreate {
  idTipoLink: number;
  url: string;
  rotulo?: string;
}

// Espelha link-academico.request-update.ts: o tipo não muda depois de criado, só url e rótulo.
export interface LinkAcademicoRequestUpdate {
  url: string;
  rotulo?: string;
}
