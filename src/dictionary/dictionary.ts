import { Functionary, Rule, RuleType } from './index.js';
import { NodeType } from '../types.js';

const rules: Rule[] = [
    {
        name: 'imports-keyword',
        type: 'keyword',
        default: 'import',
        conflicts:[]
    },
    {
        name: 'function-value-return-enabled',
        type: 'boolean',
        default: false,
        conflicts:[]
    },
    {
        name: 'function-value-return-keyword',
        type: 'keyword',
        default: 'return',
        conflicts:[]
    },
    {
        name: 'enforce-single-string-quotes',
        type: 'boolean',
        default: false,
        conflicts:['enforge-double-string-quotes']
    },
    {
        name: 'enforce-double-string-quotes',
        type: 'boolean',
        default: false,
        conflicts:['enforce-single-string-quotes']
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
    export const ExportableNodeTypes: NodeType[] = [NodeType.Function,NodeType.Operator,NodeType.Keyword,NodeType.Rule,NodeType.Global];
    export const StatementTypesWithBody: NodeType[] = [NodeType.Operator,NodeType.Function,NodeType.Global];

}