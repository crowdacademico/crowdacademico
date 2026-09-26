// Par Cancelar/Ação (Salvar, Criar, Publicar...) que se repetia quase byte a byte em 10 telas de Criar/Alterar.
//
// `formulario` (opcional): só as telas de ALTERAR passam isto: o botão de ação usa o atributo HTML `form="id"`
// para submeter um `<form>` que vive FORA deste rodapé (dentro do rodapé sticky de `CartaoFormulario`). Telas
// de CRIAR não passam: lá o botão já mora dentro do próprio `<form>`, não precisa apontar para fora.
interface RodapeFormularioProps {
  aoCancelar: () => void;
  desabilitado: boolean;
  enviando: boolean;
  textoAcao: string;
  textoEnviando: string;
  formulario?: string;
}

export function RodapeFormulario({
  aoCancelar,
  desabilitado,
  enviando,
  textoAcao,
  textoEnviando,
  formulario,
}: RodapeFormularioProps) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={aoCancelar} className="btn btn-secondary flex-1">
        Cancelar
      </button>
      <button
        type="submit"
        {...(formulario ? { form: formulario } : {})}
        disabled={desabilitado}
        className="btn btn-primary flex-1"
      >
        {enviando ? textoEnviando : textoAcao}
      </button>
    </div>
  );
}
