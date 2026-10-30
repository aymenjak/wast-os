export type ActionState = {
  ok?: boolean;
  error?: string;
  errorVars?: Record<string, unknown>;
  fields?: Record<string, string>;
  /** Free-form payload returned on success (e.g. a one-time invitation link). */
  data?: Record<string, string>;
  /** Changes on every submission so client components can react to repeated results. */
  nonce?: number;
};

export const initialState: ActionState = {};
