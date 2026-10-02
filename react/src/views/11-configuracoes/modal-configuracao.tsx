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
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import type { ConfiguracoesResponse, TipoConfiguracao } from '../../services/11-configuracoes/type/configuracoes.type';

// O tipo do parâmetro na língua de quem usa, e o que o campo Valor aceita em cada um.
const ROTULO_TIPO_CONFIGURACAO: Record<TipoConfiguracao, string> = {
  inteiro: 'Número inteiro',
  decimal: 'Número com casas decimais',
  booleano: 'Sim ou não',
  texto: 'Texto',
};
const DICA_TIPO_CONFIGURACAO: Record<TipoConfiguracao, string | undefined> = {
  inteiro: 'Só números, sem vírgula nem ponto (ex.: 30).',
  decimal: 'Número com vírgula ou ponto para os centavos (ex.: 5,50).',
  booleano: undefined,
  texto: undefined,
};
const REGEX_VALOR: Partial<Record<TipoConfiguracao, RegExp>> = {
  inteiro: /^[0-9]+$/,
  decimal: /^[0-9]+([.,][0-9]+)?$/,
};

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
        <CampoFicha rotulo="Tipo" valor={ROTULO_TIPO_CONFIGURACAO[configuracao.tipo]} />
        <CampoFicha
          rotulo="Alcance"
          valor={configuracao.idUsuario === null ? 'Global (vale para todo o sistema)' : `Pessoal (conta ${configuracao.idUsuario})`}
          largura="cheia"
        />
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
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast({ mostraTexto: true });
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

  // O valor precisa combinar com o tipo; a vírgula dos centavos vira ponto, que é o que o banco guarda.
  const regexValor = REGEX_VALOR[configuracao.tipo];
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    valor: regexValor !== undefined && !regexValor.test(valor.trim()) && (DICA_TIPO_CONFIGURACAO[configuracao.tipo] ?? ''),
  }));

  const aoSalvar = async () => {
    if (!tentarEnviar()) return;
    const valorGravado = configuracao.tipo === 'decimal' ? valor.trim().replace(',', '.') : valor;
    await executarEnviando(async () => {
      await configuracoesApi.atualizar(auth.authFetch, configuracao.idConfig, { valor: valorGravado, descricao, ativo, publica });
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
        <CampoSomenteLeitura rotulo="Tipo" valor={ROTULO_TIPO_CONFIGURACAO[configuracao.tipo]} />
      </SecaoFicha>

      <SecaoFicha titulo="Editar">
        <div className="sm:col-span-2">
          <Campo rotulo="Valor" erro={erroDe('valor') ?? errosCampo.valor} dica={DICA_TIPO_CONFIGURACAO[configuracao.tipo]}>
            {({ atributos, classeErro }) =>
              configuracao.tipo === 'booleano' ? (
                <select
                  {...atributos}
                  value={valor}
                  onChange={(evento) => {
                    setValor(evento.target.value);
                    limparErroCampo('valor');
                  }}
                  className={'input-padrao' + classeErro}
                >
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              ) : (
                <input
                  {...atributos}
                  type="text"
                  inputMode={configuracao.tipo === 'texto' ? 'text' : configuracao.tipo === 'inteiro' ? 'numeric' : 'decimal'}
                  value={valor}
                  onChange={(evento) => {
                    setValor(evento.target.value);
                    limparErroCampo('valor');
                  }}
                  className={'input-padrao' + classeErro}
                />
              )
            }
          </Campo>
          {par && (
            <div className="legenda mt-2 flex items-start gap-2 rounded-lg fundo-aviso texto-aviso p-3">
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
            <p className="legenda texto-fraco mt-1">
              Parâmetro global não se desativa nem se exclui: faz parte do contrato do sistema. Para desligar
              uma regra, mude o valor.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <CaixaMarcacao rotulo="Pública" marcado={publica} aoMudar={setPublica} />
          <p className="legenda texto-fraco mt-1">
            Marcado: qualquer visitante do site pode ver este valor (por exemplo, a meta mínima, para a tela avisar
            antes de enviar). Desmarcado: só quem administra os parâmetros vê. Vale só para parâmetro global.
          </p>
        </div>
      </SecaoFicha>
    </ModalFicha>
  );
}
