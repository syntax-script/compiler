/**
 * A functionary that can be used inside other statements as a statement.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface Functionary {
    name: string;
    value:FunctionaryValueType;
}

/**
 * All types of the values you can pass in to a functionary
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export type FunctionaryValueType = 'regex' | 'string' | 'void';