import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { RodapeFormulario } from '../../components/crud/rodape-formulario';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO, TIPOS_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TipoTermo } from '../../services/5-termo-uso/type/termo-uso.type';

function ehTipoTermo(valor: string | null): valor is TipoTermo {
  return valor === 'cadastro' || valor === 'contribuicao' || valor === 'upgrade_pesquisador';
}

// Publicar versão NOVA (13-09-2026, pedido do Lucas: "vamos acabar Termos
// de Uso por completo") - fica registrada como RASCUNHO, `ativo = false`
// sempre (CORRIGIDO no mesmo dia, rodada seguinte: "não é assim que
// funciona" - Criar chegou a ativar automaticamente, desativando a versão
// anterior sozinho; o fluxo real é criar o rascunho, a "staff" revisar
// (erro de português etc.), e SÓ DEPOIS um administrador tornar essa
// versão vigente manualmente em Regras do Negócio ou na listagem -
// ModalAlterarTermoUso ganhou o botão "Tornar vigente" pra isso).
//
// `tipo` (13-09-2026, separação em termos ativos simultâneos por trilha) -
// campo obrigatório e imutável depois de criado (ver
// TermoUsoRequestAlterar). Aceita pré-seleção via `?tipo=contribuicao` na
// URL - usado pelo link "Publicar nova versão" do card de Termo de Uso em
// Regras do Negócio, que já sabe qual trilha o admin estava olhando.
export function CriarTermoUso({ auth }: PropsPagina) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const tipoPreSelecionado = searchParams.get('tipo');
  const [tipo, setTipo] = useState<TipoTermo>(
    ehTipoTermo(tipoPreSelecionado) ? tipoPreSelecionado : 'cadastro',
  );
  const [versao, setVersao] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const idTipo = useId();
  const idVersao = useId();
  const idConteudo = useId();

  const aoCriar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const termoCriado = await termoUsoApi.criar(auth.authFetch, { tipo, versao, conteudo });
      mostrar(
        'Rascunho de Termos de Uso criado com sucesso.',
        `Versão "${termoCriado.versao}" (${ROTULO_TIPO_TERMO[tipo]}) foi registrada, mas AINDA NÃO é a vigente - revise o texto e torne-a vigente manualmente quando estiver pronta.`,
      );
      void navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-file-contract"
      titulo="Publicar Termos de Uso"
      subtitulo="Cria um RASCUNHO novo (ainda não vigente). A versão vigente atual do mesmo tipo continua ativa até um administrador tornar este rascunho vigente manualmente."
    >
      <form onSubmit={aoCriar} className="p-10 space-y-6">
        {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

        <div>
          <label htmlFor={idTipo} className="rotulo-campo">Tipo</label>
          <select
            id={idTipo}
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as TipoTermo)}
            className="input-padrao"
          >
            {TIPOS_TERMO.map((valor) => (
              <option key={valor} value={valor}>
                {ROTULO_TIPO_TERMO[valor]}
              </option>
            ))}
          </select>
          <p className="text-xs texto-fraco mt-1">
            Não pode ser alterado depois de publicado. &quot;Cadastro&quot; é aceito uma vez, no
            cadastro da conta; &quot;Contribuição&quot; é aceito a cada contribuição a uma
            campanha; &quot;Upgrade Pesquisador&quot; é aceito ao solicitar o upgrade de perfil.
          </p>
        </div>

        <div>
          <label htmlFor={idVersao} className="rotulo-campo">Versão</label>
          <input
            id={idVersao}
            type="text"
            value={versao}
            onChange={(evento) => setVersao(evento.target.value)}
            required
            maxLength={20}
            placeholder="ex.: v3"
            className="input-padrao"
          />
          <p className="text-xs texto-fraco mt-1">
            Identificador curto da versão (até 20 caracteres) - precisa ser diferente de toda
            versão já publicada antes DESTE MESMO TIPO (a mesma versão pode se repetir entre
            tipos diferentes).
          </p>
        </div>

        <div>
          <label htmlFor={idConteudo} className="rotulo-campo">Texto completo</label>
          <textarea
            id={idConteudo}
            value={conteudo}
            onChange={(evento) => setConteudo(evento.target.value)}
            required
            rows={18}
            placeholder="Cole ou digite o texto integral dos Termos de Uso desta versão..."
            className="input-padrao font-mono text-xs"
          />
        </div>

        <div className="pt-2">
          <RodapeFormulario
            aoCancelar={() => navigate(-1)}
            desabilitado={enviando || !versao.trim() || !conteudo.trim()}
            enviando={enviando}
            textoAcao="Publicar versão"
            textoEnviando="Publicando..."
          />
        </div>
      </form>
    </CartaoFormulario>
  );
}
