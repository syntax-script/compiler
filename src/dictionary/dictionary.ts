import { Functionary, Rule, RuleType } from './index.js';

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

const regexes = { boolean: /^(true|false)$/, keyword: /[a-zA-Z]/ };

export namespace dictionary {

    export const Rules: Rule[] = rules;
    export const RuleTypeRegexes: Record<RuleType, RegExp> = regexes;
    export const PrimitiveTypes: string[] = ['int', 'decimal', 'boolean', 'string'];
    export const Keywords: string[] = ['export', 'rule', 'keyword', 'import', 'operator', 'function', 'global'];
    export const Functionaries: Functionary[] = func;

}