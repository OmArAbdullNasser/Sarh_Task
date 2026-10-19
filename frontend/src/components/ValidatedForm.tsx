import { createContext, useContext, type FormEvent, type ComponentProps } from 'react';
import { useForm, get, type FieldErrors, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { useI18n, type TranslationKey } from '../lib/i18n';
const Errors = createContext<FieldErrors>({});
// Existing controlled fields remain the source of form values; RHF owns validation and errors.
export function ValidatedForm<T extends FieldValues>({
  schema,
  values,
  children,
  onSubmit,
  ...props
}: Omit<ComponentProps<'form'>, 'onSubmit'> & {
  schema: z.ZodType<T, T>;
  values: T;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  const {
    handleSubmit,
    formState: { errors },
    trigger,
  } = useForm<T>({
    resolver: zodResolver(schema),
    values,
    resetOptions: { keepErrors: true, keepIsSubmitted: true },
  });
  return (
    <Errors.Provider value={errors}>
      <form
        {...props}
        noValidate
        onSubmit={(event) => {
          void handleSubmit(() => onSubmit(event))(event);
        }}
        onBlur={(event) => {
          const name = event.target instanceof HTMLInputElement ? event.target.name : '';
          if (name && get(errors, name)) void trigger(name as import('react-hook-form').Path<T>);
        }}
      >
        {children}
      </form>
    </Errors.Provider>
  );
}
export function FieldError({ name }: { name: string }) {
  const { t } = useI18n();
  const error = get(useContext(Errors), name);
  return error?.message ? (
    <span className="field-error" id={`error-${name}`} role="alert">
      {t(error.message as TranslationKey)}
    </span>
  ) : null;
}

export function FormInput(props: ComponentProps<'input'>) {
  const error = get(useContext(Errors), props.name ?? '');
  return <input {...props} aria-invalid={!!error} />;
}
