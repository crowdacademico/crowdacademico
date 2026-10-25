// Um anexo de atualização na lista do painel: um arquivo enviado ou um link.
export class AnexoAtualizacaoResponse {
  tipo: 'arquivo' | 'link';
  // O id na tabela do tipo (arquivo_atualizacao ou link_atualizacao): só é único junto com o tipo.
  idAnexo: number;
  idAtualizacao: number;
  tituloAtualizacao: string;
  // false = a atualização foi ocultada pela moderação ou pelo dono.
  atualizacaoAtiva: boolean;
  idCampanha: number;
  // null = a campanha não está visível para quem pediu.
  tituloCampanha: string | null;
  // Arquivo: o nome original do envio. Link: o tipo de link (Lattes, GitHub...).
  nome: string;
  // Arquivo: o endereço público no armazenamento. Link: o endereço do link.
  url: string | null;
  // Arquivo: quando foi enviado. Link: quando a atualização foi publicada (o link não guarda data própria).
  quando: Date;
}
