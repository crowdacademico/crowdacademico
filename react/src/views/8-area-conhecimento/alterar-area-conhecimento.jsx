import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { CampoSomenteLeitura } from '../../components/crud/campo-somente-leitura';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';

// `codigoCnpq`/"Grande área (pai)" não aparecem como campo editável (só
// leitura) porque AtualizarAreaConhecimentoRequestDto (Nest) não os
// aceita — são imutáveis depois de criada a linha: codigoCnpq é o
// identificador estável do catálogo CNPq (mesmo raciocínio de
// AlterarPapel sobre `papel.codigo`); idPai fica de fora por não existir
// checagem de ciclo/hierarquia no banco (ver comentário no DTO do
// backend). Só nome/ativo podem mudar.
export function AlterarAreaConhecimento({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [area, setArea] = useState(null);
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    areaConhecimentoApi
      .buscar(auth.authFetch, id)
      .then((dados) => {
        setArea(dados);
        setNome(dados.nome);
        setAtivo(dados.ativo);
      })
      .catch(reportarErro)
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sujo = area !== null && (nome !== area.nome || ativo !== area.ativo);
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
      await areaConhecimentoApi.atualizar(auth.authFetch, id, { nome, ativo });
      mostrar('Área de conhecimento alterada com sucesso.', `ID: ${id} foi alterada`);
      navigate(-1);
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <CartaoFormulario
      icone="fa-diagram-project"
      titulo="Alterar Área de Conhecimento"
      rodape={
        area && (
          <div className="flex gap-3">
            <button type="button" onClick={aoCancelar} className="btn btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              form="form-alterar-area-conhecimento"
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
      ) : !area ? (
        <p className="p-10 text-center text-red-700 text-sm font-bold">{erro}</p>
      ) : (
        <form id="form-alterar-area-conhecimento" onSubmit={aoSalvar} className="p-10 space-y-6">
          {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

          <div className="flex items-center gap-3 pb-4 border-b borda-padrao">
            <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
              <i className="fa-solid fa-diagram-project"></i>
            </div>
            <div className="min-w-0">
              <p className="font-bold texto-forte truncate font-mono text-sm">
                {area.codigoCnpq}
              </p>
              <p className="text-xs texto-fraco">
                Área de conhecimento #{area.idAreaConhecimento}
              </p>
            </div>
          </div>

          <SecaoFicha titulo="Dados">
            <CampoSomenteLeitura rotulo="Código CNPq" valor={area.codigoCnpq} />
            <CampoSomenteLeitura
              rotulo="Grande área (pai)"
              valor={area.nomePai ?? 'Nenhuma (é uma grande área raiz)'}
            />
          </SecaoFicha>

          <SecaoFicha titulo="Editar">
            <div className="sm:col-span-2">
              <label className="rotulo-campo">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                required
                maxLength={100}
                className="input-padrao"
              />
            </div>

            <label className="sm:col-span-2 flex items-center gap-2 text-sm font-semibold texto-padrao">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(evento) => setAtivo(evento.target.checked)}
              />
              Ativo
            </label>
          </SecaoFicha>
        </form>
      )}
    </CartaoFormulario>
  );
}
