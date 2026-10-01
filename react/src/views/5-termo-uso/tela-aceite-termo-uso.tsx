import { useState } from 'react';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface TelaAceiteTermoUsoProps {
  auth: Pick<UseAuthReturn, 'authFetch' | 'logout' | 'renovarSessaoAgora'>;
}

// RF-015: publicada uma versão nova do Termo de Uso, quem já tem conta lê e aceita antes de continuar. Toma o lugar
// do painel inteiro (AdminLayout) enquanto houver pendência; o backend também recusa as outras rotas com 403
// TERMO_PENDENTE, então esconder a tela não basta para pular o aceite. Aceitar renova a sessão, e o token novo
// já vem sem a pendência.
export function TelaAceiteTermoUso({ auth }: TelaAceiteTermoUsoProps) {
  const {
    dado: termo,
    carregando,
    erro,
    reportarErro,
    limparErro,
    recarregar,
  } = useBuscar(() => termoUsoApi.buscarAtivo('cadastro'), [], { mostraTexto: true });
  const [aceitando, setAceitando] = useState(false);

  const aceitar = async () => {
    if (!termo) return;
    limparErro();
    setAceitando(true);
    try {
      await termoUsoApi.aceitar(auth.authFetch, termo.idTermo);
      await auth.renovarSessaoAgora();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
      // 409: a versão vigente mudou enquanto a pessoa lia; mostra a nova.
      recarregar();
    } finally {
      setAceitando(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 fundo-pagina">
      <div className="max-w-2xl w-full fundo-cartao rounded-3xl shadow-2xl border borda-padrao overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-8 py-6 border-b borda-padrao fundo-sutil">
          <h1 className="titulo-pagina">Termo de Uso atualizado</h1>
          <p className="text-sm texto-fraco mt-1">
            Publicamos uma versão nova do Termo de Uso. Leia e aceite para continuar usando a plataforma.
            {termo && ` Versão ${termo.versao}.`}
          </p>
        </div>

        <div
          className="px-8 py-6 overflow-y-auto text-sm texto-padrao whitespace-pre-line flex-1"
          tabIndex={0}
          aria-label="Texto do Termo de Uso"
        >
          {carregando ? 'Carregando...' : (termo?.conteudo ?? 'Não foi possível carregar o Termo de Uso.')}
        </div>

        <MensagemErro texto={erro} className="px-8 pb-2 text-xs texto-erro font-semibold" />

        <div className="px-8 py-5 border-t borda-padrao flex flex-wrap justify-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => void auth.logout()}>
            Sair
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!termo || aceitando}
            onClick={() => void aceitar()}
          >
            {aceitando ? 'Aceitando...' : 'Li e aceito'}
          </button>
        </div>
      </div>
    </div>
  );
}
