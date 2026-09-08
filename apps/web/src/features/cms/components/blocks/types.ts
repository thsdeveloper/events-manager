import type { ComponentType } from 'react';
import type { FieldErrors } from '../../api/client';

export interface BlockFieldsProps<State> {
	value: State;
	onChange: (value: State) => void;
	errors?: FieldErrors | null;
}

/**
 * Cada tipo de bloco descreve como converter o item da API em estado do
 * formulário e o estado de volta no payload validado pelo contrato.
 */
export interface BlockFormDefinition<Item, State> {
	Fields: ComponentType<BlockFieldsProps<State>>;
	fromItem: (item: Item | null) => State;
	toPayload: (state: State) => Record<string, unknown>;
}
