import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { MensagemErro } from '../../components/crud/mensagem-erro';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { Campo } from '../../components/input/campo';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import {
  DESCRICAO_TIPO_TERMO,
  ROTULO_TIPO_TERMO,
  TIPOS_TERMO,
  ehTipoTermo,
} from '../../services/5-termo-uso/constants/termo-uso-tipos.constants';
import { useEnvio } from '../../services/constant/hook/use-envio';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TipoTermo } from '../../services/5-termo-uso/type/termo-uso.type';

// Publicar versão NOVA: fica registrada como RASCUNHO, `ativo = false` sempre. O fluxo real é criar o rascunho,
// a "staff" revisar (erro de português etc.), e SÓ DEPOIS um administrador tornar essa versão vigente
// manualmente em Regras do Negócio ou na listagem (ModalAlterarTermoUso tem o botão "Tornar vigente" para
// isso).
//
// `tipo`: campo obrigatório e imutável depois de criado (ver TermoUsoRequestUpdate). Aceita pré-seleção via
// `?tipo=upgrade_pesquisador` na URL: usado pelo link "Publicar nova versão" do card de Termo de Uso em Regras
// do Negócio, que já sabe qual termo o admin estava olhando.
const ID_FORMULARIO = 'form-criar-termo-uso';

export function CriarTermoUso({ auth }: PropsPagina) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast();
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const tipoPreSelecionado = searchParams.get('tipo');
  const [tipo, setTipo] = useState<TipoTermo>(
    ehTipoTermo(tipoPreSelecionado) ? tipoPreSelecionado : 'cadastro',
  );
  const [versao, setVersao] = useState('');
  const [conteudo, setConteudo] = useState('');

  const aoCriar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    await executarEnviando(async () => {
      const termoCriado = await termoUsoApi.criar(auth.authFetch, { tipo, versao, conteudo });
      mostrar(
        'Rascunho de Termos de Uso criado com sucesso.',
        `Versão "${termoCriado.versao}" (${ROTULO_TIPO_TERMO[tipo]}) foi registrada, mas AINDA NÃO é a vigente - revise o texto e torne-a vigente manualmente quando estiver pronta.`,
      );
      void navigate(-1);
    });
  };

  return (
    <CartaoFormulario
      icone="fa-file-contract"
      titulo="Publicar Termos de Uso"
      subtitulo="Cria um RASCUNHO novo (ainda não vigente). A versão vigente atual do mesmo tipo continua ativa até um administrador tornar este rascunho vigente manualmente."
    >
      <form id={ID_FORMULARIO} onSubmit={aoCriar} className="p-10 space-y-6">
        <MensagemErro texto={erro} />

        <Campo rotulo="Tipo" dica={<>Não pode ser alterado depois de publicado. {DESCRICAO_TIPO_TERMO[tipo]}</>}>
          {({ atributos }) => (
            <select
              {...atributos}
              value={tipo}
              onChange={(evento) => {
                if (ehTipoTermo(evento.target.value)) setTipo(evento.target.value);
              }}
              className="input-padrao"
            >
              {TIPOS_TERMO.map((valor) => (
                <option key={valor} value={valor}>
                  {ROTULO_TIPO_TERMO[valor]}
                </option>
              ))}
            </select>
          )}
        </Campo>

        <Campo
          rotulo="Versão"
          erro={errosCampo.versao}
          dica="Identificador curto da versão (até 20 caracteres), precisa ser diferente de toda versão já publicada antes DESTE MESMO TIPO (a mesma versão pode se repetir entre tipos diferentes)."
        >
          {({ atributos }) => (
            <input
              {...atributos}
              type="text"
              value={versao}
              onChange={(evento) => {
                setVersao(evento.target.value);
                limparErroCampo('versao');
              }}
              required
              maxLength={20}
              placeholder="ex.: v3"
              className="input-padrao"
            />
          )}
        </Campo>

        <Campo rotulo="Texto completo" erro={errosCampo.conteudo}>
          {({ atributos }) => (
            <textarea
              {...atributos}
              value={conteudo}
              onChange={(evento) => {
                setConteudo(evento.target.value);
                limparErroCampo('conteudo');
              }}
              required
              rows={18}
              placeholder="Cole ou digite o texto integral dos Termos de Uso desta versão..."
              className="input-padrao font-mono text-xs"
            />
          )}
        </Campo>

        <div className="pt-2">
          <RodapeAcoes
            aoCancelar={() => navigate(-1)}
            largura="cheia"
            acao={{
              rotulo: 'Publicar versão',
              rotuloOcupado: 'Publicando...',
              ocupado: enviando,
              desabilitado: !versao.trim() || !conteudo.trim(),
              formulario: ID_FORMULARIO,
            }}
          />
        </div>
      </form>
    </CartaoFormulario>
  );
}
