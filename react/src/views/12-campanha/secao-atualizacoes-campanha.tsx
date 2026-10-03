import { useEffect, useState } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { TabelaAtualizacoes } from '../../components/crud/tabelas/10-tabela-atualizacoes';
import { Campo } from '../../components/input/campo';
import { ContadorCaracteres } from '../../components/input/contador-caracteres';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { atualizacaoCampanhaApi } from '../../services/15-atualizacao-campanha/api/atualizacao-campanha.api';
import {
  ORDEM_FASE_ATUALIZACAO,
  ORDEM_TIPO_ATUALIZACAO,
  ROTULO_FASE_ATUALIZACAO,
  ROTULO_TIPO_ATUALIZACAO,
} from '../../services/15-atualizacao-campanha/constants/atualizacao-campanha.constants';
import { useConfiguracoes } from '../../services/11-configuracoes/hook/use-configuracoes';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import { contarCaracteres } from '../../services/constant/util/validacao.util';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';
import type { FaseAtualizacao, TipoAtualizacao } from '../../services/constant/type/enums-do-banco.gerado';
import { EstadoVazio } from '../../components/crud/estado-vazio';

interface SecaoAtualizacoesCampanhaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  // Campanha ativa, com sucesso ou não atingida (RF-051): só nelas o banco aceita atualização nova.
  podePublicar: boolean;
  // Dono: publica e oculta. Quem só lê (Consultar, quem segue): vê a lista, sem formulário nem ações.
  podeGerenciar?: boolean;
}

interface FormAtualizacao {
  titulo: string;
  conteudo: string;
  fase: FaseAtualizacao;
  tipo: TipoAtualizacao;
}

const FORM_VAZIO: FormAtualizacao = { titulo: '', conteudo: '', fase: ORDEM_FASE_ATUALIZACAO[0], tipo: ORDEM_TIPO_ATUALIZACAO[0] };

// Atualizações de progresso do dono da campanha (RF-051, RF-052): publicar (título, texto, fase e formato) e ocultar
// ou mostrar de novo. Elas aparecem na página pública da campanha, e quem segue a campanha recebe aviso por e-mail
// (RF-053, quando o módulo de e-mail existir).
export function SecaoAtualizacoesCampanha({ auth, idCampanha, podePublicar, podeGerenciar = true }: SecaoAtualizacoesCampanhaProps) {
  const [atualizacoes, setAtualizacoes] = useState<AtualizacaoCampanhaResponse[] | null>(null);
  const [form, setForm] = useState<FormAtualizacao>(FORM_VAZIO);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const { reportarErro } = useErroToast();
  const { mostrar } = useToast();
  const { ocupado, executar } = useEnvio(reportarErro);
  const limite = useConfiguracoes().obterNumero('limite_caracteres_conteudo_atualizacao', 5000);

  const erros = useErrosFormulario(() => ({
    titulo: form.titulo.trim() === '' && 'Informe o título.',
    conteudo:
      form.conteudo.trim() === ''
        ? 'Escreva o conteúdo.'
        : contarCaracteres(form.conteudo) > limite && `O conteúdo passou do limite de ${limite.toLocaleString('pt-BR')} caracteres.`,
  }));

  useEffect(() => {
    atualizacaoCampanhaApi.listar(auth.authFetch, idCampanha).then(setAtualizacoes).catch(reportarErro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, idCampanha, chaveRecarga]);

  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  const publicar = async () => {
    if (!erros.tentarEnviar()) return;
    await executar(async () => {
      await atualizacaoCampanhaApi.publicar(auth.authFetch, { idCampanha, ...form, titulo: form.titulo.trim() });
      mostrar('Atualização publicada.', 'Ela aparece na página da campanha.');
      setForm(FORM_VAZIO);
      erros.limpar();
      recarregar();
    });
  };

  const alternarAtivo = async (item: AtualizacaoCampanhaResponse) => {
    await executar(async () => {
      await atualizacaoCampanhaApi.alternarAtivo(auth.authFetch, item.idAtualizacao, !item.ativo);
      mostrar(item.ativo ? 'Atualização ocultada.' : 'Atualização visível de novo.');
      recarregar();
    });
  };

  if (atualizacoes === null) {
    return null;
  }

  return (
    <SecaoFicha titulo={`Atualizações (${atualizacoes.length})`} colunas={1}>
      {podeGerenciar && podePublicar && (
        <div className="space-y-3">
          <Campo rotulo="Título" erro={erros.erroDe('titulo')}>
            {({ atributos, classeErro }) => (
              <input
                {...atributos}
                type="text"
                maxLength={150}
                value={form.titulo}
                onChange={(evento) => setForm({ ...form, titulo: evento.target.value })}
                className={'input-padrao' + classeErro}
              />
            )}
          </Campo>
          <Campo rotulo="Conteúdo" erro={erros.erroDe('conteudo')}>
            {({ atributos, classeErro }) => (
              <>
                <textarea
                  {...atributos}
                  rows={4}
                  value={form.conteudo}
                  onChange={(evento) => setForm({ ...form, conteudo: evento.target.value })}
                  className={'input-padrao' + classeErro}
                />
                <ContadorCaracteres texto={form.conteudo} limite={limite} />
              </>
            )}
          </Campo>
          <div className="grid sm:grid-cols-2 gap-3">
            <Campo rotulo="Fase do projeto">
              {({ atributos }) => (
                <select
                  {...atributos}
                  value={form.fase}
                  onChange={(evento) => setForm({ ...form, fase: evento.target.value as FaseAtualizacao })}
                  className="input-padrao"
                >
                  {ORDEM_FASE_ATUALIZACAO.map((fase) => (
                    <option key={fase} value={fase}>
                      {ROTULO_FASE_ATUALIZACAO[fase]}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo rotulo="Formato">
              {({ atributos }) => (
                <select
                  {...atributos}
                  value={form.tipo}
                  onChange={(evento) => setForm({ ...form, tipo: evento.target.value as TipoAtualizacao })}
                  className="input-padrao"
                >
                  {ORDEM_TIPO_ATUALIZACAO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {ROTULO_TIPO_ATUALIZACAO[tipo]}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => void publicar()} disabled={ocupado} className="btn btn-primary">
              {ocupado ? 'Publicando...' : 'Publicar atualização'}
            </button>
          </div>
        </div>
      )}
      {atualizacoes.length === 0 ? (
        <EstadoVazio
          compacto
          icone="fa-bullhorn"
          titulo="Nenhuma atualização publicada ainda."
          texto={
            podeGerenciar && podePublicar
              ? 'Publique a primeira acima: é por aqui que quem apoia e quem segue acompanha a pesquisa.'
              : 'Quando o pesquisador publicar, a atualização aparece aqui.'
          }
        />
      ) : (
        <TabelaAtualizacoes atualizacoes={atualizacoes} aoAlternarAtivo={podeGerenciar ? (item) => void alternarAtivo(item) : undefined} />
      )}
    </SecaoFicha>
  );
}
