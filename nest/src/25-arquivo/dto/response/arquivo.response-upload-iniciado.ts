export class ArquivoResponseUploadIniciado {
  // O front precisa mandar isto de volta, sem alterar, em
  // POST /arquivo/upload/confirmar - é o "recibo" do upload.
  chave: string;
  urlUpload: string;
  metodo: 'PUT';
  // O front PRECISA mandar exatamente estes cabeçalhos no PUT direto pro
  // bucket, ou a assinatura da URL não bate e o provedor rejeita o upload.
  cabecalhosObrigatorios: Record<string, string>;
  expiraEm: Date;
}
