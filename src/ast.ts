import { BraceExpression, CompileStatement, CompilerError, ExportStatement, Expression, FunctionStatement, ImportsStatement, KeywordStatement, Node, NodeType, OperatorStatement, ParenExpression, PrimitiveTypeExpression, ProgramStatement, SquareExpression, StringExpression, Token, TokenType, VariableExpression } from './types.js';

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

    let watchMode: boolean;

    /**
     * Parses the token list given into statements and expressions.
     * @param {Token[]} t Token list to parse.
     * @param {boolean} watch Whether is it watch mode or not. Errors will exit process if it isn't watch mode, throwing an error otherwise.
     * @returns Main {@link ProgramStatement} containing all other statements.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    export function parseTokens(t: Token[], watch: boolean): ProgramStatement {
        tokens = t;
        watchMode = watch;

        const eof = t.find(r => r.type === TokenType.EndOfFile);
        program = { body: [], type: NodeType.Program, pos: 0, end: eof.end, line: 0 };


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
                if (ex.type !== NodeType.String) throw new CompilerError({ character: ex.pos, line: ex.line }, 'Expected string after import statement.');
                return node({ type: NodeType.Import, path: (ex as Expression).value, pos: token.pos, end: ex.end, line: token.line }, put);

            } else if (token.type === TokenType.OperatorKeyword) {
                const statement: OperatorStatement = { type: NodeType.Operator, regex: [], body: [], pos: token.pos, end: token.end, line: token.line };


                while (at().type !== TokenType.OpenBrace) {
                    const ex = parseExpression(false);
                    statement.regex.push(ex);
                    statement.end = ex.end;
                }

                const braceExpr = parseExpression(false);
                if (braceExpr.type !== NodeType.Brace) throw new CompilerError({ character: braceExpr.pos, line: braceExpr.line }, 'Expected braces after \'operator\'.');
                braceExpr.body.forEach(s => { if (!([NodeType.Compile, NodeType.Imports].includes(s.type))) throw new CompilerError({ character: s.pos, line: s.line }, 'Statement not allowed.'); });

                statement.body = braceExpr.body;
                statement.end = braceExpr.end;

                return node(statement, put);
            } else if (token.type === TokenType.CompileKeyword) {
                const statement: CompileStatement = { type: NodeType.Compile, formats: [], body: [], pos: token.pos, end: token.pos + 3, line: token.line };

                if (at().type !== TokenType.OpenParen) throw new CompilerError({character:at().pos,line:at().line},'Expected parens after \'compile\' statement.');

                tokens.shift(); // skip OpenParen
                while (at().type !== TokenType.CloseParen) {
                    const t = tokens.shift();

                    if (t.type === TokenType.Comma && at().type !== TokenType.Identifier) throw new CompilerError({character:t.pos,line:t.line},'Expected identifier after comma.');
                    else if (t.type === TokenType.Comma && statement.formats.length === 0) throw new CompilerError({character:t.pos,line:t.line},'Can\'t start with comma.');
                    else if (t.type === TokenType.Comma) statement.end++;
                    else if (t.type === TokenType.Identifier) { statement.formats.push(t.value); statement.end = t.end; }
                    else throw new CompilerError({character:t.pos,line:t.line},'Unexpected token.');
                }
                tokens.shift(); // skip CloseParen

                while (at().type !== TokenType.Semicolon) {
                    const expr = parseExpression(false, false);
                    statement.body.push(expr as Expression);
                    statement.end = expr.end;
                }
                tokens.shift(); // skip Semicolon

                return node(statement, put);
            } else if (token.type === TokenType.ExportKeyword) {
                const stmt = parseStatement(false);
                if (!exportable.includes(stmt.type)) throw new CompilerError({character:stmt.pos,line:stmt.line},'Expected exportable statement after export.');
                return node({ type: NodeType.Export, body: stmt, pos: token.pos, end: stmt.end, line: token.line }, put);
            } else if (token.type === TokenType.ImportsKeyword) {
                const statement: ImportsStatement = { type: NodeType.Imports, formats: [], module: '', pos: token.pos, end: token.end + 3, line: token.line };

                if (at().type !== TokenType.OpenParen) throw new CompilerError({character:at().pos,line:at().line},'Expected parens after \'imports\' statement.');

                tokens.shift(); // skip OpenParen
                while (at().type !== TokenType.CloseParen) {
                    const t = tokens.shift();

                    if (t.type === TokenType.Comma && at().type !== TokenType.Identifier) throw new CompilerError({character:t.pos,line:t.line},'Expected identifier after comma.');
                    else if (t.type === TokenType.Comma && statement.formats.length === 0) throw new CompilerError({character:t.pos,line:t.line},'Can\'t start with comma.');
                    else if (t.type === TokenType.Comma) { }
                    else if (t.type === TokenType.Identifier) statement.formats.push(t.value);
                    else throw new CompilerError({character:t.pos,line:t.line},'Unexpected token.');
                }
                tokens.shift(); // skip CloseParen

                const moduleExpr = parseExpression(false, false);

                if (moduleExpr.type !== NodeType.String) { throw new CompilerError({character:moduleExpr.pos,line:moduleExpr.line},'Expected string after parens of imports statement.'); }

                statement.module = moduleExpr.value;
                statement.end = moduleExpr.end;

                if (at().type !== TokenType.Semicolon) throw new CompilerError({character:at().pos,line:at().line},'Expected \';\' after imports statement.');
                tokens.shift();

                return node(statement, put);
            } else if (token.type === TokenType.FunctionKeyword) {
                const statement: FunctionStatement = { type: NodeType.Function, arguments: [], name: '', body: [], pos: token.pos, end: token.end, line: token.line };

                if (at().type !== TokenType.Identifier) throw new CompilerError({character:at().pos,line:at().line},'Expected identifier after function statement.');
                statement.name = at().value;
                tokens.shift();

                while (at().type !== TokenType.OpenBrace) {
                    const expr = parseExpression(false, false);
                    if (expr.type !== NodeType.PrimitiveType) throw new CompilerError({character:expr.pos,line:expr.line},'Expected argument types after function name.');
                    statement.arguments.push((expr as PrimitiveTypeExpression).value);
                }

                const braceExpr = parseExpression(false);
                if (braceExpr.type !== NodeType.Brace) throw new CompilerError({character:braceExpr.pos,line:braceExpr.line},'Expected braces after \'function\'.');
                braceExpr.body.forEach(s => { if (!([NodeType.Compile, NodeType.Imports].includes(s.type))) throw new CompilerError({character:braceExpr.pos,line:braceExpr.line},'Statement not allowed'); });

                statement.body = braceExpr.body;
                statement.end = braceExpr.end;

                return node(statement, put);
            } else if (token.type === TokenType.KeywordKeyword) {
                const ex = parseExpression(false, false, true);
                if (ex.type !== NodeType.String) throw new CompilerError({character:ex.pos,line:ex.line},'Expected identifier after keyword statement.');
                if (at().type !== TokenType.Semicolon) throw new CompilerError({character:ex.pos,line:ex.line},'Expected semicolon after statement.');
                tokens.shift(); // skip semicolon
                return node({ type: NodeType.Keyword, word: ex.value, pos: token.pos, end: ex.end + 1, line: token.line }, put);
            } else if (token.type === TokenType.RuleKeyword) {
                const ruleExpr = parseExpression(false, false);
                if (ruleExpr.type !== NodeType.String) { throw new CompilerError({character:ruleExpr.pos,line:ruleExpr.line},'Expected string after \'rule\'.'); }
                if (at().value !== ':') throw new CompilerError({character:ruleExpr.pos,line:ruleExpr.line},'Expected \':\' after rule name.');
                tokens.shift();
                if (!(ruleExpr.value in SyxRuleRegistry)) throw new CompilerError({character:ruleExpr.pos,line:ruleExpr.line},`Unknown rule '${ruleExpr.value}'.`);
                const rule = SyxRuleRegistry[ruleExpr.value];

                if (rule.value === 'boolean') {
                    const boolEx = parseExpression(false, false, true);
                    if (!(boolEx.type === NodeType.String && rule.regex.test(boolEx.value))) { throw new CompilerError({character:1,line:1},'Expected boolean as rule value.'); }


                    if (at().type !== TokenType.Semicolon) throw new CompilerError({character:at().pos,line:at().line},'Expected semicolon after rule statement.');
                    tokens.shift();
                    return node({ type: NodeType.Rule, rule: ruleExpr.value, value: boolEx.value, pos: token.pos, end: boolEx.end, line: token.line }, put);
                } else if (rule.value === 'keyword') {
                    const keyEx = parseExpression(false, false, true);
                    if (!(
                        keyEx.type === NodeType.String &&
                        program.body.some(s =>
                            (s.type === NodeType.Keyword && (s as KeywordStatement).word === keyEx.value) ||
                            (s.type === NodeType.Export && (s as ExportStatement).body.type === NodeType.Keyword && ((s as ExportStatement).body as KeywordStatement).word === keyEx.value)
                        )
                    )) throw new CompilerError({character:keyEx.pos,line:keyEx.line},'Unknown keyword.');

                    if (at().type !== TokenType.Semicolon) throw new CompilerError({character:at().pos,line:at().pos},'Expected semicolon after rule statement.');
                    tokens.shift();
                    return node({ type: NodeType.Rule, rule: ruleExpr.value, value: keyEx.value, pos: token.pos, end: keyEx.end, line: token.line }, put);
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
     * @version 1.0.5
     * @since 0.0.1-alpha
     */
    export function parseExpression(put: boolean = true, statements: boolean = true, expectIdentifier: boolean = false): Node {
        const tt = at().type;

        if (tt === TokenType.SingleQuote) {
            let s = '';
            const { pos, line } = at();
            let endPos = pos;

            tokens.shift();
            while (at().type !== TokenType.SingleQuote) {
                const _t = tokens.shift();
                s += _t.value;
                endPos = _t.end;
            }
            tokens.shift();
            return node({ type: NodeType.String, value: s, pos, end: endPos + 1, line }, put);

        } else if (tt === TokenType.DoubleQuote) {
            let s = '';
            const { pos, line } = at();
            let endPos = pos;

            tokens.shift();
            while (at().type !== TokenType.DoubleQuote) {
                const _t = tokens.shift();
                s += _t.value;
                endPos = _t.end;
            }
            tokens.shift();
            return node({ type: NodeType.String, value: s, pos, end: endPos + 1, line }, put);

        } else if (tt === TokenType.OpenDiamond) {

            const newToken = at(1);
            if (newToken.type !== TokenType.Identifier) throw new CompilerError({character:newToken.pos,line:newToken.line},'Expected identifier after \'<\'.');
            if (!newToken.value.match(primitiveTypes)) throw new CompilerError({character:newToken.pos,line:newToken.line},`Expected primitive type, found '${newToken.value}'`);
            if (at(2).type !== TokenType.CloseDiamond) throw new CompilerError({character:at(2).pos,line:at(2).line},`Expected '>' after primitive type, found '${at(2).value}'`);
            tokens.shift();
            tokens.shift();
            tokens.shift();

            return node({ type: NodeType.PrimitiveType, value: newToken.value, pos: newToken.pos - 1, end: newToken.end + 1, line: newToken.line }, put);
        } else if (tt === TokenType.WhitespaceIdentifier) {
            const { pos, line, end } = tokens.shift();
            return node({ type: NodeType.WhitespaceIdentifier, value: '+s', pos, end, line }, put);
        } else if (tt === TokenType.OpenBrace) {
            const { pos, line } = tokens.shift();

            const expr: BraceExpression = { type: NodeType.Brace, body: [], value: '{', pos, end: pos, line };

            while (at().type !== TokenType.CloseBrace) {
                const stmt = parseStatement(false);
                expr.body.push(stmt);
                expr.end = stmt.end;
            }
            expr.end = tokens.shift().end;
            return node(expr, put);

        } else if (tt === TokenType.OpenParen) {
            const { pos, line } = tokens.shift();

            const expr: ParenExpression = { type: NodeType.Paren, body: [], value: '(', pos, end: pos, line };

            while (at().type !== TokenType.CloseParen) {
                const stmt = parseStatement(false);
                expr.body.push(stmt);
                expr.end = stmt.end;
            }
            expr.end = tokens.shift().end;
            return node(expr, put);


        } else if (tt === TokenType.OpenSquare) {
            const { pos, line } = tokens.shift();

            const expr: SquareExpression = { type: NodeType.Square, body: [], value: '[', pos, end: pos, line };

            while (at().type !== TokenType.CloseSquare) {
                const stmt = parseStatement(false);
                expr.body.push(stmt);
                expr.end = stmt.end;
            }
            expr.end = tokens.shift().end;
            return node(expr, put);


        } else if (tt === TokenType.Identifier && at(1).type === TokenType.VarSeperator) {

            if (at(2).type !== TokenType.IntNumber) throw new CompilerError({character:at(2).pos,line:at(2).line},`Expected index after ${at().value} variable`);

            const expr: VariableExpression = { index: parseInt(at(2).value), type: NodeType.Variable, value: at().value, pos: at().pos, end: at().end + 1 + (at(2).end - at(2).pos), line: at().line };
            tokens.shift(); // id
            tokens.shift(); // sep
            tokens.shift(); // index
            return node(expr, put);
        } else if (keywords.includes(tt)) {
            if (!statements) throw new CompilerError({character:at().pos,line:at().line},'Unexpected statement.');
            return parseStatement();
        } else if (tt === TokenType.Identifier && expectIdentifier) {
            const { value, pos, end, line } = tokens.shift();
            return node({ type: NodeType.String, value, pos, end, line }, put);
        }
        else throw new CompilerError({character:at().pos,line:at().line},`Unexpected expression: '${at().value}'`);


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
    let watchMode: boolean;

    /**
     * Parses the token list given into statements and expressions.
     * @param {Token[]} t Token list to parse.
     * @param {boolean} watch Whether is it watch mode or not. Errors will exit process if it isn't watch mode, throwing an error otherwise.
     * @returns Main {@link ProgramStatement} containing all other statements.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    export function parseTokens(t: Token[], watch: boolean): ProgramStatement {
        tokens = t;
        watchMode = watch;

        const eof = t.find(r => r.type === TokenType.EndOfFile);
        program = { body: [], type: NodeType.Program, pos: 0, end: eof.end, line: 0 };

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
     * @version 1.0.3
     * @since 0.0.1-alpha
     */
    export function parseStatement(put: boolean = true): Node {
        if (keywords.includes(at().type)) {
            const token = at();
            tokens.shift();

            if (token.type === TokenType.ImportKeyword) {

                const ex = parseExpression(false, false);
                if (ex.type !== NodeType.String) throw new CompilerError({character:ex.pos,line:ex.line},'Expected string after import statement.');
                return node({ type: NodeType.Import, path: (ex as Expression).value, pos: token.pos, end: ex.end, line: ex.line }, put);

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
     * @version 1.0.3
     * @since 0.0.1-alpha
     */
    export function parseExpression(put: boolean = true, statements: boolean = true): Node {
        const tt = at().type;

        if (tt === TokenType.SingleQuote) {
            let s = '';
            const { pos, line } = at();
            let endPos = pos;

            tokens.shift();
            while (at().type !== TokenType.SingleQuote) {
                const _t = tokens.shift();
                s += _t.value;
                endPos = _t.end;
            }
            tokens.shift();
            return node({ type: NodeType.String, value: s, pos, end: endPos + 1, line }, put);
        } else if (tt === TokenType.DoubleQuote) {
            let s = '';
            const { pos, line } = at();
            let endPos = pos;

            tokens.shift();
            while (at().type !== TokenType.SingleQuote) {
                const _t = tokens.shift();
                s += _t.value;
                endPos = _t.end;
            }
            tokens.shift();
            return node({ type: NodeType.String, value: s, pos, end: endPos + 1, line }, put);
        } else if (keywords.includes(tt)) {
            if (!statements) throw new CompilerError({character:at().pos,line:at().line},'Unexpected statement.');
            return parseStatement();
        }
        else throw new CompilerError({character:at().pos,line:at().line},`Unexpected expression: '${at().value}'`);


    }

    const keywords = [TokenType.ImportKeyword];

}
