// tsconfig.json maps "@lingui/react/macro" to this file, for type checking only.
// Lingui types its JSX macros as components that return ReactNode, which @types/react 17
// does not accept as a JSX element type. React 17 renders them fine, so these are the same
// declarations as node_modules/@lingui/react/macro/index.d.mts with a return type that
// @types/react 17 accepts. Remove this file and the mapping once we are on @types/react 18.
import type { ReactElement, ReactNode } from "react";
import type { TransRenderCallbackOrComponent, I18nContext } from "@lingui/react";
import type { MacroMessageDescriptor, LabeledExpression } from "@lingui/core/macro";
import type { MessageId } from "@lingui/core";

type CommonProps = TransRenderCallbackOrComponent & {
  id?: MessageId;
  comment?: string;
  context?: string;
};

type TransChildren = ReactNode | LabeledExpression<string | number>;
type TransProps = {
  children: TransChildren | TransChildren[];
} & CommonProps;

type PluralChoiceProps = {
  value: string | number | LabeledExpression<string | number>;
  offset?: number;
  zero?: ReactNode;
  one?: ReactNode;
  two?: ReactNode;
  few?: ReactNode;
  many?: ReactNode;
  other: ReactNode;
  [digit: `_${number}`]: ReactNode;
} & CommonProps;

type SelectChoiceProps = {
  value: string | LabeledExpression<string | number>;
  other: ReactNode;
  [option: `_${string}`]: ReactNode;
} & CommonProps;

export const Trans: (props: TransProps) => ReactElement | null;
export const Plural: (props: PluralChoiceProps) => ReactElement | null;
export const SelectOrdinal: (props: PluralChoiceProps) => ReactElement | null;
export const Select: (props: SelectChoiceProps) => ReactElement | null;

export function useLingui(): Omit<I18nContext, "_"> & {
  t: {
    (descriptor: MacroMessageDescriptor): string;
    (literals: TemplateStringsArray, ...placeholders: any[]): string;
  };
};
