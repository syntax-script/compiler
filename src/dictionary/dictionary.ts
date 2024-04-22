import { Functionary, Rule, RuleType } from './index.js';
import { NodeType } from '../types.js';

const rules: Rule[] = [
    {
        name: 'imports-keyword',
        type: 'keyword',
        default: 'import',
        conflicts: [],
        description:'Determines which keyword should be used to import modules using defined in an imports statement.'
    },
    {
        name: 'function-value-return-enabled',
        type: 'boolean',
        default: false,
        conflicts: [],
        description: 'Determines whether is it possible to return a value from a function using a keyword.'
    },
    {
        name: 'function-value-return-keyword',
        type: 'keyword',
        default: 'return',
        conflicts: [],
        description: 'Determines the keyword used to return a function from a keyword. Must be used with `function-value-return-enabled` set to true to make a difference.'
    },
    {
        name: 'enforce-single-string-quotes',
        type: 'boolean',
        default: false,
        conflicts: ['enforge-double-string-quotes'],
        description: 'Enforces string values to have single quotes in output. Useful for languages like Java where quote type matters.'
    },
    {
        name: 'enforce-double-string-quotes',
        type: 'boolean',
        default: false,
        conflicts: ['enforce-single-string-quotes'],
        description: 'Enforces string values to have double quotes in output. Useful for languages like Java where quote type matters.'
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
    export const ExportableNodeTypes: NodeType[] = [NodeType.Function, NodeType.Operator, NodeType.Keyword, NodeType.Rule, NodeType.Global];
    export const StatementTypesWithBody: NodeType[] = [NodeType.Operator, NodeType.Function, NodeType.Global];

}