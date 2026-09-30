import { useState } from 'react';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { Dica } from '../../components/layout/tooltip';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { papelApi, usuarioPapelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';
import { descricaoPapel } from '../../services/2-papel-permissao/constants/papel-descricoes.constants';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { useOpcoesDiasSuspensao } from '../../services/constant/hook/use-opcoes-dias-suspensao';
import { formatarData } from '../../services/constant/util/formatacao.util';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { UsuarioPapelResponse } from '../../services/2-papel-permissao/type/papel-permissao.type';

// Fora do componente: é chamado só no clique, nunca durante o desenho da tela.
function daquiADias(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
}

interface PainelPapeisUsuarioProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number;
  papeis: UsuarioPapelResponse[];
  aoMudarPapeis: (papeis: UsuarioPapelResponse[]) => void;
  aoAtualizado: () => void;
}

// Papéis da conta (Alterar Usuário, aba Papéis): atribuir, suspender por um prazo com motivo, reativar e revogar.
// Tudo grava na hora. Uma ação por vez (`ocupado` guarda qual), e depois de cada uma a lista é buscada de novo.
export function PainelPapeisUsuario({ auth, idUsuario, papeis, aoMudarPapeis, aoAtualizado }: PainelPapeisUsuarioProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const opcoesDiasSuspensao = useOpcoesDiasSuspensao();
  const { dado: catalogo } = useBuscar(() => papelApi.listar(auth.authFetch), []);
  const [ocupado, setOcupado] = useState<number | 'atribuir' | null>(null);
  const [idPapelParaAtribuir, setIdPapelParaAtribuir] = useState('');
  const [papelSuspendendoId, setPapelSuspendendoId] = useState<number | null>(null);
  const [motivoSuspensao, setMotivoSuspensao] = useState('');

  const papeisDisponiveis = (catalogo ?? []).filter((papel) => !papeis.some((atual) => atual.idPapel === papel.idPapel));
  const papelEscolhido = (catalogo ?? []).find((papel) => papel.idPapel === Number(idPapelParaAtribuir));
  const descricaoEscolhido = papelEscolhido ? descricaoPapel(papelEscolhido.codigo) : undefined;

  // "Atribuir" fica sempre clicável: sem papel escolhido, o erro aparece embaixo do campo. O motivo da suspensão
  // idem (pelo menos 3 caracteres).
  const atribuicao = useErrosFormulario(() => ({
    papel: idPapelParaAtribuir === '' && 'Escolha um papel para atribuir.',
  }));
  const suspensao = useErrosFormulario(() => ({
    motivo: motivoSuspensao.trim().length < 3 && 'Informe o motivo (pelo menos 3 caracteres).',
  }));

  // Executa a ação, busca a lista nova de papéis e mostra o aviso de sucesso.
  const executar = async (qual: number | 'atribuir', acao: () => Promise<unknown>, titulo: string, descricao: string) => {
    limparErro();
    setOcupado(qual);
    try {
      await acao();
      aoMudarPapeis(await usuarioPapelApi.listarPorUsuario(auth.authFetch, idUsuario));
      mostrar(titulo, descricao);
      aoAtualizado();
      return true;
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const aoAtribuir = async () => {
    if (!atribuicao.tentarEnviar() || !papelEscolhido) return;
    const ok = await executar(
      'atribuir',
      () => usuarioPapelApi.atribuir(auth.authFetch, idUsuario, papelEscolhido.idPapel),
      'Papel atribuído com sucesso.',
      `ID: ${idUsuario} agora tem o papel "${papelEscolhido.nome}"`,
    );
    if (ok) {
      setIdPapelParaAtribuir('');
      atribuicao.limpar();
    }
  };

  const aoSuspender = async (papel: UsuarioPapelResponse, dias: number) => {
    if (!suspensao.tentarEnviar()) return;
    const motivo = motivoSuspensao.trim();
    const ate = daquiADias(dias);
    const ok = await executar(
      papel.idPapel,
      () => usuarioPapelApi.suspender(auth.authFetch, idUsuario, papel.idPapel, ate, motivo),
      'Papel suspenso com sucesso.',
      `"${papel.nomePapel}" suspenso até ${formatarData(ate)}`,
    );
    if (ok) {
      setPapelSuspendendoId(null);
      setMotivoSuspensao('');
      suspensao.limpar();
    }
  };

  const aoReativar = (papel: UsuarioPapelResponse) =>
    void executar(
      papel.idPapel,
      () => usuarioPapelApi.revogarSuspensao(auth.authFetch, idUsuario, papel.idPapel),
      'Papel reativado com sucesso.',
      `"${papel.nomePapel}" voltou a valer normalmente`,
    );

  const aoRevogar = (papel: UsuarioPapelResponse) => {
    // O "×" é pequeno e fica colado no nome do papel: um clique sem querer tirava o papel na hora.
    if (!window.confirm(`Revogar o papel "${papel.nomePapel}"? A conta perde na hora o que este papel permite.`)) {
      return;
    }
    void executar(
      papel.idPapel,
      () => usuarioPapelApi.remover(auth.authFetch, idUsuario, papel.idPapel),
      'Papel revogado com sucesso.',
      `ID: ${idUsuario} perdeu o papel "${papel.nomePapel}"`,
    );
  };

  return (
    <div className="space-y-4">
      <MensagemErro texto={erro} />

      <div className="flex flex-wrap gap-2">
        {papeis.length === 0 && <p className="text-xs texto-fraco">Nenhum papel atribuído ainda.</p>}
        {papeis.map((papel) => {
          const suspenso = papel.suspensoAte && new Date(papel.suspensoAte) > new Date();
          return (
            <span key={papel.idPapel} className="inline-flex flex-col items-start gap-1">
              <span className={'badge flex items-center gap-2 ' + (suspenso ? 'fundo-aviso texto-aviso' : 'badge-neutro')}>
                {papel.nomePapel}
                {suspenso && <i className="fa-solid fa-clock text-[10px]"></i>}
                {suspenso ? (
                  <button
                    type="button"
                    onClick={() => aoReativar(papel)}
                    disabled={ocupado === papel.idPapel}
                    className="dica font-bold hover:underline disabled:opacity-50"
                  >
                    {ocupado === papel.idPapel ? '…' : 'reativar'}
                    <Dica texto="Reativar agora" curta />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPapelSuspendendoId((atual) => (atual === papel.idPapel ? null : papel.idPapel))}
                      className="dica texto-fraco hover-texto-forte"
                      aria-label={`Suspender "${papel.nomePapel}" por um tempo`}
                    >
                      <i className="fa-solid fa-clock text-[10px]"></i>
                      <Dica texto={`Suspender "${papel.nomePapel}" por um tempo`} curta />
                    </button>
                    <button
                      type="button"
                      onClick={() => aoRevogar(papel)}
                      disabled={ocupado === papel.idPapel}
                      className="dica texto-erro font-bold hover-texto-erro disabled:opacity-50"
                      aria-label={`Revogar "${papel.nomePapel}"`}
                    >
                      ×
                      <Dica texto={`Revogar "${papel.nomePapel}"`} curta />
                    </button>
                  </>
                )}
              </span>
              {papelSuspendendoId === papel.idPapel && (
                <span className="flex flex-col gap-1 fundo-cartao border borda-forte rounded-lg p-1.5">
                  <input
                    value={motivoSuspensao}
                    onChange={(evento) => setMotivoSuspensao(evento.target.value)}
                    placeholder="Motivo (obrigatório)"
                    aria-label={`Motivo da suspensão de "${papel.nomePapel}"`}
                    aria-invalid={Boolean(suspensao.erroDe('motivo'))}
                    className={'input-padrao text-xs py-1' + (suspensao.erroDe('motivo') ? ' borda-erro' : '')}
                  />
                  {suspensao.erroDe('motivo') && (
                    <span className="text-[10px] texto-erro font-semibold">{suspensao.erroDe('motivo')}</span>
                  )}
                  <span className="flex gap-1">
                    {opcoesDiasSuspensao.map((dias) => (
                      <button
                        key={dias}
                        type="button"
                        onClick={() => void aoSuspender(papel, dias)}
                        disabled={ocupado === papel.idPapel}
                        className="text-[10px] font-bold texto-padrao hover-fundo-sutil px-1.5 py-0.5 rounded"
                      >
                        {dias}d
                      </button>
                    ))}
                  </span>
                </span>
              )}
            </span>
          );
        })}
      </div>

      {catalogo !== null && papeisDisponiveis.length === 0 ? (
        <p className="text-xs texto-fraco">Esta conta já tem todos os papéis que existem.</p>
      ) : (
        <div className="flex flex-col gap-2 max-w-md">
          <select
            value={idPapelParaAtribuir}
            onChange={(evento) => setIdPapelParaAtribuir(evento.target.value)}
            aria-label="Papel para atribuir"
            aria-invalid={Boolean(atribuicao.erroDe('papel'))}
            className={'input-padrao' + (atribuicao.erroDe('papel') ? ' borda-erro' : '')}
          >
            <option value="">Selecione um papel...</option>
            {papeisDisponiveis.map((papel) => (
              <option key={papel.idPapel} value={papel.idPapel}>
                {papel.nome}
              </option>
            ))}
          </select>
          {atribuicao.erroDe('papel') && <p className="text-xs texto-erro font-semibold">{atribuicao.erroDe('papel')}</p>}
          {/* O que o papel escolhido libera, antes de atribuir. */}
          {descricaoEscolhido && <p className="text-xs texto-fraco">{descricaoEscolhido}</p>}
          <button type="button" onClick={() => void aoAtribuir()} disabled={ocupado === 'atribuir'} className="btn btn-primary">
            {ocupado === 'atribuir' ? 'Atribuindo...' : 'Atribuir'}
          </button>
        </div>
      )}
    </div>
  );
}
