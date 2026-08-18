import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';

// Convenção de código (mesma ideia de REGEX_CODIGO_VALIDO em
// criar-tipo-link.jsx) — PREFIXO-NNN, igual todo `codigo` já seedado
// (CAMP-001..008, PERF-001..004 — ver 07_seed_dados.sql [07-C-3]). Mais
// permissiva que a de tipo_link.codigo (aceita hífen também) pra caber
// esse padrão. Mesma validação de CriarMotivoDenunciaRequestDto (Nest),
// duplicada aqui só pra dar feedback ANTES de bater no backend.
const REGEX_CODIGO_VALIDO = /^[A-Z0-9_-]+$/;

export function CriarMotivoDenuncia({ auth }) {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  // tipo_motivo_denuncia NOT NULL, sem default no banco — sem opção
  // pré-selecionada aqui de propósito, pra forçar uma escolha consciente
  // (diferente de permitePerfil em CriarTipoLink, que tinha um valor mais
  // comum óbvio pra vir marcado).
  const [tipo, setTipo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const codigoInvalido = codigo.length > 0 && !REGEX_CODIGO_VALIDO.test(codigo);

  const aoCriar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const motivoCriado = await motivoDenunciaApi.criar(auth.authFetch, {
        codigo,
        ...(descricao ? { descricao } : {}),
        tipo,
      });
      mostrar(
        'Motivo de denúncia cadastrado com sucesso.',
        `O novo motivo possui o ID: ${motivoCriado.idMotivo}`,
      );
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-flag"
      titulo="Criar Motivo de Denúncia"
      subtitulo="Preencha os dados abaixo para cadastrar um novo motivo de denúncia."
    >
      <form onSubmit={aoCriar} className="p-10 space-y-6">
        {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

        <div>
          <label className="rotulo-campo">Código</label>
          <input
            type="text"
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value.toUpperCase())}
            required
            maxLength={20}
            placeholder="ex.: CAMP-009"
            aria-invalid={codigoInvalido}
            className={'input-padrao font-mono' + (codigoInvalido ? ' border-red-500' : '')}
          />
          {codigoInvalido ? (
            <p className="text-xs text-red-600 font-semibold mt-1">
              Só letras maiúsculas, números, underscore e hífen — sem espaço, minúscula ou
              acento.
            </p>
          ) : (
            <p className="text-xs texto-fraco mt-1">
              Identificador interno, nunca editável depois de criado. A descrição abaixo é o
              texto exibido pra quem for escolher este motivo na tela de denúncia.
            </p>
          )}
        </div>

        <div>
          <label className="rotulo-campo">Tipo</label>
          <select
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value)}
            required
            className="input-padrao"
          >
            <option value="" disabled>
              Selecione...
            </option>
            <option value="campanha">Campanha</option>
            <option value="perfil">Perfil</option>
          </select>
          <p className="text-xs texto-fraco mt-1">
            Decide em qual tela de denúncia (de campanha ou de perfil) este motivo aparece como
            opção — a validação é garantida pelo próprio banco na hora de gravar a denúncia.
          </p>
        </div>

        <div>
          <label className="rotulo-campo">Descrição (opcional)</label>
          <input
            type="text"
            value={descricao}
            onChange={(evento) => setDescricao(evento.target.value)}
            maxLength={255}
            placeholder="ex.: Campanha com informações falsas ou enganosas"
            className="input-padrao"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando || codigoInvalido || tipo === ''}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>
    </CartaoFormulario>
  );
}
