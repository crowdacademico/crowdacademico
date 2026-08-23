// Decorator de class-validator pro DTO de perfil-pesquisador — primeiro
// validador customizado do projeto (os outros módulos usavam só decorators
// prontos do class-validator: @IsEmail, @IsString etc.). Só valida FORMATO
// (dígito verificador), não existência real — ver cpf-validador.util.ts.
import { registerDecorator, ValidationOptions } from 'class-validator';
import { cpfEhValido } from './cpf-validador.util';

export function IsCpf(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCpf',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && cpfEhValido(value);
        },
        defaultMessage() {
          return 'CPF inválido.';
        },
      },
    });
  };
}
