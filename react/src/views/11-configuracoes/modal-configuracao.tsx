import { useId, useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import { parMinMaxDaConfiguracao } from '../../services/11-configuracoes/constants/configuracao-pares-min-max';
import type { ConfiguracaoResponse } from '../../services/11-configuracoes/type/configuracao.type';

// Consultar/Alterar/Excluir migrados de página pra modal (14-09-2026,
// continuação da migração CRUD→Modal pedida pelo Lucas) - recebem a linha
// (`configuracao: ConfiguracaoResponse`) inteira do chamador, mesmo motivo
// de modal-motivo-denuncia.tsx. Criar fica em arquivo separado
// (modal-criar-configuracao.tsx).

interface ModalConsultarConfiguracaoProps {
  configuracao: ConfiguracaoResponse;
  aoFechar: () => void;
}

export function ModalConsultarConfiguracao({ configuracao, aoFechar }: ModalConsultarConfiguracaoProps) {
  return (
    <ModalFicha
      titulo={configuracao.chave}
      subtitulo={configuracao.descricao ?? undefined}
      badges={[
        <BadgeBooleano key="ativo" valor={configuracao.ativo} rotuloTrue="Ativo" rotuloFalse="Inativo" />,
        <BadgeBooleano key="publica" valor={configuracao.publica} rotuloTrue="Pública" rotuloFalse="Interna" />,
      ]}
      aoFechar={aoFechar}
      rodape={
        <button type="button" onClick={aoFechar} className="btn btn-secondary w-full max-w-sm ml-auto">
          Fechar
        </button>
      }
    >
      <SecaoFicha titulo="Dados">
        <CampoFicha rotulo="id" valor={configuracao.idConfig} />
        <CampoFicha rotulo="Tipo" valor={configuracao.tipo} />
        <CampoFicha rotulo="Id do usuário" valor={configuracao.idUsuario} largura="cheia" />
        <CampoFicha rotulo="Valor" valor={configuracao.valor} largura="cheia" />
        <CampoFicha rotulo="Descrição" valor={configuracao.descricao} largura="cheia" />
      </SecaoFicha>
    </ModalFicha>
  );
}

interface ModalAlterarConfiguracaoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  configuracao: ConfiguracaoResponse;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

// `chave`/`tipo` não aparecem editáveis (só leitura) porque
// AtualizarConfiguracaoRequestDto (Nest) não os aceita - imutáveis depois
// de criada a linha, só valor/descricao/ativo/publica podem mudar.
export function ModalAlterarConfiguracao({ auth, configuracao, aoFechar, aoAtualizado }: ModalAlterarConfiguracaoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [valor, setValor] = useState(configuracao.valor ?? '');
  const [descricao, setDescricao] = useState(configuracao.descricao ?? '');
  const [ativo, setAtivo] = useState(configuracao.ativo);
  const [publica, setPublica] = useState(configuracao.publica);
  const [enviando, setEnviando] = useState(false);
  const idValor = useId();
  const par = parMinMaxDaConfiguracao(configuracao.chave);
  const idDescricao = useId();

  const sujo =
    valor !== (configuracao.valor ?? '') ||
    descricao !== (configuracao.descricao ?? '') ||
    ativo !== configuracao.ativo ||
    publica !== configuracao.publica;
  useAvisoAlteracaoNaoSalva(sujo);

  const fechar = () => {
    if (!confirmarSaida(sujo)) {
      return;
    }
    aoFechar();
  };

  const aoSalvar = async () => {
    limparErro();
    setEnviando(true);
    try {
      await configuracaoApi.atualizar(auth.authFetch, configuracao.idConfig, { valor, descricao, ativo, publica });
      mostrar('Parâmetro alterado com sucesso.', `ID: ${configuracao.idConfig} foi alterado`);
      aoAtualizado();
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalFicha
      titulo={`Alterar "${configuracao.chave}"`}
      aoFechar={fechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={fechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void aoSalvar()}
            disabled={enviando || !sujo}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <SecaoFicha titulo="Dados">
        <CampoSomenteLeitura rotulo="Chave" valor={configuracao.chave} />
        <CampoSomenteLeitura rotulo="Tipo" valor={configuracao.tipo} />
      </SecaoFicha>

      <SecaoFicha titulo="Editar">
        <div className="sm:col-span-2">
          <label htmlFor={idValor} className="rotulo-campo">Valor</label>
          <input id={idValor} type="text" value={valor} onChange={(evento) => setValor(evento.target.value)} className="input-padrao" />
          {par && (
            <div className="mt-2 flex items-start gap-2 rounded-lg fundo-aviso texto-aviso p-3 text-xs">
              <i className="fa-solid fa-triangle-exclamation mt-0.5 shrink-0"></i>
              <p>
                Este é o valor {par.papel === 'minimo' ? 'MÍNIMO' : 'MÁXIMO'} e precisa ficar
                {par.papel === 'minimo' ? ' menor ou igual ' : ' maior ou igual '}
                ao de <code>{par.outras.join('</code> e <code>')}</code>. Se o novo valor passar do outro,
                o sistema recusa: {par.papel === 'minimo'
                  ? 'suba o máximo primeiro e depois o mínimo.'
                  : 'baixe o mínimo primeiro e depois o máximo.'}
              </p>
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={idDescricao} className="rotulo-campo">Descrição</label>
          <input
            id={idDescricao}
            type="text"
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            className="input-padrao"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
            <input
              type="checkbox"
              checked={ativo}
              disabled={configuracao.idUsuario === null}
              onChange={(evento) => setAtivo(evento.target.checked)}
            />
            Ativo
          </label>
          {configuracao.idUsuario === null && (
            <p className="text-xs texto-fraco mt-1">
              Parâmetro global não se desativa nem se exclui: faz parte do contrato do sistema. Para desligar
              uma regra, mude o valor.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold texto-padrao">
            <input type="checkbox" checked={publica} onChange={(evento) => setPublica(evento.target.checked)} />
            Pública
          </label>
          <p className="text-xs texto-fraco mt-1">
            Só tem efeito se este parâmetro for global (não uma preferência pessoal): marcado,
            aparece pra qualquer visitante em <code>GET /configuracoes</code>; desmarcado, só
            aparece pra quem tem a permissão &quot;configuracao_gerenciar&quot;.
          </p>
        </div>
      </SecaoFicha>
    </ModalFicha>
  );
}
