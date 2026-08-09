import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { papelApi } from '../../services/2-papel-permissao/api/papel-permissao.api';

// Só existe (03-08-2026) porque `papel.codigo` (ver 01_extensoes_enums_
// tabelas.sql [01-B]) tornou seguro renomear um papel pelo painel — antes,
// 3 triggers de RBAC reconheciam 'admin'/'pesquisador'/'usuario' pelo TEXTO
// do nome, e renomear teria quebrado essas automações em silêncio. Agora
// as triggers leem `codigo` (nunca exposto/editável aqui), então `nome` (o
// rótulo) pode mudar livremente sem risco nenhum pro RBAC.
//
// Só "Alterar" existe pra papel (sem Consultar — a listagem já mostra
// id/nome, um 3º campo não ganharia nada; sem Excluir — apagar um papel
// usado em usuario_papel/papel_permissao é decisão maior, fora de escopo).
export function AlterarPapel({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [nome, setNome] = useState('');
  const [nomeOriginal, setNomeOriginal] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [encontrado, setEncontrado] = useState(false);

  useEffect(() => {
    // Não existe GET /papel/:id (só findall) — a lista inteira é pequena
    // (7 papéis), buscar tudo e filtrar pelo id é mais simples que criar
    // um endpoint novo só pra isso.
    papelApi
      .listar(auth.authFetch)
      .then((papeis) => {
        const papel = papeis.find((p) => String(p.idPapel) === id);
        if (papel) {
          setNome(papel.nome);
          setNomeOriginal(papel.nome);
          setEncontrado(true);
        }
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sujo = encontrado && nome !== nomeOriginal;
  useAvisoAlteracaoNaoSalva(sujo);

  const aoCancelar = () => {
    if (sujo && !window.confirm('Você tem alterações não salvas. Sair mesmo assim?')) {
      return;
    }
    navigate(-1);
  };

  const aoSalvar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      await papelApi.atualizar(auth.authFetch, id, { nome });
      mostrar('Papel alterado com sucesso.', `ID: ${id} foi alterado`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-user-tag"
      titulo="Alterar Papel"
      subtitulo="Só o nome exibido muda — o identificador interno usado pelas regras do sistema nunca é afetado."
      rodape={
        encontrado && (
          <div className="flex gap-3">
            <button type="button" onClick={aoCancelar} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              form="form-alterar-papel"
              disabled={enviando || !sujo}
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
      ) : !encontrado ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">
          {erro || `Papel ${id} não encontrado.`}
        </p>
      ) : (
        <form id="form-alterar-papel" onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <CampoSomenteLeitura rotulo="id" valor={id} />

          <div>
            <label className="rotulo-campo">
              Nome
            </label>
            <input
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              required
              maxLength={50}
              className="input-padrao"
            />
          </div>
        </form>
      )}
    </CartaoFormulario>
  );
}
