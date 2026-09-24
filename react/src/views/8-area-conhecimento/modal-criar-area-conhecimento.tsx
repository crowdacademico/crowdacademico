import { useEffect, useId, useState } from 'react';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { LIMITE_NOME_AREA_CONHECIMENTO } from '../../services/8-area-conhecimento/constants/area-conhecimento.constants';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { AreaConhecimentoResponse } from '../../services/8-area-conhecimento/type/area-conhecimento.type';

// Formato oficial do código CNPq (grande área.área.subárea.especialidade,
// sempre 2 dígitos por nível, ex.: '1.03.00.00').
const REGEX_CODIGO_CNPQ = /^\d{1,2}\.\d{2}\.\d{2}\.\d{2}$/;

interface ModalCriarAreaConhecimentoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  aoFechar: () => void;
  aoCriado: (areaCriada: AreaConhecimentoResponse) => void;
}

// Criar - migrado de página pra modal (14-09-2026, continuação da
// migração CRUD→Modal pedida pelo Lucas).
export function ModalCriarAreaConhecimento({ auth, aoFechar, aoCriado }: ModalCriarAreaConhecimentoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [codigoCnpq, setCodigoCnpq] = useState('');
  const [nome, setNome] = useState('');
  const [idPai, setIdPai] = useState('');
  const [grandesAreas, setGrandesAreas] = useState<AreaConhecimentoResponse[]>([]);
  const [carregandoGrandesAreas, setCarregandoGrandesAreas] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Combo "Grande área" só lista raízes de verdade (`raiz: true`) - a
  // mesma regra que area-conhecimento.service.create.ts confere no INSERT
  // já fica garantida por construção aqui.
  useEffect(() => {
    areaConhecimentoApi
      .listar(auth.authFetch, { raiz: true, ativo: true })
      .then(setGrandesAreas)
      .catch(reportarErro)
      .finally(() => setCarregandoGrandesAreas(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const codigoInvalido = codigoCnpq.length > 0 && !REGEX_CODIGO_CNPQ.test(codigoCnpq);
  // `aria-describedby` (23-09-2026): liga o campo ao <p> que explica o
  // porquê, seja o erro ou a ajuda - sem isso o leitor de tela anunciava
  // "inválido" sem dizer o que fazer. useId() evita colidir se 2 modais
  // iguais abrirem ao mesmo tempo.
  const idMensagemCodigo = useId();
  const idCodigo = useId();
  const idNome = useId();
  const idPaiCampo = useId();

  const aoCriar = async () => {
    if (codigoInvalido || codigoCnpq.trim() === '' || nome.trim() === '') return;
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
      aoCriado(areaCriada);
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalFicha
      titulo="Criar Área de Conhecimento"
      subtitulo="Preencha os dados abaixo para cadastrar uma nova área do conhecimento."
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void aoCriar()}
            disabled={enviando || codigoInvalido || codigoCnpq.trim() === '' || nome.trim() === ''}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      <div>
        <label htmlFor={idCodigo} className="rotulo-campo">Código CNPq</label>
        <input
          id={idCodigo}
          type="text"
          value={codigoCnpq}
          onChange={(evento) => setCodigoCnpq(evento.target.value)}
          required
          placeholder="ex.: 1.03.00.00"
          aria-invalid={codigoInvalido}
          aria-describedby={idMensagemCodigo}
          className={'input-padrao font-mono' + (codigoInvalido ? ' borda-erro' : '')}
        />
        {codigoInvalido ? (
          <p id={idMensagemCodigo} className="text-xs texto-erro font-semibold mt-1">
            Precisa seguir o formato do CNPq: 4 níveis de 2 dígitos separados por ponto (ex.:
            "1.03.00.00").
          </p>
        ) : (
          <p id={idMensagemCodigo} className="text-xs texto-fraco mt-1">
            Formato de classificação utilizado pelo CNPq - grande área.área.subárea.especialidade.
          </p>
        )}
      </div>

      <div>
        <label htmlFor={idNome} className="rotulo-campo">Nome</label>
        <input
          id={idNome}
          type="text"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          required
          maxLength={LIMITE_NOME_AREA_CONHECIMENTO}
          className="input-padrao"
        />
      </div>

      <div>
        <label htmlFor={idPaiCampo} className="rotulo-campo">Grande área (pai)</label>
        <select
          id={idPaiCampo}
          value={idPai}
          onChange={(evento) => setIdPai(evento.target.value)}
          disabled={carregandoGrandesAreas}
          className="input-padrao"
        >
          <option value="">- Nenhuma (esta é uma grande área raiz) -</option>
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
    </ModalFicha>
  );
}
