import { useId, useState } from 'react';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import type { ConfiguracaoResponse, TipoConfiguracao } from '../../services/11-configuracoes/type/configuracao.type';

// Convenção de chave (10-08-2026) - minúsculas, número e underscore, sem
// espaço nem acento. Mesma convenção que toda chave já cadastrada no seed
// segue (07_seed_dados.sql).
const REGEX_CHAVE_VALIDA = /^[a-z0-9_]+$/;

// `<select>` só tem essas 4 opções fixas - guarda de tipo em vez de `as`
// pra provar ao TypeScript que o valor cru do DOM (sempre `string`) é um
// `TipoConfiguracao` de verdade antes de guardar no estado.
function ehTipoConfiguracao(valor: string): valor is TipoConfiguracao {
  return valor === 'decimal' || valor === 'inteiro' || valor === 'texto' || valor === 'booleano';
}

interface ModalCriarConfiguracaoProps {
  auth: Pick<UseAuthReturn, 'authFetch'>;
  aoFechar: () => void;
  aoCriado: (configuracaoCriada: ConfiguracaoResponse) => void;
}

// Criar - migrado de página pra modal (14-09-2026, continuação da
// migração CRUD→Modal pedida pelo Lucas). Mesmo conteúdo/mesmas
// validações de antes (widget de valor muda de cara conforme o tipo).
export function ModalCriarConfiguracao({ auth, aoFechar, aoCriado }: ModalCriarConfiguracaoProps) {
  const { mostrar } = useToast();
  const { erro, reportarErro, limparErro } = useErroToast();
  const [chave, setChave] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<TipoConfiguracao | ''>('');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);

  const chaveInvalida = chave.length > 0 && !REGEX_CHAVE_VALIDA.test(chave);
  // aria-describedby (23-09-2026): ver modal-criar-area-conhecimento.tsx.
  const idMensagemChave = useId();

  const aoCriar = async () => {
    if (tipo === '' || chaveInvalida || chave.trim() === '') return;
    limparErro();
    setEnviando(true);
    try {
      // Decimal aceita vírgula na digitação (convenção pt-BR) - convertida
      // pra ponto só aqui, na hora de enviar (config_numero() exige ponto).
      const valorParaEnviar = tipo === 'decimal' ? valor.replace(',', '.') : valor;
      const configuracaoCriada = await configuracaoApi.criar(auth.authFetch, {
        chave,
        valor: valorParaEnviar,
        tipo,
        descricao,
      });
      mostrar(
        'Parâmetro cadastrado com sucesso.',
        `O novo parâmetro possui o ID: ${configuracaoCriada.idConfig}`,
      );
      aoCriado(configuracaoCriada);
      aoFechar();
    } catch (erroRequisicao) {
      reportarErro(erroRequisicao);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ModalFicha
      titulo="Criar Parâmetro"
      subtitulo="Preencha os dados abaixo para cadastrar um novo parâmetro."
      aoFechar={aoFechar}
      rodape={
        <div className="flex gap-3 max-w-sm ml-auto">
          <button type="button" onClick={aoFechar} className="btn btn-secondary flex-1">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void aoCriar()}
            disabled={enviando || chaveInvalida || chave.trim() === ''}
            className="btn btn-primary flex-1"
          >
            {enviando ? 'Criando...' : 'Criar'}
          </button>
        </div>
      }
    >
      {erro && <p className="texto-erro text-sm font-bold text-center">{erro}</p>}

      {/* Aviso honesto (10-08-2026) - criar uma chave pelo painel não faz o
          sistema passar a usá-la sozinho. */}
      <div className="flex items-start gap-2 rounded-lg fundo-info texto-info p-3">
        <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
        <p className="text-xs">
          Criar uma chave nova aqui não faz o sistema passar a usá-la sozinho - só tem efeito
          se algum código já consultar essa chave específica. Serve pra ajustar um valor que
          já é lido de algum lugar (taxa, limite, prazo), não pra criar comportamento novo.
        </p>
      </div>

      <div>
        <label className="rotulo-campo">Chave</label>
        <input
          type="text"
          value={chave}
          onChange={(evento) => setChave(evento.target.value)}
          required
          placeholder="ex.: limite_campanhas_simultaneas"
          aria-invalid={chaveInvalida}
          aria-describedby={idMensagemChave}
          className={'input-padrao font-mono' + (chaveInvalida ? ' borda-erro' : '')}
        />
        {chaveInvalida ? (
          <p id={idMensagemChave} className="text-xs texto-erro font-semibold mt-1">
            Só letras minúsculas, números e underscore - sem espaço, maiúscula ou acento.
          </p>
        ) : (
          <p id={idMensagemChave} className="text-xs texto-fraco mt-1">
            Minúsculas, números e underscore (_), sem espaço nem acento.
          </p>
        )}
      </div>

      <div>
        <label className="rotulo-campo">Tipo</label>
        <select
          value={tipo}
          onChange={(evento) => {
            if (ehTipoConfiguracao(evento.target.value)) {
              setTipo(evento.target.value);
              setValor('');
            }
          }}
          required
          className="input-padrao"
        >
          <option value="" disabled>
            Selecione...
          </option>
          <option value="decimal">Decimal</option>
          <option value="inteiro">Inteiro</option>
          <option value="texto">Texto</option>
          <option value="booleano">Booleano</option>
        </select>
      </div>

      <div>
        <label className="rotulo-campo">Valor</label>
        {tipo === 'booleano' ? (
          <button
            type="button"
            role="switch"
            aria-checked={valor === 'true'}
            onClick={() => setValor(valor === 'true' ? 'false' : 'true')}
            className={
              'w-14 h-8 rounded-full relative transition-colors shrink-0 ' +
              (valor === 'true' ? 'fundo-marca' : 'fundo-sutil border borda-forte')
            }
          >
            <span
              className={
                'absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ' +
                (valor === 'true' ? 'translate-x-7' : 'translate-x-1')
              }
            ></span>
          </button>
        ) : tipo === 'inteiro' ? (
          <input
            type="number"
            step="1"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
            placeholder="ex.: 5"
            className="input-padrao"
          />
        ) : tipo === 'decimal' ? (
          <>
            <input
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(evento) => setValor(evento.target.value)}
              placeholder="ex.: 12,5"
              className="input-padrao"
            />
            <p className="text-xs texto-fraco mt-1">Use vírgula como separador decimal.</p>
          </>
        ) : (
          <input
            type="text"
            value={valor}
            onChange={(evento) => setValor(evento.target.value)}
            disabled={tipo === ''}
            placeholder={tipo === '' ? 'Escolha o tipo primeiro' : undefined}
            className="input-padrao disabled:opacity-60 disabled:cursor-not-allowed"
          />
        )}
      </div>

      <div>
        <label className="rotulo-campo">Descrição</label>
        <input
          type="text"
          value={descricao}
          onChange={(evento) => setDescricao(evento.target.value)}
          className="input-padrao"
        />
      </div>
    </ModalFicha>
  );
}
