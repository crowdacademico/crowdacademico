import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO, TIPOS_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TipoTermo } from '../../services/5-termo-uso/type/termo-uso.type';

function ehTipoTermo(valor: string | null): valor is TipoTermo {
  return valor === 'cadastro' || valor === 'contribuicao';
}

// Publicar versão NOVA (13-09-2026, pedido do Lucas: "vamos acabar Termos
// de Uso por completo") - deliberadamente sem Alterar/Excluir (ver
// TermoUsoServiceCriar, nest/): versão publicada não muda depois, porque
// já pode ter gente aceitando ela. Corrigir errata ou trocar o texto de
// verdade é sempre criar uma versão nova, nunca editar a antiga - o banco
// desativa a anterior sozinho (uq_termos_uso_ativo) na mesma transação,
// só dentro do MESMO tipo (publicar uma versão de contribuição nunca
// desativa o termo de cadastro, e vice-versa).
//
// `tipo` (13-09-2026, separação em 2 termos ativos simultâneos) - campo
// obrigatório e imutável depois de criado (ver TermoUsoRequestAlterar).
// Aceita pré-seleção via `?tipo=contribuicao` na URL - usado pelo link
// "Publicar nova versão" do card de Termo de Uso em Regras do Negócio,
// que já sabe qual das 2 trilhas o admin estava olhando.
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

  const aoCriar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const termoCriado = await termoUsoApi.criar(auth.authFetch, { tipo, versao, conteudo });
      mostrar(
        'Nova versão dos Termos de Uso publicada com sucesso.',
        `Versão "${termoCriado.versao}" (${ROTULO_TIPO_TERMO[tipo]}) agora é a ativa - a anterior desse tipo foi desativada automaticamente.`,
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
      subtitulo="Cria uma versão nova. A versão atualmente ativa do MESMO tipo é desativada automaticamente - ela nunca é sobrescrita, só substituída."
    >
      <form onSubmit={aoCriar} className="p-10 space-y-6">
        {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

        <div>
          <label className="rotulo-campo">Tipo</label>
          <select
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
            campanha.
          </p>
        </div>

        <div>
          <label className="rotulo-campo">Versão</label>
          <input
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
          <label className="rotulo-campo">Texto completo</label>
          <textarea
            value={conteudo}
            onChange={(evento) => setConteudo(evento.target.value)}
            required
            rows={18}
            placeholder="Cole ou digite o texto integral dos Termos de Uso desta versão..."
            className="input-padrao font-mono text-xs"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando || !versao.trim() || !conteudo.trim()}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Publicando...' : 'Publicar versão'}
          </button>
        </div>
      </form>
    </CartaoFormulario>
  );
}
