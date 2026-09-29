import { useState } from 'react';
import { BadgeBooleano } from '../../components/crud/badge-booleano';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Campo } from '../../components/input/campo';
import { CaixaMarcacao } from '../../components/input/caixa-marcacao';
import { configuracoesApi } from '../../services/11-configuracoes/api/configuracoes.api';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import { parMinMaxDaConfiguracao } from '../../services/11-configuracoes/constants/configuracoes-pares-min-max.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { ConfiguracoesResponse } from '../../services/11-configuracoes/type/configuracoes.type';

// Consultar/Alterar em modal: recebem a linha (`configuracao: ConfiguracoesResponse`) inteira do
// chamador, mesmo motivo de modal-motivo-denuncia.tsx.

interface ModalConsultarConfiguracaoProps {
  configuracao: ConfiguracoesResponse;
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
        <RodapeAcoes aoCancelar={aoFechar} rotuloCancelar="Fechar" />
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
  configuracao: ConfiguracoesResponse;
  aoFechar: () => void;
  aoAtualizado: () => void;
}

// `chave`/`tipo` não aparecem editáveis (só leitura) porque
// AtualizarConfiguracaoRequestDto (Nest) não os aceita - imutáveis depois
// de criada a linha, só valor/descricao/ativo/publica podem mudar.
export function ModalAlterarConfiguracao({ auth, configuracao, aoFechar, aoAtualizado }: ModalAlterarConfiguracaoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast();
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [valor, setValor] = useState(configuracao.valor ?? '');
  const [descricao, setDescricao] = useState(configuracao.descricao ?? '');
  const [ativo, setAtivo] = useState(configuracao.ativo);
  const [publica, setPublica] = useState(configuracao.publica);
  const par = parMinMaxDaConfiguracao(configuracao.chave);

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
    await executarEnviando(async () => {
      await configuracoesApi.atualizar(auth.authFetch, configuracao.idConfig, { valor, descricao, ativo, publica });
      mostrar('Parâmetro alterado com sucesso.', `ID: ${configuracao.idConfig} foi alterado`);
      aoAtualizado();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo={`Alterar "${configuracao.chave}"`}
      aoFechar={fechar}
      rodape={
        <RodapeAcoes
          aoCancelar={fechar}
          acao={{
            rotulo: 'Salvar',
            rotuloOcupado: 'Salvando...',
            ocupado: enviando,
            desabilitado: !sujo,
            aoClicar: () => void aoSalvar(),
          }}
        />
      }
      erro={erro}
    >
      <SecaoFicha titulo="Dados">
        <CampoSomenteLeitura rotulo="Chave" valor={configuracao.chave} />
        <CampoSomenteLeitura rotulo="Tipo" valor={configuracao.tipo} />
      </SecaoFicha>

      <SecaoFicha titulo="Editar">
        <div className="sm:col-span-2">
          <Campo rotulo="Valor" erro={errosCampo.valor}>
            {({ atributos }) => (
              <input
                {...atributos}
                type="text"
                value={valor}
                onChange={(evento) => {
                  setValor(evento.target.value);
                  limparErroCampo('valor');
                }}
                className="input-padrao"
              />
            )}
          </Campo>
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

        <Campo rotulo="Descrição" erro={errosCampo.descricao} className="sm:col-span-2">
          {({ atributos }) => (
            <input
              {...atributos}
              type="text"
              value={descricao}
              onChange={(evento) => {
                setDescricao(evento.target.value);
                limparErroCampo('descricao');
              }}
              className="input-padrao"
            />
          )}
        </Campo>

        <div>
          <CaixaMarcacao
            rotulo="Ativo"
            marcado={ativo}
            aoMudar={setAtivo}
            desabilitado={configuracao.idUsuario === null}
          />
          {configuracao.idUsuario === null && (
            <p className="text-xs texto-fraco mt-1">
              Parâmetro global não se desativa nem se exclui: faz parte do contrato do sistema. Para desligar
              uma regra, mude o valor.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <CaixaMarcacao rotulo="Pública" marcado={publica} aoMudar={setPublica} />
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
