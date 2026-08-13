import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { CartaoFormulario } from '../../components/crud/cartao-formulario';
import { useErroToast } from '../../components/layout/use-erro-toast';
import { useToast } from '../../components/layout/use-toast';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';

// Formato oficial do código CNPq (grande área.área.subárea.especialidade,
// sempre 2 dígitos por nível, ex.: '1.03.00.00') — mesma validação de
// CriarAreaConhecimentoRequestDto (Nest), duplicada aqui só pra dar
// feedback ANTES de bater no backend, não pra substituir a validação de
// lá (mesma convenção de REGEX_CHAVE_VALIDA em criar-configuracao.jsx).
const REGEX_CODIGO_CNPQ = /^\d{1,2}\.\d{2}\.\d{2}\.\d{2}$/;

export function CriarAreaConhecimento({ auth }) {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [codigoCnpq, setCodigoCnpq] = useState('');
  const [nome, setNome] = useState('');
  const [idPai, setIdPai] = useState('');
  const [grandesAreas, setGrandesAreas] = useState([]);
  const [carregandoGrandesAreas, setCarregandoGrandesAreas] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Combo "Grande área" só lista raízes de verdade (`raiz: true`, vira
  // `?raiz=true` — ver ListarAreaConhecimentoQueryDto no backend). A
  // mesma regra que area-conhecimento.service.create.ts confere no INSERT
  // (idPai precisa ser uma grande área raiz, nunca outra área de nível 2)
  // já fica garantida por construção aqui: não dá pra escolher algo que
  // não seja raiz.
  useEffect(() => {
    areaConhecimentoApi
      .listar(auth.authFetch, { raiz: true, ativo: true })
      .then(setGrandesAreas)
      .catch(reportarErro)
      .finally(() => setCarregandoGrandesAreas(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Só valida depois que a pessoa digitou alguma coisa — mesmo raciocínio
  // de chaveInvalida em criar-configuracao.jsx.
  const codigoInvalido = codigoCnpq.length > 0 && !REGEX_CODIGO_CNPQ.test(codigoCnpq);

  const aoCriar = async (evento) => {
    evento.preventDefault();
    limparErro();
    setEnviando(true);
    try {
      const areaCriada = await areaConhecimentoApi.criar(auth.authFetch, {
        codigoCnpq,
        nome,
        ...(idPai ? { idPai: Number(idPai) } : {}),
      });
      mostrar(
        'Área de conhecimento cadastrada com sucesso.',
        `A nova área possui o ID: ${areaCriada.idAreaConhecimento}`,
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
      icone="fa-diagram-project"
      titulo="Criar Área de Conhecimento"
      subtitulo="Preencha os dados abaixo para cadastrar uma nova área do conhecimento."
    >
      <form onSubmit={aoCriar} className="p-10 space-y-6">
        {erro && <p className="text-red-700 text-sm font-bold text-center">{erro}</p>}

        <div>
          <label className="rotulo-campo">Código CNPq</label>
          <input
            type="text"
            value={codigoCnpq}
            onChange={(evento) => setCodigoCnpq(evento.target.value)}
            required
            placeholder="ex.: 1.03.00.00"
            aria-invalid={codigoInvalido}
            className={'input-padrao font-mono' + (codigoInvalido ? ' border-red-500' : '')}
          />
          {codigoInvalido ? (
            <p className="text-xs text-red-600 font-semibold mt-1">
              Precisa seguir o formato do CNPq: 4 níveis de 2 dígitos separados por ponto (ex.:
              "1.03.00.00").
            </p>
          ) : (
            <p className="text-xs texto-fraco mt-1">
              Formato oficial da tabela CNPq — grande área.área.subárea.especialidade.
            </p>
          )}
        </div>

        <div>
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

        <div>
          <label className="rotulo-campo">Grande área (pai)</label>
          <select
            value={idPai}
            onChange={(evento) => setIdPai(evento.target.value)}
            disabled={carregandoGrandesAreas}
            className="input-padrao"
          >
            <option value="">— Nenhuma (esta é uma grande área raiz) —</option>
            {grandesAreas.map((area) => (
              <option key={area.idAreaConhecimento} value={area.idAreaConhecimento}>
                {area.nome}
              </option>
            ))}
          </select>
          <p className="text-xs texto-fraco mt-1">
            Deixe em branco pra cadastrar uma grande área nova; escolha uma existente pra
            cadastrar uma área filha dela (a hierarquia tem só 2 níveis).
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando || codigoInvalido}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>
    </CartaoFormulario>
  );
}
