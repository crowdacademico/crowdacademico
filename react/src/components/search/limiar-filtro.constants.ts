// Separado de `barra-filtros.tsx`: react-refresh exige que um arquivo de COMPONENTE só exporte componentes;
// constante compartilhada vai num arquivo próprio (mesmo padrão de `tamanhos-pagina.constants.ts`).
//
// Abaixo desse tanto de linhas, filtrar não faz diferença (a lista cabe na tela inteira sem rolar): a busca de
// texto só aparece a partir daqui.
export const LIMIAR_FILTRO = 5;
