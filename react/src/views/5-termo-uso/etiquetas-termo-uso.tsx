import type { TermoUsoResponse } from '../../services/5-termo-uso/type/termo-uso.type';

// Pílulas do cabeçalho dos modais de Termo de Uso (Consultar, Alterar, Excluir). Não vigente COM aceite já foi a
// vigente um dia (só a vigente recebe aceite): "Substituída". Sem aceite, é um rascunho, o único caso que se exclui.
export function etiquetasTermoUso(termo: TermoUsoResponse) {
  const aceites = termo.aceites ?? 0;
  return [
    <span key="versao" className="badge badge-neutro">
      Versão {termo.versao}
    </span>,
    termo.ativo ? (
      <span key="situacao" className="badge badge-sucesso">
        Vigente
      </span>
    ) : (
      <span key="situacao" className="badge badge-neutro">
        {aceites > 0 ? 'Substituída' : 'Rascunho'}
      </span>
    ),
    aceites > 0 ? (
      <span key="aceites" className="badge badge-aviso">
        <i className="fa-solid fa-lock mr-1" aria-hidden="true"></i> Travada: {aceites} {aceites === 1 ? 'aceite' : 'aceites'}
      </span>
    ) : (
      <span key="aceites" className="badge badge-sucesso">
        Editável, sem aceites
      </span>
    ),
  ];
}
