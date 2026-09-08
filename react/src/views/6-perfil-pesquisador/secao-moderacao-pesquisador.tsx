import { useEffect, useState } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { perfilPesquisadorApi } from '../../services/6-perfil-pesquisador/api/perfil-pesquisador.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { PerfilPesquisadorResponseSuspend } from '../../services/6-perfil-pesquisador/type/perfil-pesquisador.type';

interface SecaoModeracaoPesquisadorProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idUsuario: number | string;
}

// Moderação - suspender/reativar o PODER de pesquisador (07-09-2026, pedido
// do Lucas: "mesmo card de Suspender Usuário, só que focado no papel de
// Pesquisador"). Espelha secao-moderacao.tsx (1-usuario) quase igual - a
// diferença real é conceitual, não visual: isto NUNCA bloqueia login (a
// conta continua normal), só a autoridade de pesquisador (criar campanha
// nova, endossar, etc.) - por isso o pesquisador precisa continuar vendo o
// motivo em algum lugar próprio (Minha Conta > Acadêmico), não só descobrir
// tentando fazer algo e sendo barrado sem explicação.
export function SecaoModeracaoPesquisador({ auth, idUsuario }: SecaoModeracaoPesquisadorProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const { obterConfiguracao } = useConfiguracoes();
  // Mesma configuração de suspensão de usuário (suspensao_usuario_opcoes_
  // dias) - é a mesma política de negócio ("por quantos dias, tipicamente,
  // faz sentido suspender algo"), não um conceito diferente por ser
  // pesquisador em vez de conta.
  const valorOpcoesDias = obterConfiguracao('suspensao_usuario_opcoes_dias', '1,3,7,30');
  const opcoesDias = (typeof valorOpcoesDias === 'string' ? valorOpcoesDias : '1,3,7,30')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const [suspensao, setSuspensao] = useState<PerfilPesquisadorResponseSuspend | null>(null);
  const [dias, setDias] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = () => {
    perfilPesquisadorApi
      .buscarSuspensao(auth.authFetch, idUsuario)
      .then(setSuspensao)
      .catch(() => setSuspensao(null));
  };
  useEffect(carregar, [auth.authFetch, idUsuario]);

  const suspensoAte = suspensao?.suspensoAte ?? null;
  const suspensoAgora = suspensoAte !== null && new Date(suspensoAte) > new Date();

  const aoSuspender = async () => {
    limparErro();
    const diasNumero = Number(dias);
    if (!diasNumero || diasNumero <= 0) {
      return;
    }
    setEnviando(true);
    try {
      const ate = new Date(Date.now() + diasNumero * 24 * 60 * 60 * 1000).toISOString();
      await perfilPesquisadorApi.suspender(auth.authFetch, idUsuario, { ate, motivo });
      mostrar('Poder de pesquisador suspenso com sucesso.', `Até ${new Date(ate).toLocaleString('pt-BR')}`);
      setDias('');
      setMotivo('');
      carregar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  const aoRevogar = async () => {
    limparErro();
    setEnviando(true);
    try {
      await perfilPesquisadorApi.reativar(auth.authFetch, idUsuario);
      mostrar('Poder de pesquisador reativado com sucesso.');
      carregar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SecaoFicha titulo="Moderação (Pesquisador)">
      <div className="sm:col-span-2 space-y-3">
        {erro && <p className="text-xs texto-erro font-bold">{erro}</p>}

        {suspensoAgora ? (
          <div className="rounded-lg border borda-forte fundo-erro p-4">
            <p className="text-sm font-bold texto-erro">
              Poder de pesquisador suspenso até {suspensoAte && new Date(suspensoAte).toLocaleString('pt-BR')}
            </p>
            <p className="text-xs texto-erro mt-1">Motivo: {suspensao?.motivoSuspensao}</p>
            <button
              type="button"
              onClick={aoRevogar}
              disabled={enviando}
              className="btn btn-secondary mt-3"
            >
              {enviando ? 'Revogando...' : 'Revogar suspensão'}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border borda-padrao p-4 space-y-3">
            <p className="text-xs texto-fraco">
              Suspende só o PODER de pesquisador (criar campanha, endossar etc.) pelo prazo
              escolhido, com motivo obrigatório - a conta continua conseguindo logar normalmente.
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              {opcoesDias.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDias(String(d))}
                  className={
                    'px-3 py-1.5 rounded-lg text-xs font-bold border ' +
                    (dias === String(d)
                      ? 'bg-primary text-white border-primary'
                      : 'texto-padrao borda-forte hover-fundo-sutil')
                  }
                >
                  {d} {d === 1 ? 'dia' : 'dias'}
                </button>
              ))}
              <input
                type="number"
                min="1"
                placeholder="outro (dias)"
                value={dias}
                onChange={(evento) => setDias(evento.target.value)}
                className="input-padrao w-28 py-1.5"
              />
            </div>
            <textarea
              placeholder="Motivo da suspensão (obrigatório)"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              className="input-padrao"
              rows={2}
            />
            <button
              type="button"
              onClick={aoSuspender}
              disabled={!dias || !motivo.trim() || enviando}
              className="btn btn-danger"
            >
              {enviando ? 'Suspendendo...' : 'Suspender poder de pesquisador'}
            </button>
          </div>
        )}
      </div>
    </SecaoFicha>
  );
}
