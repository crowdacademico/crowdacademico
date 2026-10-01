import { useState } from 'react';
import { CaixaTextoLongo } from '../../components/crud/caixa-texto-longo';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { ResumoAlteracoes } from '../../components/crud/resumo-alteracoes';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { confirmarSaida, useAvisoAlteracaoNaoSalva } from '../../components/crud/use-alteracao-nao-salva';
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
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { TipoTermo } from '../../services/5-termo-uso/type/termo-uso.type';

interface ModalCriarTermoUsoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  // Tipo já escolhido (ex.: "Publicar primeira versão" de Regras do Negócio sabe qual termo é).
  tipoInicial?: TipoTermo;
  aoFechar: () => void;
  aoCriado: () => void;
}

// Publicar versão NOVA: nasce como rascunho (`ativo = false`); um administrador revisa e só depois a torna vigente
// (botão "Tornar vigente" do Alterar). `tipo` não muda depois de criado (ver TermoUsoRequestUpdate).
//
// "Começar da vigente" copia o texto da versão vigente do tipo: uma versão nova quase sempre é a anterior
// corrigida. As versões já usadas aparecem na dica e a repetida é barrada aqui, antes do banco recusar.
export function ModalCriarTermoUso({ auth, tipoInicial = 'cadastro', aoFechar, aoCriado }: ModalCriarTermoUsoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro, errosCampo, limparErroCampo } = useErroToast({ mostraTexto: true });
  const { ocupado: enviando, executar: executarEnviando } = useEnvio(reportarErro, limparErro);
  const [tipo, setTipo] = useState<TipoTermo>(tipoInicial);
  const [versao, setVersao] = useState('');
  const [conteudo, setConteudo] = useState('');
  const { dado: todas } = useBuscar(() => termoUsoApi.listar(auth.authFetch), []);
  const doTipo = (todas ?? []).filter((linha) => linha.tipo === tipo);
  const vigente = doTipo.find((linha) => linha.ativo);
  const repetida = doTipo.some((linha) => linha.versao.trim().toLowerCase() === versao.trim().toLowerCase());

  const mudancas = [versao !== '' && 'versão', conteudo !== '' && 'texto'].filter((item) => item !== false);
  const sujo = mudancas.length > 0;
  useAvisoAlteracaoNaoSalva(sujo);
  const fechar = () => {
    if (confirmarSaida(sujo)) aoFechar();
  };

  // "Publicar" fica sempre clicável: clicando com algo faltando, cada campo mostra o próprio erro.
  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    versao: versao.trim() === '' ? 'Informe a versão.' : repetida && 'Esta versão já existe neste tipo.',
    conteudo: conteudo.trim() === '' && 'Cole ou digite o texto do Termo.',
  }));

  const comecarDaVigente = () => {
    if (!vigente) return;
    if (conteudo.trim() !== '' && !window.confirm('Trocar o texto atual pelo texto da versão vigente?')) return;
    setConteudo(vigente.conteudo);
    limparErroCampo('conteudo');
  };

  const aoCriar = async () => {
    if (!tentarEnviar()) return;
    await executarEnviando(async () => {
      const termoCriado = await termoUsoApi.criar(auth.authFetch, { tipo, versao, conteudo });
      mostrar(
        'Rascunho do Termo de Uso criado com sucesso.',
        `Versão "${termoCriado.versao}" (${ROTULO_TIPO_TERMO[tipo]}) foi registrada, mas ainda não é a vigente: revise o texto e torne-a vigente quando estiver pronta.`,
      );
      aoCriado();
      aoFechar();
    });
  };

  return (
    <ModalFicha
      titulo="Publicar Termo de Uso"
      ajuda="Cria um rascunho, que ainda não vale. A versão vigente do mesmo tipo continua valendo até um administrador tornar este rascunho vigente (no Alterar)."
      carregando={!todas}
      variasTelas
      aoFechar={fechar}
      rodape={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResumoAlteracoes mudancas={mudancas} />
          <div className="flex-1">
            <RodapeAcoes
              aoCancelar={fechar}
              acao={{
                rotulo: 'Publicar versão',
                rotuloOcupado: 'Publicando...',
                ocupado: enviando,
                aoClicar: () => void aoCriar(),
              }}
            />
          </div>
        </div>
      }
      erro={erro}
    >
      <div className="grid sm:grid-cols-2 gap-6">
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
          rotulo="Nome / Versão"
          erro={erroDe('versao') ?? errosCampo.versao}
          dica={
            doTipo.length
              ? `Já usadas neste tipo: ${doTipo.map((linha) => linha.versao).join(', ')}.`
              : 'Nenhuma versão publicada neste tipo ainda.'
          }
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
              maxLength={20}
              placeholder="ex.: v3"
              className="input-padrao"
            />
          )}
        </Campo>
      </div>

      <CaixaTextoLongo
        rotulo="Texto completo"
        tituloTelaCheia={versao.trim() ? `Versão ${versao.trim()}` : 'Nova versão'}
        valor={conteudo}
        aoMudar={(valor) => {
          setConteudo(valor);
          limparErroCampo('conteudo');
        }}
        erro={erroDe('conteudo') ?? errosCampo.conteudo}
        placeholder="Cole ou digite o texto integral do Termo desta versão..."
        extra={
          vigente && (
            <button type="button" onClick={comecarDaVigente} className="btn-pilula btn-pilula-rotulo">
              <i className="fa-solid fa-copy"></i> Começar da vigente <span className="normal-case">({vigente.versao})</span>
            </button>
          )
        }
      />
    </ModalFicha>
  );
}
