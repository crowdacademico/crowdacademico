import { useState } from 'react';
import { SecaoFicha } from '../../components/crud/ficha-consulta';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { RodapeAcoes } from '../../components/crud/rodape-acoes';
import { useFecharComAviso } from '../../components/crud/use-alteracao-nao-salva';
import { Campo } from '../../components/input/campo';
import { InputDinheiro } from '../../components/input/input-dinheiro';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { recompensaApi } from '../../services/18-recompensa/api/recompensa.api';
import { useEnvio } from '../../services/constant/hook/use-envio';
import { useErrosFormulario } from '../../services/constant/hook/use-erros-formulario';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { RecompensaResponse } from '../../services/18-recompensa/type/recompensa.type';

interface ModalRecompensaProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  idCampanha: number;
  // Sem ela: oferecer o mural. Com ela: alterar.
  recompensa?: RecompensaResponse;
  // Já tem alguém no mural: o valor mínimo não muda e a recompensa não é desativada (o banco recusa, 91067).
  travada?: boolean;
  // Criar pelo Estúdio: a campanha é escolhida aqui dentro (só as que ainda não têm mural).
  campanhasParaEscolher?: { idCampanha: number; titulo: string }[];
  aoFechar: () => void;
  aoSalva: () => void;
}

// A recompensa da campanha = o Mural dos apoiadores (22-11-2026, RF-103 a RF-105): o valor que a pessoa precisa somar
// nas contribuições para entrar, e uma mensagem de agradecimento opcional. Uma por campanha.
export function ModalRecompensa({ auth, idCampanha, recompensa, travada = false, campanhasParaEscolher, aoFechar, aoSalva }: ModalRecompensaProps) {
  const [idCampanhaEscolhida, setIdCampanhaEscolhida] = useState(campanhasParaEscolher?.[0]?.idCampanha ?? idCampanha);
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast({ mostraTexto: true });
  const { ocupado, executar } = useEnvio(reportarErro, limparErro);
  const [valorMinimo, setValorMinimo] = useState(recompensa ? String(recompensa.valorMinimo) : '');
  const [descricao, setDescricao] = useState(recompensa?.descricao ?? '');
  const [ativo, setAtivo] = useState(recompensa?.ativo ?? true);

  const { erroDe, tentarEnviar } = useErrosFormulario(() => ({
    valorMinimo: !(Number(valorMinimo) > 0) && 'Informe um valor mínimo maior que zero.',
  }));

  const salvar = async () => {
    if (!tentarEnviar()) return;
    await executar(async () => {
      if (recompensa) {
        await recompensaApi.alterar(auth.authFetch, recompensa.idRecompensa, {
          descricao: descricao.trim() || null,
          ...(travada ? {} : { valorMinimo: Number(valorMinimo) }),
          ...(ativo !== recompensa.ativo ? { ativo } : {}),
        });
        mostrar('Mural dos apoiadores alterado.');
      } else {
        await recompensaApi.criar(auth.authFetch, {
          idCampanha: idCampanhaEscolhida,
          valorMinimo: Number(valorMinimo),
          descricao: descricao.trim() || null,
        });
        mostrar('Mural dos apoiadores criado.', 'Quem apoiar a partir do valor mínimo aparece na página da campanha.');
      }
      aoSalva();
      aoFechar();
    });
  };

  const sujo = recompensa
    ? Number(valorMinimo) !== recompensa.valorMinimo || descricao !== (recompensa.descricao ?? '') || ativo !== recompensa.ativo
    : valorMinimo !== '' || descricao !== '';
  const fechar = useFecharComAviso(sujo, aoFechar);

  return (
    <ModalFicha
      titulo={recompensa ? 'Alterar Recompensa' : 'Nova Recompensa'}
      subtitulo="Mural dos apoiadores"
      aoFechar={fechar}
      erro={erro}
      rodape={
        <RodapeAcoes
          aoCancelar={fechar}
          acao={{ rotulo: recompensa ? 'Salvar' : 'Criar', rotuloOcupado: 'Salvando...', ocupado, aoClicar: () => void salvar() }}
        />
      }
    >
      <SecaoFicha titulo="Mural dos apoiadores">
        <p className="sm:col-span-2 legenda texto-fraco">
          Quem somar, nas contribuições à campanha, pelo menos o valor mínimo aparece com o nome e a foto no Mural dos
          apoiadores da página da campanha. Quem apoiar como anônimo aparece sem nome.
        </p>
        {!recompensa && campanhasParaEscolher && campanhasParaEscolher.length > 0 && (
          <Campo obrigatorio rotulo="Campanha" className="sm:col-span-2">
            {({ atributos }) => (
              <select
                {...atributos}
                value={idCampanhaEscolhida}
                onChange={(evento) => setIdCampanhaEscolhida(Number(evento.target.value))}
                className="input-padrao"
              >
                {campanhasParaEscolher.map((campanha) => (
                  <option key={campanha.idCampanha} value={campanha.idCampanha}>
                    {campanha.titulo}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        )}
        <Campo
          obrigatorio
          rotulo="Valor mínimo"
          erro={erroDe('valorMinimo')}
          dica={travada ? 'Já tem gente no mural: o valor mínimo não muda mais.' : undefined}
        >
          {({ atributos, classeErro }) => (
            <InputDinheiro {...atributos} valor={valorMinimo} aoMudar={setValorMinimo} disabled={travada} className={'input-padrao' + classeErro} />
          )}
        </Campo>
        <Campo rotulo="Mensagem de agradecimento (opcional)" className="sm:col-span-2">
          {({ atributos }) => (
            <textarea {...atributos} rows={3} value={descricao} onChange={(evento) => setDescricao(evento.target.value)} className="input-padrao" />
          )}
        </Campo>
        {recompensa && !travada && (
          <label className="sm:col-span-2 flex items-start gap-3 cursor-pointer paragrafo texto-padrao">
            <input type="checkbox" checked={ativo} onChange={(evento) => setAtivo(evento.target.checked)} className="mt-1 w-4 h-4 accent-primary" />
            <span>
              <span className="enfase texto-forte">Mural ativo</span>
              <span className="block legenda texto-fraco">Desmarcado, o mural some da página da campanha.</span>
            </span>
          </label>
        )}
      </SecaoFicha>
    </ModalFicha>
  );
}
