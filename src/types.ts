import { CodeAction, Range } from 'lsp-types';

/**
 * Every token type a syntax script declaration file can contain. If something can't be recognized as a token,
 * it will be tokenized as {@link TokenType.Raw} to let strings include any character.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export enum TokenType {

    /**
     * `{`.
     */
    OpenBrace,

    /**
     * `}`.
     */
    CloseBrace,

    /**
     * `:::`.
     */
    DefinitionEnd,

    /**
     * `;`.
     */
    Semicolon,

    /**
     * `,`.
     */
    Comma,

    /**
     * `(`.
     */
    OpenParen,

    /**
     * `)`.
     */
    CloseParen,

    /**
     * `[`.
     */
    OpenSquare,

    /**
     * `]`.
     */
    CloseSquare,

    /**
     * `operator`.
     */
    OperatorKeyword,

    /**
     * `compile`.
     */
    CompileKeyword,

    /**
     * Anything alphabetical. Can be used for various purposes, such as referencing a keyword or a string value.
     */
    Identifier,

    /**
     * `<`.
     */
    OpenDiamond,

    /**
     * `>`.
     */
    CloseDiamond,

    /**
     * `+s`.
     */
    WhitespaceIdentifier,

    /**
     * Any numeric value that does not contain frictional digits, such as `3.14`.
     */
    IntNumber,

    /**
     * `'`.
     */
    SingleQuote,

    /**
     * `"`.
     */
    DoubleQuote,

    /**
     * `import`.
     */
    ImportKeyword,

    /**
     * `export`.
     */
    ExportKeyword,

    /**
     * Can be anything. Only characters that can't be assigned to any other token is assigned to a raw token. Using this token instead
     * of errors allow programmer to use any character they want in the string.
     */
    Raw,

    /**
     * `|`.
     */
    VarSeperator,

    /**
     * `global`.
     */
    GlobalKeyword,

    /**
     * `function`.
     */
    FunctionKeyword,

    /**
     * `class`.
     */
    ClassKeyword,

    /**
     * `imports`
     */
    ImportsKeyword,

    /**
     * Represents end of the file. There can't be any tokens after this token. It is not an actual token included in a source file,
     * rather a virtual token added by tokenizers.
     */
    EndOfFile,

    /**
     * `keyword`.
     */
    KeywordKeyword,

    /**
     * `rule`.
     */
    RuleKeyword
}

/**
 * Base token interface.
 * @version 1.0.3
 * @since 0.0.1-alpha
 * @author efekos
 */
export interface Token {
    type: TokenType;
    value: string;
    range: Range;
}

/**
 * Every node type a syntax script declaration file can contain.
 * @author efekos
 * @since 0.0.1-alpha
 * @version 1.0.1
 */
export enum NodeType {

    /**
     * {@link ProgramStatement}.
     */
    Program,

    //.# Statements

    /**
     * {@link OperatorStatement}.
     */
    Operator,

    /**
     * {@link CompileStatement}.
     */
    Compile,

    /**
     * {@link ImportStatement}.
     */
    Import, // Import some file

    /**
     * {@link ImportsStatement}.
     */
    Imports, // imports() method

    /**
     * {@link FunctionStatement}.
     */
    Function,

    /**
     * {@link GlobalStatement}.
     */
    Global,

    /**
     * {@link KeywordStatement}.
     */
    Keyword,

    /**
     * {@link RuleStatement}.
     */
    Rule,

    //.# Expressions

    /**
     * {@link PrimitiveTypeExpression}.
     */
    PrimitiveType,

    /**
     * {@link WhitespaceIdentifierExpression}.
     */
    WhitespaceIdentifier,

    /**
     * {@link VariableExpression}.
     */
    Variable,

    /**
     * {@link StringExpression}.
     */
    String,

    /**
     * {@link BraceExpression}.
     */
    Brace,

    /**
     * {@link ParenExpression}.
     */
    Paren,

    /**
     * {@link SquareExpression}.
     */
    Square,

    /**
     * {@link IdentifierExpression}.
     */
    Identifier
}

/**
 * Main program statement. Uses type {@link NodeType.Program}. Contains every statement included in a file.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface ProgramStatement extends Statement {
    type: NodeType.Program,
    body: Statement[];
}

/**
 * Base statement interface.
 * @author efekos
 * @version 1.0.4
 * @since 0.0.1-alpha
 */
export interface Statement {
    type: NodeType;
    range: Range;
    modifiers: Token[];
}

/**
 * Base expression type. Must contain a string value as a difference from it's superclass, {@link Statement}.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface Expression extends Statement {
    value: string;
}

/**
 * An expression that represents a primitive type. Uses type {@link NodeType.PrimitiveType}. Contains name of the primitive type as value.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface PrimitiveTypeExpression extends Expression {
    type: NodeType.PrimitiveType,
    value: string;
}

/**
 * An expression that represents a primitive type variable, probably used in a {@link CompileStatement}. Uses type {@link NodeType.Variable}.
 * Contains name of the primitive type a value, and also an index indicating which part of the regex exactly.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface VariableExpression extends Expression {
    type: NodeType.Variable,
    value: string;
    index: number;
}

/**
 * An expression that represents a whitespace identifier. Whitespace identifiers are used to reference to any amount of spaces.
 * Uses type {@link NodeType.WhitespaceIdentifier}.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface WhitespaceIdentifierExpression extends Expression {
    type: NodeType.WhitespaceIdentifier;
}

/**
 * An expression that represents a literal string value. Uses type {@link NodeType.String}. Contains the value of the string.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface StringExpression extends Expression {
    type: NodeType.String,
    value: string;
}

/**
 * An expression that represents an alphabetical identifier. Uses type {@link NodeType.Identifier}. Contains the name of something.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.2-alpha
 */
export interface IdentifierExpression extends Expression {
    type: NodeType.Identifier;
}

/**
 * An expression that represents multiple statements inside braces (`{}`). Uses type {@link NodeType.Brace}.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface BraceExpression extends Expression {
    type: NodeType.Brace,
    body: Statement[];
}

/**
 * An expression that represents multiple statements inside parens (`()`). Uses type {@link NodeType.Paren}.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface ParenExpression extends Expression {
    type: NodeType.Paren,
    body: Statement[];
}



/**
 * An expression that represents multiple statements inside square parens (`[]`). Uses type {@link NodeType.Square}.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface SquareExpression extends Expression {
    type: NodeType.Square,
    body: Statement[];
}

/**
 * Operator statement that represensts an operator usable anywhere, such as a binary expression. Uses type {@link NodeType.Operator}.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface OperatorStatement extends Statement {
    type: NodeType.Operator,
    body: Statement[];
    regex: Statement[];
}

/**
 * Keyword statement that registers an identifier as a keyword. This keyword can be used in several places. Uses type {@link NodeType.Keyword}.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface KeywordStatement extends Statement {
    word: IdentifierExpression;
    type: NodeType.Keyword;
}

/**
 * Imports statements indicate that a certain module should be imported to the file if the parent statement is used in .sys file.
 * Uses type {@link NodeType.Imports}.
 * @author efekos
 * @version 1.0.2
 * @since 0.0.1-alpha
 */
export interface ImportsStatement extends Statement {
    type: NodeType.Imports,
    formats: IdentifierExpression[];
    module: StringExpression;
}

/**
 * Compile statements determine what should be the result of an operator or a function when compiling to certain languages.
 * Uses typq {@link NodeType.Compile}.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface CompileStatement extends Statement {
    type: NodeType.Compile,
    formats: IdentifierExpression[],
    body: Expression[];
}

/**
 * Rule statements define a specific rule about the source language, such as keyword usages or enabling/disabling certain
 * features of the language. Uses type {@link NodeType.Rule}.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface RuleStatement extends Statement {
    type: NodeType.Rule;
    rule: StringExpression;
    value: unknown;
}

/**
 * Import statements are used to import a .syx file from a .sys file. They can be used to import other .syx files from a
 * .syx file as well. Uses type {@link NodeType.Import}
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface ImportStatement extends Statement {
    type: NodeType.Import,
    path: StringExpression;
}

/**
 * Function statements are used to define possible function calls. How the function is called depends on the place this statement is
 * used. Uses type {@link NodeType.Function}.
 * @author efekos
 * @version 1.0.2
 * @since 0.0.1-alpha
 */
export interface FunctionStatement extends Statement {
    type: NodeType.Function,
    name: IdentifierExpression,
    arguments: PrimitiveTypeExpression[];
    body: Statement[];
}

/**
 * Global statements are used to define values that are global. They can be global classes, interfaces, or just global methods depending on
 * the language. But the only thing that matters here is that they are global, and can be used from anywhere.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.2-alpha
 */
export interface GlobalStatement extends Statement {
    body: Statement[];
    name: IdentifierExpression;
}


/**
 * Represents any interface that is a node.
 * @author efekos
 * @version 1.0.3
 * @since 0.0.1-alpha
 */
export type Node =
    ProgramStatement | OperatorStatement | CompileStatement | ImportStatement | ImportsStatement | FunctionStatement | KeywordStatement | RuleStatement | GlobalStatement |
    StringExpression | PrimitiveTypeExpression | VariableExpression | WhitespaceIdentifierExpression | BraceExpression | SquareExpression | ParenExpression | IdentifierExpression;

/**
 * Represents a syxconfig.json file. This file contains a few properties for the compiler.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface SyxConfig {
    name: string;
    description?: string;
    version: string;
    compile: SyxConfigCompile;
}

/**
 * Represents the `compile` property of a syxconfig.json file. This part contains information especially about the compiler.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface SyxConfigCompile {
    root: string;
    out: string;
    format: string;
}


/**
 * An error that occured while tokenizing, parsing or compiling a file.
 * @author efekos
 * @version 1.0.4
 * @since 0.0.1-alpha
 */
export class CompilerError extends Error {
    range: Range;
    file: string;
    actions: CodeAction[] = [];

    /**
     * An error that occured while tokenizing a file.
     * @param {Range} range Range where the error is.
     * @param {string} message Error message. 
     */
    constructor(range: Range, message: string, file?: string, actions?: CodeAction[]) {
        super();
        this.range = range;
        this.message = message;
        this.file = file;
        this.name = 'CompilerError';
        if (actions !== undefined) this.actions = actions;
    }
}

/**
 * Checks whether an error is a {@link CompilerError}.
 * @param {Error} error Any error. 
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 * @returns Whether it is a {@link CompilerError} or not.
 */
export function isCompilerError(error: Error): error is CompilerError {
    return error.name === 'CompilerError';
}

interface NodeTypes {
    [NodeType.Brace]: BraceExpression;
    [NodeType.Compile]: CompileStatement;
    [NodeType.Function]: FunctionStatement;
    [NodeType.Import]: ImportStatement;
    [NodeType.Imports]: ImportsStatement;
    [NodeType.Keyword]: KeywordStatement;
    [NodeType.Operator]: OperatorStatement;
    [NodeType.Paren]: ParenExpression;
    [NodeType.PrimitiveType]: PrimitiveTypeExpression;
    [NodeType.Program]: ProgramStatement;
    [NodeType.Rule]: RuleStatement;
    [NodeType.Square]: SquareExpression;
    [NodeType.String]: StringExpression;
    [NodeType.Variable]: VariableExpression;
    [NodeType.WhitespaceIdentifier]: WhitespaceIdentifierExpression;
    [NodeType.Global]: GlobalStatement;
    [NodeType.Identifier]: IdentifierExpression;
}

/**
 * Determines whether the given node matches the expected node type.
 * @param {Node} node Any node.
 * @param {NodeType} nodeType Expected node type.
 * @returns {boolean} True if the given node is of the expected node type, otherwise false.
 * @author efekos
 * @since 0.0.2-alpha
 * @version 1.0.0
 */
export function statementIsA<T extends keyof NodeTypes>(node: Statement, nodeType: T): node is NodeTypes[T] {
    return node.type === nodeType;
}

/**
 * Type of something that can be exported.
 * @version 1.0.1
 * @since 0.0.1-alpha
 * @author efekos
 */
export enum ExportType {

    /**
     * {@link ExportedOperator}.
     */
    Operator,

    /**
     * {@link ExportedFunction}.
     */
    Function,

    /**
     * {@link ExportedKeyword}.
     */
    Keyword,

    /**
     * {@link ExportedGlobal}.
     */
    Global

}

/**
 * Base exportable interface.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface Exported {
    type: ExportType;
    source: string;
}

/**
 * Represents an exported operator. Uses type {@link ExportType.Operator}.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface ExportedOperator extends Exported {
    type: ExportType.Operator,
    regexMatcher: RegExp;
    outputGenerators: Record<string, OneParameterMethod<string, string>>;
    imports: Record<string, string>;
}

/**
 * Represents an exported function. Uses type {@link ExportType.Function}.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface ExportedFunction extends Exported {
    type: ExportType.Function;
    name: string;
    args: RegExp[];
    formatNames: Record<string, string>;
    imports: Record<string, string>;
}

/**
 * Represents an exported keyword. Uses type {@link ExportType.Keyword}.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface ExportedKeyword extends Exported {
    type: ExportType.Keyword;
    word: string;
}

/**
 * Represents an exported global. Uses type {@link ExportType.Global}.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.2-alpha
 */
export interface ExportedGlobal extends Exported {
    type: ExportType.Global;
    name: string;
    body: Exported[];
}

/**
 * A method that has one parameter with the type {@link V} and returns {@link R}.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export type OneParameterMethod<V, R> = (v: V) => R;

/**
 * A method that takes no parameters and returns an {@link R}.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export type ReturnerMethod<R> = () => R;

/**
 * Any interface that represents something exportable.
 */
export type AnyExportable = ExportedOperator | ExportedFunction | ExportedKeyword;

export const regexes: Record<string, RegExp> = {
    /**
     * Regex for `int` primitive type. `int`s can be any number that does not contain fractional digits.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.0
     */
    int: /([0-9]+)/,

    /**
     * Regex used for `string` primitive type. `string`s are phrases wrapped with quotation marks that can contain anything.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.0
     */
    string: /('[\u0000-\uffff]*'|"[\u0000-\uffff]*")/,

    /**
     * Regex used for `boolean` primitive type. `boolean`s are one bit, but 0 is represented as `false` and 1 is `false`.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.0
     */
    boolean: /(true|false)/,

    /**
     * Regex used for `decimal` primitive type. `decimal`s are either integers or numbers with fractional digits.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.0
     */
    decimal: /([0-9]+(\.[0-9]+)?)/,

    /**
     * Regex used for whitespace identifiers, an identifier used to reference any amount of spaces.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    '+s': /\s*/

};

/**
 * Escapes every RegExp character at the source string.
 * @param src Source string.
 * @returns Same string with every RegExp character replaced with '\\$&'. 
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export function escapeRegex(src: string): string {
    return src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export namespace CompilerFunctions {


    /**
     * Generates {@link RegExp} of the given operator statement.
     * @param statement An operator statement.
     * @returns A regular expression generated from regex of the operator statement.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.2-alpha
     */
    export function generateRegexMatcher(statement: OperatorStatement): RegExp {
        let regexMatcher = new RegExp('');
        statement.regex.forEach(regexStatement => {

            if (regexStatement.type === NodeType.PrimitiveType) {
                regexMatcher = new RegExp(regexMatcher.source + regexes[(regexStatement as PrimitiveTypeExpression).value].source);
            }
            if (regexStatement.type === NodeType.WhitespaceIdentifier) {
                regexMatcher = new RegExp(regexMatcher.source + regexes['+s'].source);
            }
            if (regexStatement.type === NodeType.String) {
                regexMatcher = new RegExp(regexMatcher.source + escapeRegex((regexStatement as StringExpression).value));
            }

        });

        return regexMatcher;
    }

}