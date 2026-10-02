import { useEffect, useId, useState } from 'react';
import { SecaoFicha } from './ficha-consulta';
import { useErroToast } from '../layout/toast/use-erro-toast';
import { useToast } from '../layout/toast/use-toast';
import { useOpcoesDiasSuspensao } from '../../services/constant/hook/use-opcoes-dias-suspensao';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import { MensagemErro } from './mensagem-erro';

export interface EstadoSuspensao {
  suspensoAte: string | null;
  motivoSuspensao: string | null;
}

interface SecaoSuspensaoProps {
  titulo: string;
  // O que a suspensão bloqueia, mostrado antes de suspender.
  explicacao: string;
  rotuloSuspenso: string;
  rotuloSuspender: string;
  mensagemSuspenso: string;
  mensagemRevogado: string;
  buscar: () => Promise<EstadoSuspensao>;
  suspender: (ate: string, motivo: string) => Promise<unknown>;
  revogar: () => Promise<unknown>;
  // Avisa quem usa sempre que o estado é lido de novo (ao abrir, depois de suspender ou revogar): o Alterar Usuário
  // mostra a suspensão no cabeçalho.
  aoMudar?: (estado: EstadoSuspensao | null) => void;
}

// Card de moderação "suspender por X dias, com motivo" / "revogar", usado para a conta (1-usuario) e para o
// poder de pesquisador (6-perfil-pesquisador): a mecânica é a mesma, mudam só os textos e as chamadas de API,
// que cada módulo passa. As opções de prazo vêm de `configuracoes.suspensao_usuario_opcoes_dias` (a mesma
// política para os dois) + campo livre para qualquer outro número de dias.
export function SecaoSuspensao({
  titulo,
  explicacao,
  rotuloSuspenso,
  rotuloSuspender,
  mensagemSuspenso,
  mensagemRevogado,
  buscar,
  suspender,
  revogar,
  aoMudar,
}: SecaoSuspensaoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar } = useEnvio(reportarErro, limparErro);
  const opcoesDias = useOpcoesDiasSuspensao();

  const [suspensao, setSuspensao] = useState<EstadoSuspensao | null>(null);
  const [dias, setDias] = useState('');
  const [motivo, setMotivo] = useState('');
  const idErroDias = useId();
  const idErroMotivo = useId();
  // O botão fica sempre clicável; faltando prazo ou motivo, o erro aparece embaixo de cada um. O motivo precisa de
  // 3 caracteres, a mesma regra do backend (SuspensaoRequestDto).
  const diasNumero = Number(dias);
  const { erroDe, tentarEnviar, limpar } = useErrosFormulario(() => ({
    dias: (!diasNumero || diasNumero <= 0) && 'Escolha um prazo ou digite quantos dias.',
    motivo: motivo.trim().length < 3 && 'Informe o motivo (pelo menos 3 caracteres).',
  }));

  const carregar = () => {
    buscar()
      .then((estado) => {
        setSuspensao(estado);
        aoMudar?.(estado);
      })
      .catch(() => {
        setSuspensao(null);
        aoMudar?.(null);
      });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(carregar, []);

  const suspensoAte = suspensao?.suspensoAte ?? null;
  const suspensoAgora = suspensoAte !== null && new Date(suspensoAte) > new Date();

  const aoSuspender = async () => {
    if (!tentarEnviar()) {
      return;
    }
    await executar(async () => {
      const ate = new Date(Date.now() + diasNumero * 24 * 60 * 60 * 1000).toISOString();
      await suspender(ate, motivo);
      mostrar(mensagemSuspenso, `Até ${formatarDataHora(ate)}`);
      setDias('');
      setMotivo('');
      limpar();
      carregar();
    });
  };

  const aoRevogar = async () => {
    await executar(async () => {
      await revogar();
      mostrar(mensagemRevogado);
      carregar();
    });
  };

  return (
    <SecaoFicha titulo={titulo}>
      <div className="sm:col-span-2 space-y-3">
        <MensagemErro texto={erro} className="legenda-destaque texto-erro" />

        {suspensoAgora ? (
          <div className="rounded-lg border borda-forte fundo-erro p-4">
            <p className="paragrafo-destaque texto-erro">
              {rotuloSuspenso} {formatarDataHora(suspensoAte)}
            </p>
            <p className="legenda texto-erro mt-1">Motivo: {suspensao?.motivoSuspensao}</p>
            <button type="button" onClick={() => void aoRevogar()} disabled={enviando} className="btn btn-secondary mt-3">
              {enviando ? 'Revogando...' : 'Revogar suspensão'}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border borda-padrao p-4 space-y-3">
            <p className="legenda texto-fraco">{explicacao}</p>
            <div className="flex flex-wrap gap-2 items-center">
              {opcoesDias.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDias(String(d))}
                  className={
                    'legenda-destaque px-3 py-1.5 rounded-lg border texto-herdado ' +
                    (dias === String(d)
                      ? 'fundo-marca-forte texto-sobre-cor borda-marca'
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
                aria-label="Outro prazo, em dias"
                aria-invalid={Boolean(erroDe('dias'))}
                aria-describedby={erroDe('dias') ? idErroDias : undefined}
                value={dias}
                onChange={(evento) => setDias(evento.target.value)}
                className={'input-padrao w-36 py-1.5' + (erroDe('dias') ? ' borda-erro' : '')}
              />
            </div>
            {erroDe('dias') && (
              <p id={idErroDias} className="legenda-destaque texto-erro -mt-1">
                {erroDe('dias')}
              </p>
            )}
            <textarea
              placeholder="Motivo da suspensão (obrigatório)"
              aria-label="Motivo da suspensão"
              aria-invalid={Boolean(erroDe('motivo'))}
              aria-describedby={erroDe('motivo') ? idErroMotivo : undefined}
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              className={'input-padrao' + (erroDe('motivo') ? ' borda-erro' : '')}
              rows={2}
            />
            {erroDe('motivo') && (
              <p id={idErroMotivo} className="legenda-destaque texto-erro -mt-1">
                {erroDe('motivo')}
              </p>
            )}
            <button
              type="button"
              onClick={() => void aoSuspender()}
              disabled={enviando}
              className="btn btn-danger"
            >
              {enviando ? 'Suspendendo...' : rotuloSuspender}
            </button>
          </div>
        )}
      </div>
    </SecaoFicha>
  );
}
