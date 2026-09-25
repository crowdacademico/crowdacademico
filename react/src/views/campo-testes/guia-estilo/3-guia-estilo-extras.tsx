import { useCallback, useId, useState } from 'react';
import { GenericTable } from '../../../components/crud/generic-table';
import { ModalFicha } from '../../../components/crud/modal-ficha';
import { AvatarUsuario } from '../../../components/layout/avatar-usuario';
import { useToast } from '../../../components/layout/toast/use-toast';
import { Dica } from '../../../components/layout/tooltip';
import { comporSobre, lerCor, razaoContraste } from './5-contraste-cor.util';

// Complementos do Guia de Estilo: o que não cabia em "Componentes" por depender de tema global
// (modal, toast, tabela) ou por ser só uma variação (campos, avatares, botão dev, bordas).

// ---- Campos além do texto: select, textarea, checkbox e radio ----
export function CamposExtras() {
  const idSelect = useId();
  const idTexto = useId();
  const nomeRadio = useId();

  return (
    <div className="space-y-3">
      <p className="rotulo-leitura">Outros campos</p>
      <div>
        <label htmlFor={idSelect} className="rotulo-campo">Select</label>
        <select id={idSelect} className="input-padrao" defaultValue="b">
          <option value="a">Opção A</option>
          <option value="b">Opção B</option>
        </select>
      </div>
      <div>
        <label htmlFor={idTexto} className="rotulo-campo">Textarea</label>
        <textarea id={idTexto} className="input-padrao" rows={2} defaultValue="Texto em várias linhas" />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm texto-padrao">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" defaultChecked /> Marcado
        </label>
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" /> Desmarcado
        </label>
        <label className="flex items-center gap-2 font-semibold">
          <input type="radio" name={nomeRadio} defaultChecked /> Radio A
        </label>
        <label className="flex items-center gap-2 font-semibold">
          <input type="radio" name={nomeRadio} /> Radio B
        </label>
      </div>
      <p className="legenda">
        Estados de interação: passe o mouse nos botões e use a tecla Tab para ver o anel de foco. Ficam parados na
        imagem porque dependem do teclado e do mouse.
      </p>
    </div>
  );
}

// ---- Botão do modo desenvolvimento (só o selo aparecia) ----
export function BotaoDev() {
  return (
    <div>
      <p className="rotulo-leitura mb-2">Botão de desenvolvimento</p>
      <div className="flex items-center">
        <button type="button" className="btn-dev rounded-l-lg">&lt;dev&gt; Entrar como Admin</button>
        <button type="button" className="btn-dev btn-dev--seta rounded-r-lg" aria-label="Mais opções">
          <i className="fa-solid fa-chevron-down"></i>
        </button>
      </div>
    </div>
  );
}

// ---- Os 7 avatares (a cor sai de --cor-avatar-1 a 7) ----
export function Avatares() {
  return (
    <div>
      <p className="rotulo-leitura mb-2">Avatares</p>
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <span
            key={n}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold texto-sobre-cor"
            style={{ backgroundColor: `var(--cor-avatar-${n})` }}
            title={`--cor-avatar-${n}`}
          >
            {n}
          </span>
        ))}
        <AvatarUsuario nome="Ana Beatriz" />
        <AvatarUsuario nome="Carlos Melo" />
      </div>
    </div>
  );
}

// ---- Contraste das bordas (não é texto: o mínimo é 3:1 para componente de interface) ----
const LIMITE_NAO_TEXTO = 3;

function LinhaBorda({ rotulo, classe }: { rotulo: string; classe: string }) {
  const [razao, setRazao] = useState<number | null>(null);
  const medir = useCallback((alvo: HTMLElement | null) => {
    if (!alvo) {
      return;
    }
    const estilo = getComputedStyle(alvo);
    const fundoPai = comporSobre(lerCor(getComputedStyle(alvo.parentElement ?? alvo).backgroundColor), [0, 0, 0, 1]);
    const borda = comporSobre(lerCor(estilo.borderTopColor), [...fundoPai, 1]);
    setRazao(razaoContraste(borda, fundoPai));
  }, []);
  const passou = razao !== null && razao >= LIMITE_NAO_TEXTO;

  return (
    <div className="fundo-cartao flex items-center gap-3 rounded-lg p-2">
      <span ref={medir} className={`h-6 w-16 shrink-0 rounded ${classe}`} style={{ borderStyle: 'solid', borderWidth: 2 }} />
      <span className="paragrafo-denso min-w-0 flex-1 break-words">{rotulo}</span>
      {razao !== null && (
        <span className={`badge ${passou ? 'badge-sucesso' : 'badge-aviso'}`}>
          {razao.toFixed(2).replace('.', ',')}:1 {passou ? '' : '(abaixo de 3:1)'}
        </span>
      )}
    </div>
  );
}

export function BordasComContraste() {
  return (
    <div>
      <p className="rotulo-leitura mb-2">Bordas contra o cartão (mínimo 3:1 para campos)</p>
      <div className="space-y-2">
        <LinhaBorda rotulo="borda-forte (usada no campo)" classe="borda-forte" />
        <LinhaBorda rotulo="borda-padrao (decorativa: divisória)" classe="borda-padrao" />
        <LinhaBorda rotulo="borda-erro (campo com erro)" classe="borda-erro" />
        <LinhaBorda rotulo="borda-sucesso" classe="borda-sucesso" />
      </div>
    </div>
  );
}

// ---- Componentes que dependem do tema GLOBAL (o do cabeçalho): dica, toast, modal e tabela ----
interface LinhaExemplo {
  id: number;
  nome: string;
  status: string;
}
const LINHAS_EXEMPLO: LinhaExemplo[] = [
  { id: 1, nome: 'Campanha de exemplo A', status: 'Ativo' },
  { id: 2, nome: 'Campanha de exemplo B', status: 'Rascunho' },
  { id: 3, nome: 'Campanha de exemplo C', status: 'Ativo' },
];
const listarExemplo = () => Promise.resolve(LINHAS_EXEMPLO);

export function InterativosGlobais() {
  const { mostrar } = useToast();
  const [modalAberto, setModalAberto] = useState(false);

  return (
    <div className="space-y-4">
      <div className="fundo-cartao rounded-xl border borda-padrao p-4 space-y-4">
        <p className="legenda">Estes usam o tema escolhido no cabeçalho (sol, lua ou sistema), porque são globais.</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="dica inline-flex items-center gap-2 rounded-lg border borda-padrao px-3 py-2 text-sm texto-padrao">
            <i className="fa-solid fa-circle-info"></i> Passe o mouse aqui
            <Dica texto="Exemplo de dica (tooltip) do sistema" curta baixo />
          </span>
          <button type="button" className="btn btn-sucesso" onClick={() => mostrar('Tudo certo', 'Exemplo de aviso de sucesso.', 'sucesso')}>
            Toast de sucesso
          </button>
          <button type="button" className="btn btn-danger" onClick={() => mostrar('Algo deu errado', 'Exemplo de aviso de erro.', 'erro')}>
            Toast de erro
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setModalAberto(true)}>
            Abrir modal
          </button>
        </div>
      </div>

      <GenericTable<LinhaExemplo>
        titulo="Exemplo de tabela"
        colunas={[
          { chave: 'id', rotulo: 'id' },
          { chave: 'nome', rotulo: 'nome' },
          { chave: 'status', rotulo: 'status', centralizar: true },
        ]}
        chavePrimaria="id"
        listar={listarExemplo}
        acoes={{ consultar: (linha) => mostrar('Consultar', `Linha ${linha.id}: ${linha.nome}`, 'sucesso') }}
        filtrosFacetados={[{ chave: 'status', rotulo: 'Status' }]}
      />

      {modalAberto && (
        <ModalFicha
          titulo="Exemplo de modal"
          subtitulo="Assim o sistema mostra uma ficha"
          aoFechar={() => setModalAberto(false)}
          rodape={
            <button type="button" className="btn btn-secondary w-full max-w-sm ml-auto" onClick={() => setModalAberto(false)}>
              Fechar
            </button>
          }
        >
          <p className="paragrafo">Conteúdo de exemplo dentro do modal, com o mesmo cartão, título e rodapé das telas reais.</p>
        </ModalFicha>
      )}
    </div>
  );
}
