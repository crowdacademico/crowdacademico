import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TermoUsoResponse } from '../../services/5-termo-uso/type/termo-uso.type';

// Alterar SÓ funciona enquanto ninguém aceitou esta versão ainda (ver
// TermoUsoServiceAlterar, nest/) - o backend responde 409 caso contrário,
// e essa mensagem aparece aqui como qualquer outro erro de requisição
// (reportarErro), sem tentar adivinhar o estado de aceite no front antes
// de tentar salvar.
export function AlterarTermoUso({ auth }: PropsPagina) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [termo, setTermo] = useState<TermoUsoResponse | null>(null);
  const [versao, setVersao] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    termoUsoApi
      .buscar(auth.authFetch, Number(id))
      .then((dados) => {
        setTermo(dados);
        setVersao(dados.versao);
        setConteudo(dados.conteudo);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sujo = termo !== null && (versao !== termo.versao || conteudo !== termo.conteudo);
  useAvisoAlteracaoNaoSalva(sujo);

  const aoCancelar = () => {
    if (sujo && !window.confirm('Você tem alterações não salvas. Sair mesmo assim?')) {
      return;
    }
    void navigate(-1);
  };

  const aoSalvar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      await termoUsoApi.atualizar(auth.authFetch, Number(id), { versao, conteudo });
      mostrar('Termos de Uso alterado com sucesso.', `Versão "${versao}" foi atualizada.`);
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
      titulo="Alterar Termos de Uso"
      subtitulo="Só é possível enquanto ninguém tiver aceitado esta versão ainda. Depois do primeiro aceite, ela trava e a correção precisa virar uma versão nova."
      rodape={
        termo && (
          <div className="flex gap-3">
            <button type="button" onClick={aoCancelar} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              form="form-alterar-termo-uso"
              disabled={enviando || !sujo || !versao.trim() || !conteudo.trim()}
              className="btn btn-primary flex-1"
            >
              {enviando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )
      }
    >
      {carregando ? (
        <p className="p-10 text-center text-sm texto-fraco">Carregando...</p>
      ) : !termo ? (
        <p className="p-10 text-center texto-erro text-sm font-bold">{erro}</p>
      ) : (
        <form id="form-alterar-termo-uso" onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

          <SecaoFicha titulo="Dados">
            <CampoSomenteLeitura rotulo="Tipo" valor={ROTULO_TIPO_TERMO[termo.tipo]} />
          </SecaoFicha>

          <div>
            <label className="rotulo-campo">Versão</label>
            <input
              type="text"
              value={versao}
              onChange={(evento) => setVersao(evento.target.value)}
              required
              maxLength={20}
              className="input-padrao"
            />
          </div>

          <div>
            <label className="rotulo-campo">Texto completo</label>
            <textarea
              value={conteudo}
              onChange={(evento) => setConteudo(evento.target.value)}
              required
              rows={18}
              className="input-padrao font-mono text-xs"
            />
          </div>
        </form>
      )}
    </CartaoFormulario>
  );
}
