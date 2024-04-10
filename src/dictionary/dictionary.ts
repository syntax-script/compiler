import { Functionary, Rule } from './index';

const rules: Rule[] = [
    {
        name: 'imports-keyword',
        type: 'keyword',
        default: 'import'
    },
    {
        name: 'function-value-return-enabled',
        type: 'boolean',
        default: false
    },
    {
        name: 'function-value-return-keyword',
        type: 'keyword',
        default: 'return'
    }
];

const func: Functionary[] = [
    {
        name: 'compile',
        value: 'regex'
    },
    {
        name: 'imports',
        value: 'string'
    }
];

export namespace dictionary {

    export const Rules: Rule[] = rules;
    export const PrimitiveTypes: string[] = ['int', 'decimal', 'boolean', 'string'];
    export const Keywords: string[] = ['export', 'rule', 'keyword', 'import', 'operator', 'function', 'global'];
    export const Functionaries: Functionary[] = func;

}