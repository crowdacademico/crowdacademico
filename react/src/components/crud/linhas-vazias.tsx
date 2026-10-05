// As linhas vazias que completam a última página (ver use-linhas-vazias.ts): sem destaque ao passar o mouse e
// ignoradas pelo leitor de tela.
export function LinhasVazias({
  quantas,
  colunas,
  alturaDa,
}: {
  quantas: number;
  colunas: number;
  alturaDa: (indice: number) => number | undefined;
}) {
  return (
    <>
      {Array.from({ length: quantas }, (_, indice) => (
        <tr key={`vazia-${indice}`} className="crud-tabela__linha-vazia" aria-hidden="true" style={{ height: alturaDa(indice) }}>
          <td colSpan={colunas}>&nbsp;</td>
        </tr>
      ))}
    </>
  );
}
