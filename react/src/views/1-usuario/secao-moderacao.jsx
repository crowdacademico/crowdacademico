import { useEffect, useState } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';

// Moderação — suspender/revogar CONTA (09-08-2026, Bloco G do prompt do
// Claude Web) — dentro de Alterar Usuário porque é ação sobre a MESMA
// conta que a tela já edita, não uma tela própria. Opções de prazo vêm de
// `configuracoes.suspensao_usuario_opcoes_dias` (nada fixo no código) +
// campo livre pra qualquer outro número de dias.
export function SecaoModeracao({ auth, idUsuario }) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const { obterConfiguracao } = useConfiguracoes();
  const opcoesDias = obterConfiguracao('suspensao_usuario_opcoes_dias', '1,3,7,30')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const [suspensao, setSuspensao] = useState(null);
  const [dias, setDias] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = () => {
    usuarioApi
      .buscarSuspensao(auth.authFetch, idUsuario)
      .then(setSuspensao)
      .catch(() => setSuspensao(null));
  };
  useEffect(carregar, [auth.authFetch, idUsuario]);

  const suspensoAgora =
    suspensao?.suspensoAte && new Date(suspensao.suspensoAte) > new Date();

  const aoSuspender = async () => {
    limparErro();
    const diasNumero = Number(dias);
    if (!diasNumero || diasNumero <= 0) {
      return;
    }
    setEnviando(true);
    try {
      const ate = new Date(Date.now() + diasNumero * 24 * 60 * 60 * 1000).toISOString();
      await usuarioApi.suspender(auth.authFetch, idUsuario, ate, motivo);
      mostrar('Usuário suspenso com sucesso.', `Até ${new Date(ate).toLocaleString('pt-BR')}`);
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
      await usuarioApi.revogarSuspensao(auth.authFetch, idUsuario);
      mostrar('Suspensão revogada com sucesso.');
      carregar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SecaoFicha titulo="Moderação">
      <div className="sm:col-span-2 space-y-3">
        {erro && <p className="text-xs texto-erro font-bold">{erro}</p>}

        {suspensoAgora ? (
          <div className="rounded-lg border borda-forte fundo-erro p-4">
            <p className="text-sm font-bold texto-erro">
              Suspenso até {new Date(suspensao.suspensoAte).toLocaleString('pt-BR')}
            </p>
            <p className="text-xs texto-erro mt-1">Motivo: {suspensao.motivoSuspensao}</p>
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
              Suspender bloqueia o login desta conta pelo prazo escolhido, com motivo
              obrigatório (fica visível pra quem tentar entrar).
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
              {enviando ? 'Suspendendo...' : 'Suspender usuário'}
            </button>
          </div>
        )}
      </div>
    </SecaoFicha>
  );
}
