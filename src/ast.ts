import { BraceExpression, CompileStatement, CompilerError, ExportStatement, Expression, FunctionStatement, ImportsStatement, KeywordStatement, Node, NodeType, OperatorStatement, ParenExpression, PrimitiveTypeExpression, ProgramStatement, SquareExpression, StringExpression, Token, TokenType, VariableExpression } from './types.js';
import { Range } from './diagnosticTypes.js';

const valueTypeDefinitions = {
    boolean: { value: 'boolean', regex: /^(true|false)$/ },
    keyword: { value: 'keyword' }
};

export const SyxRuleRegistry: Record<string, { value: string, regex?: RegExp; }> = {

    /**
     * Determines whether it is possible to return a value using functons.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    'function-value-return-enabled': valueTypeDefinitions.boolean,

    /**
     * Determines the keyword that should be used to return values from a function, similiar to `return` keyword
     * from popular languages such as ts,js,py,java etc.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    'function-value-return-keyword': valueTypeDefinitions.keyword
};


export namespace syxparser {

    let tokens: Token[];

    /**
     * Determintes whether the parser can keep parsing tokens.
     * @returns Whether there is a token left.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    function canGo(): boolean {
        return tokens[0].type !== TokenType.EndOfFile;
    }

    let program: ProgramStatement;

    /**
     * Parses the token list given into statements and expressions.
     * @param {Token[]} t Token list to parse.
     * @returns Main {@link ProgramStatement} containing all other statements.
     * @author efekos
     * @version 1.0.2
     * @since 0.0.1-alpha
     */
    export function parseTokens(t: Token[]): ProgramStatement {
        tokens = t;

        const eof = t.find(r => r.type === TokenType.EndOfFile);
        program = { body: [], type: NodeType.Program, range: { end: eof.range.end, start: { line: 0, character: 0 } } };


        while (canGo()) {
            parseStatement();
        }

        return program;

    }

    /**
     * Returns the token at given index. Alias for `tokens[i]`.
     * @param {number} i Token index. Defaults to 0.
     * @returns The token at given index.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    function at(i: number = 0): Token {
        return tokens[i];
    }

    const exportable = [NodeType.Operator, NodeType.Function, NodeType.Keyword];
    const defaultRange: Range = { end: { line: 0, character: 0 }, start: { character: 0, line: 0 } };


    /**
     * Combines the start of first range with the end of second range to create a range.
     * @param starterRange Start range.
     * @param enderRange End range.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.1
     */
    export function combineTwo(starter: Token | Range, ender: Token | Range): Range {
        return { start: ('range' in starter ? starter.range : starter).start, end: ('range' in ender ? ender.range : ender).end };
    }

    /**
     * Parses a statement from the most recent token. Will call {@link parseExpression} if no statement is present.
     * @param {boolean} put Whether the result should be added to the program statement.
     * @returns A node that is either a statement or an expression if a statement wasn't present.
     * @author efekos
     * @version 1.0.6
     * @since 0.0.1-alpha
     */
    export function parseStatement(put: boolean = true): Node {
        if (keywords.includes(at().type)) {
            const token = at();
            tokens.shift();

            if (token.type === TokenType.ImportKeyword) {

                const ex = parseExpression(false, false);
                if (ex.type !== NodeType.String) throw new CompilerError(ex.range, 'Expected string after import statement.');
                return node({ type: NodeType.Import, path: (ex as Expression).value, range: combineTwo(token, ex.range) }, put);

            } else if (token.type === TokenType.OperatorKeyword) {
                const statement: OperatorStatement = { type: NodeType.Operator, regex: [], body: [], range: defaultRange };


                while (at().type !== TokenType.OpenBrace) {
                    const ex = parseExpression(false);
                    statement.regex.push(ex);
                }

                const braceExpr = parseExpression(false);
                if (braceExpr.type !== NodeType.Brace) throw new CompilerError(braceExpr.range, 'Expected braces after \'operator\'.');
                braceExpr.body.forEach(s => { if (!([NodeType.Compile, NodeType.Imports].includes(s.type))) throw new CompilerError(s.range, 'Statement not allowed.'); });

                statement.body = braceExpr.body;
                statement.range = combineTwo(token, braceExpr.range);

                return node(statement, put);
            } else if (token.type === TokenType.CompileKeyword) {
                const statement: CompileStatement = { type: NodeType.Compile, formats: [], body: [], range: defaultRange };

                if (at().type !== TokenType.OpenParen) throw new CompilerError(at().range, 'Expected parens after \'compile\' statement.');

                tokens.shift(); // skip OpenParen
                while (at().type !== TokenType.CloseParen) {
                    const t = tokens.shift();

                    if (t.type === TokenType.Comma && at().type !== TokenType.Identifier) throw new CompilerError(t.range, 'Expected identifier after comma.');
                    else if (t.type === TokenType.Comma && statement.formats.length === 0) throw new CompilerError(t.range, 'Can\'t start with comma.');
                    else if (t.type === TokenType.Identifier) statement.formats.push(t.value);
                    else throw new CompilerError(t.range, 'Unexpected token.');
                }
                tokens.shift(); // skip CloseParen

                while (at().type !== TokenType.Semicolon) {
                    const expr = parseExpression(false, false);
                    statement.body.push(expr as Expression);
                }
                statement.range = combineTwo(token, tokens.shift()); // Skip semicolon and make it the end of the range.

                return node(statement, put);
            } else if (token.type === TokenType.ExportKeyword) {
                const stmt = parseStatement(false);
                if (!exportable.includes(stmt.type)) throw new CompilerError(stmt.range, 'Expected exportable statement after export.');
                return node({ type: NodeType.Export, body: stmt, range: combineTwo(token, stmt.range) }, put);
            } else if (token.type === TokenType.ImportsKeyword) {
                const statement: ImportsStatement = { type: NodeType.Imports, formats: [], module: '', range: defaultRange };

                if (at().type !== TokenType.OpenParen) throw new CompilerError(at().range, 'Expected parens after \'imports\' statement.');

                tokens.shift(); // skip OpenParen
                while (at().type !== TokenType.CloseParen) {
                    const t = tokens.shift();

                    if (t.type === TokenType.Comma && at().type !== TokenType.Identifier) throw new CompilerError(t.range, 'Expected identifier after comma.');
                    else if (t.type === TokenType.Comma && statement.formats.length === 0) throw new CompilerError(t.range, 'Can\'t start with comma.');
                    else if (t.type === TokenType.Identifier) statement.formats.push(t.value);
                    else throw new CompilerError(t.range, 'Unexpected token.');
                }
                tokens.shift(); // skip CloseParen

                const moduleExpr = parseExpression(false, false);

                if (moduleExpr.type !== NodeType.String) { throw new CompilerError(moduleExpr.range, 'Expected string after parens of imports statement.'); }

                statement.module = moduleExpr.value;
                statement.range = combineTwo(token, moduleExpr.range);

                if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, 'Expected \';\' after imports statement.');
                tokens.shift();

                return node(statement, put);
            } else if (token.type === TokenType.FunctionKeyword) {
                const statement: FunctionStatement = { type: NodeType.Function, arguments: [], name: '', body: [], range: defaultRange };

                if (at().type !== TokenType.Identifier) throw new CompilerError(at().range, 'Expected identifier after function statement.');
                statement.name = at().value;
                tokens.shift();

                while (at().type !== TokenType.OpenBrace) {
                    const expr = parseExpression(false, false);
                    if (expr.type !== NodeType.PrimitiveType) throw new CompilerError(expr.range, 'Expected argument types after function name.');
                    statement.arguments.push((expr as PrimitiveTypeExpression).value);
                }

                const braceExpr = parseExpression(false);
                if (braceExpr.type !== NodeType.Brace) throw new CompilerError(braceExpr.range, 'Expected braces after \'function\'.');
                braceExpr.body.forEach(s => { if (!([NodeType.Compile, NodeType.Imports].includes(s.type))) throw new CompilerError(s.range, 'Statement not allowed'); });

                statement.body = braceExpr.body;
                statement.range = combineTwo(token, braceExpr.range);

                return node(statement, put);
            } else if (token.type === TokenType.KeywordKeyword) {
                const ex = parseExpression(false, false, true);
                if (ex.type !== NodeType.String) throw new CompilerError(ex.range, 'Expected identifier after keyword statement.');
                if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, 'Expected semicolon after statement.');
                tokens.shift(); // skip semicolon
                return node({ type: NodeType.Keyword, word: ex.value, range: combineTwo(token, ex.range) }, put);
            } else if (token.type === TokenType.RuleKeyword) {
                const ruleExpr = parseExpression(false, false);
                if (ruleExpr.type !== NodeType.String) { throw new CompilerError(ruleExpr.range, 'Expected string after \'rule\'.'); }
                if (at().value !== ':') throw new CompilerError(at().range, 'Expected \':\' after rule name.');
                tokens.shift();
                if (!(ruleExpr.value in SyxRuleRegistry)) throw new CompilerError(ruleExpr.range, `Unknown rule '${ruleExpr.value}'.`);
                const rule = SyxRuleRegistry[ruleExpr.value];

                if (rule.value === 'boolean') {
                    const boolEx = parseExpression(false, false, true);
                    if (!(boolEx.type === NodeType.String && rule.regex.test(boolEx.value))) { throw new CompilerError(boolEx.range, 'Expected boolean as rule value.'); }


                    if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, 'Expected semicolon after rule statement.');
                    return node({ type: NodeType.Rule, rule: ruleExpr.value, value: boolEx.value, range: combineTwo(token, tokens.shift()) }, put);
                } else if (rule.value === 'keyword') {
                    const keyEx = parseExpression(false, false, true);
                    if (!(
                        keyEx.type === NodeType.String &&
                        program.body.some(s =>
                            (s.type === NodeType.Keyword && (s as KeywordStatement).word === keyEx.value) ||
                            (s.type === NodeType.Export && (s as ExportStatement).body.type === NodeType.Keyword && ((s as ExportStatement).body as KeywordStatement).word === keyEx.value)
                        )
                    )) throw new CompilerError(keyEx.range, 'Unknown keyword.');

                    if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, 'Expected semicolon after rule statement.');
                    return node({ type: NodeType.Rule, rule: ruleExpr.value, value: keyEx.value, range: combineTwo(token, tokens.shift()) }, put);
                }
            }

        }
        else parseExpression();
    }

    /**
     * An alias function to handle different cases of calling {@link parseStatement} and {@link parseExpression}.
     * @param {T} node The node.
     * @param {boolean} put Whether the node should be added to current program.
     * @returns The node.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    function node<T extends Node>(node: T, put: boolean): T {
        if (put) program.body.push(node);
        return node;
    }

    /**
     * Parses the most recent expression at the token list. Goes to {@link parseStatement} if a keyword is found.
     * @param {boolean} put Whether the result should be put into current program.
     * @param {boolean} statements Whether statements should be allowed. Function will stop if a keyword found with this value set to `true`.
     * @param {boolean} expectIdentifier Whether identifiers should be allowed. Unknown identifiers will stop the function with this value set to `false`, returning the identifier as a {@link StringExpression} otherwise.
     * @returns The parsed node.
     * @author efekos
     * @version 1.0.6
     * @since 0.0.1-alpha
     */
    export function parseExpression(put: boolean = true, statements: boolean = true, expectIdentifier: boolean = false): Node {
        const tt = at().type;

        if (tt === TokenType.SingleQuote) {
            let s = '';
            const { range } = at();

            tokens.shift();
            while (at().type !== TokenType.SingleQuote) {
                const _t = tokens.shift();
                s += _t.value;
            }

            return node({ type: NodeType.String, value: s, range: combineTwo(range, tokens.shift()) }, put);

        } else if (tt === TokenType.DoubleQuote) {
            let s = '';
            const { range } = at();

            tokens.shift();
            while (at().type !== TokenType.SingleQuote) {
                const _t = tokens.shift();
                s += _t.value;
            }

            return node({ type: NodeType.String, value: s, range: combineTwo(range, tokens.shift()) }, put);

        } else if (tt === TokenType.OpenDiamond) {

            const newToken = at(1);
            if (newToken.type !== TokenType.Identifier) throw new CompilerError(newToken.range, 'Expected identifier after \'<\'.');
            if (!newToken.value.match(primitiveTypes)) throw new CompilerError(newToken.range, `Expected primitive type, found '${newToken.value}'`);
            if (at(2).type !== TokenType.CloseDiamond) throw new CompilerError(at(2).range, `Expected '>' after primitive type, found '${at(2).value}'`);
            const t = tokens.shift();
            tokens.shift();

            return node({ type: NodeType.PrimitiveType, value: newToken.value, range: combineTwo(t, tokens.shift()) }, put);
        } else if (tt === TokenType.WhitespaceIdentifier) {
            const { range } = tokens.shift();
            return node({ type: NodeType.WhitespaceIdentifier, value: '+s', range }, put);
        } else if (tt === TokenType.OpenBrace) {
            const { range } = tokens.shift();

            const expr: BraceExpression = { type: NodeType.Brace, body: [], value: '{', range: defaultRange };

            while (at().type !== TokenType.CloseBrace) {
                const stmt = parseStatement(false);
                expr.body.push(stmt);
            }
            expr.range = combineTwo(range, tokens.shift());
            return node(expr, put);

        } else if (tt === TokenType.OpenParen) {
            const { range } = tokens.shift();

            const expr: ParenExpression = { type: NodeType.Paren, body: [], value: '(', range: defaultRange };

            while (at().type !== TokenType.CloseParen) {
                const stmt = parseStatement(false);
                expr.body.push(stmt);
            }
            expr.range = combineTwo(range, tokens.shift());
            return node(expr, put);


        } else if (tt === TokenType.OpenSquare) {
            const { range } = tokens.shift();

            const expr: SquareExpression = { type: NodeType.Square, body: [], value: '[', range: defaultRange };

            while (at().type !== TokenType.CloseSquare) {
                const stmt = parseStatement(false);
                expr.body.push(stmt);
            }
            expr.range = combineTwo(range, tokens.shift());
            return node(expr, put);


        } else if (tt === TokenType.Identifier && at(1).type === TokenType.VarSeperator) {

            if (at(2).type !== TokenType.IntNumber) throw new CompilerError(at(2).range, `Expected index after ${at().value} variable`);

            const id = tokens.shift(); // id
            tokens.shift(); // sep
            const index = tokens.shift(); // index
            const expr: VariableExpression = { index: parseInt(index.value), type: NodeType.Variable, value: id.value, range: combineTwo(id, index) };

            return node(expr, put);
        } else if (keywords.includes(tt)) {
            if (!statements) throw new CompilerError(at().range, 'Unexpected statement.');
            return parseStatement();
        } else if (tt === TokenType.Identifier && expectIdentifier) {
            const { value, range } = tokens.shift();
            return node({ type: NodeType.String, value, range }, put);
        }
        else throw new CompilerError(at().range, `Unexpected expression: '${at().value}'`);


    }

    const primitiveTypes = /^(int|string|boolean|decimal)$/;

    const keywords = [TokenType.ImportKeyword, TokenType.ExportKeyword, TokenType.CompileKeyword, TokenType.OperatorKeyword, TokenType.ImportsKeyword, TokenType.GlobalKeyword, TokenType.FunctionKeyword, TokenType.KeywordKeyword, TokenType.RuleKeyword];

}



export namespace sysparser {

    let tokens: Token[];

    /**
     * Determintes whether the parser can keep parsing tokens.
     * @returns Whether there is a token left.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    function canGo(): boolean {
        return tokens[0].type !== TokenType.EndOfFile;
    }

    let program: ProgramStatement;


    /**
     * Combines the start of first range with the end of second range to create a range.
     * @param starterRange Start range.
     * @param enderRange End range.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.1
     */
    export function combineTwo(starter: Token | Range, ender: Token | Range): Range {
        return { start: ('range' in starter ? starter.range : starter).start, end: ('range' in ender ? ender.range : ender).end };
    }

    /**
     * Parses the token list given into statements and expressions.
     * @param {Token[]} t Token list to parse.
     * @returns Main {@link ProgramStatement} containing all other statements.
     * @author efekos
     * @version 1.0.1
     * @since 0.0.1-alpha
     */
    export function parseTokens(t: Token[]): ProgramStatement {
        tokens = t;

        const eof = t.find(r => r.type === TokenType.EndOfFile);
        program = { body: [], type: NodeType.Program, range: { start: { character: 0, line: 0 }, end: eof.range.end } };

        while (canGo()) {
            parseStatement();
        }

        return program;

    }

    /**
     * Returns the token at given index. Alias for `tokens[i]`.
     * @param {number} i Token index. Defaults to 0.
     * @returns The token at given index.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    function at(i: number = 0): Token {
        return tokens[i];
    }


    /**
     * Parses a statement from the most recent token. Will call {@link parseExpression} if no statement is present.
     * @param {boolean} put Whether the result should be added to the program statement.
     * @returns A node that is either a statement or an expression if a statement wasn't present.
     * @author efekos
     * @version 1.0.4
     * @since 0.0.1-alpha
     */
    export function parseStatement(put: boolean = true): Node {
        if (keywords.includes(at().type)) {
            const token = at();
            tokens.shift();

            if (token.type === TokenType.ImportKeyword) {

                const ex = parseExpression(false, false);
                if (ex.type !== NodeType.String) throw new CompilerError(ex.range, 'Expected string after import statement.');
                return node({ type: NodeType.Import, path: (ex as Expression).value, range: combineTwo(token, ex.range) }, put);

            }

        }
        else parseExpression();
    }

    /**
     * An alias function to handle different cases of calling {@link parseStatement} and {@link parseExpression}.
     * @param {Node} node The node.
     * @param {boolean} put Whether the node should be added to current program.
     * @returns The node.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    function node(node: Node, put: boolean) {
        if (put) program.body.push(node);
        return node;
    }

    /**
     * Parses the most recent expression at the token list. Goes to {@link parseStatement} if a keyword is found.
     * @param {boolean} put Whether the result should be put into current program.
     * @param {boolean} statements Whether statements should be allowed. Function will stop if a keyword found with this value set to `true`.
     * @param {boolean} expectIdentifier Whether identifiers should be allowed. Unknown identifiers will stop the function with this value set to `false`, returning the identifier as a {@link StringExpression} otherwise.
     * @returns The parsed node.
     * @author efekos
     * @version 1.0.4
     * @since 0.0.1-alpha
     */
    export function parseExpression(put: boolean = true, statements: boolean = true): Node {
        const tt = at().type;

        if (tt === TokenType.SingleQuote) {
            let s = '';
            const { range } = at();

            tokens.shift();
            while (at().type !== TokenType.SingleQuote) {
                const _t = tokens.shift();
                s += _t.value;
            }

            return node({ type: NodeType.String, value: s, range: combineTwo(range, tokens.shift()) }, put);

        } else if (tt === TokenType.DoubleQuote) {
            let s = '';
            const { range } = at();

            tokens.shift();
            while (at().type !== TokenType.SingleQuote) {
                const _t = tokens.shift();
                s += _t.value;
            }

            return node({ type: NodeType.String, value: s, range: combineTwo(range, tokens.shift()) }, put);

        } else if (keywords.includes(tt)) {
            if (!statements) throw new CompilerError(at().range, 'Unexpected statement.');
            return parseStatement();
        }
        else throw new CompilerError(at().range, `Unexpected expression: '${at().value}'`);


    }

    const keywords = [TokenType.ImportKeyword];

}
