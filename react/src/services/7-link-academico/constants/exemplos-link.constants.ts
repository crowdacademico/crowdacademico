// Um exemplo fictício de link por tipo (o `codigo` de tipo_link), seguindo a regra (regex) de cada tipo: mostra o
// formato a quem preenche e serve para testar. O ORCID é o identificador de teste publicado pelo próprio ORCID. Tipo
// novo sem exemplo aqui só não aparece na lista.
export const EXEMPLO_LINK_POR_TIPO: Partial<Record<string, string>> = {
  LATTES: 'http://lattes.cnpq.br/1234567890123456',
  ORCID: 'https://orcid.org/0000-0002-1825-0097',
  RESEARCHGATE: 'https://www.researchgate.net/profile/exemplo-teste',
  LINKEDIN: 'https://www.linkedin.com/in/exemplo-teste',
  GITHUB: 'https://github.com/exemplo-teste',
  // Só para atualização (22-11-2026): vídeo, artigo e pasta de arquivos.
  YOUTUBE: 'https://www.youtube.com/watch?v=exemplo-teste',
  VIMEO: 'https://vimeo.com/123456789',
  DOI: 'https://doi.org/10.1000/182',
  GOOGLE_DRIVE: 'https://drive.google.com/drive/folders/exemplo-teste',
};
