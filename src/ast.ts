import { BraceExpression, CompileStatement, CompilerError, ExportStatement, Expression, FunctionStatement, ImportsStatement, KeywordStatement, Node, NodeType, OperatorStatement, ParenExpression, PrimitiveTypeExpression, ProgramStatement, SquareExpression, StringExpression, Token, TokenType, VariableExpression } from './types.js';
import { CodeAction, CodeActionKind, Range } from 'lsp-types';
import { dictionary } from './dictionary/dictionary.js';
import levenshtein from 'js-levenshtein';

const caf = {
    mk: (keyword: string, program: ProgramStatement, range: Range, filePath: string): CodeAction[] => {
        const existingKeywords = program.body
            .filter(r => r.type === NodeType.Keyword || (r.type === NodeType.Export && (r as ExportStatement).body.type === NodeType.Keyword))
            .map(stmt => stmt.type === NodeType.Export ? ((stmt as ExportStatement).body as KeywordStatement).word : (stmt as KeywordStatement).word)
            .filter(a => levenshtein(a, keyword));

        return existingKeywords.map(word => {
            return {
                title: `Replace with '${word}'`,
                kind: CodeActionKind.QuickFix,
                edit: {
                    changes: {
                        [filePath]: [{
                            range,
                            newText: word
                        }]
                    }
                }
            };
        });
    }
};

export namespace syxparser {

    export let tokens: Token[];

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

    export let program: ProgramStatement;
    export let filePath: string;

    /**
     * Parses the token list given into statements and expressions.
     * @param {Token[]} t Token list to parse.
     * @param {string} _filePath Path of the file that is being parsed. 
     * @returns Main {@link ProgramStatement} containing all other statements.
     * @author efekos
     * @version 1.0.3
     * @since 0.0.1-alpha
     */
    export function parseTokens(t: Token[], _filePath: string): ProgramStatement {
        tokens = t;

        const eof = t.find(r => r.type === TokenType.EndOfFile);
        program = { body: [], type: NodeType.Program, range: { end: eof.range.end, start: { line: 0, character: 0 } } };
        filePath = _filePath;

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
    export function at(i: number = 0): Token {
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
     * @version 1.0.9
     * @since 0.0.1-alpha
     */
    export function parseStatement(put: boolean = true): Node {
        if (keywords.includes(at().type)) {
            const token = at();
            tokens.shift();

            if (token.type === TokenType.ImportKeyword) return StatementParser.parseImportStatement(this, put, token);
            else if (token.type === TokenType.OperatorKeyword) return StatementParser.parseOperatorStatement(this, token, defaultRange, put);
            else if (token.type === TokenType.CompileKeyword) return StatementParser.parseCompileStatement(this, token, defaultRange, put);
            else if (token.type === TokenType.ExportKeyword) return StatementParser.parseExportStatement(this, token, put, exportable);
            else if (token.type === TokenType.ImportsKeyword) return StatementParser.parseImportsStatement(this, token, put, defaultRange);
            else if (token.type === TokenType.FunctionKeyword) return StatementParser.parseFunctionStatement(this, token, put, defaultRange);
            else if (token.type === TokenType.KeywordKeyword) return StatementParser.parseKeywordStatement(this, put, token);
            else if (token.type === TokenType.RuleKeyword) return StatementParser.parseRuleStatement(this, token, put);

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
    export function node<T extends Node>(node: T, put: boolean): T {
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
     * @version 1.0.8
     * @since 0.0.1-alpha
     */
    export function parseExpression(put: boolean = true, statements: boolean = true, expectIdentifier: boolean = false): Node {
        const tt = at().type;

        if (tt === TokenType.SingleQuote) return ExpressionParser.parseSingleQuotedString(this, put);
        else if (tt === TokenType.DoubleQuote) return ExpressionParser.parseDoubleQuotedString(this, put);
        else if (tt === TokenType.OpenDiamond) {

            const newToken = at(1);
            if (newToken.type !== TokenType.Identifier) throw new CompilerError(newToken.range, `Expected identifier after '<', found '${newToken.value}'.`, filePath);
            if (!newToken.value.match(primitiveTypes)) throw new CompilerError(newToken.range, `Expected primitive type identifier after '<', found '${newToken.value}'`, filePath);
            if (at(2).type !== TokenType.CloseDiamond) throw new CompilerError(at(2).range, `Expected '>' after primitive type identifier, found '${at(2).value}'`, filePath);
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

            if (at(2).type !== TokenType.IntNumber) throw new CompilerError(at(2).range, `Expected index after ${at().value} variable, found ${at(2).value}.`, filePath);

            const id = tokens.shift(); // id
            tokens.shift(); // sep
            const index = tokens.shift(); // index
            const expr: VariableExpression = { index: parseInt(index.value), type: NodeType.Variable, value: id.value, range: combineTwo(id, index) };

            return node(expr, put);
        } else if (keywords.includes(tt)) {
            if (!statements) throw new CompilerError(at().range, 'Statement not allowed here.', filePath);
            return parseStatement();
        } else if (tt === TokenType.Identifier && expectIdentifier) {
            const { value, range } = tokens.shift();
            return node({ type: NodeType.String, value, range }, put);
        }
        else throw new CompilerError(at().range, `Unexpected expression: '${at().value}'`, filePath);


    }

    const primitiveTypes = /^(int|string|boolean|decimal)$/;

    const keywords = [TokenType.ImportKeyword, TokenType.ExportKeyword, TokenType.CompileKeyword, TokenType.OperatorKeyword, TokenType.ImportsKeyword, TokenType.GlobalKeyword, TokenType.FunctionKeyword, TokenType.KeywordKeyword, TokenType.RuleKeyword];

}



export namespace sysparser {

    export let tokens: Token[];

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

    export let program: ProgramStatement;
    export let filePath: string;


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
     * @version 1.0.2
     * @since 0.0.1-alpha
     */
    export function parseTokens(t: Token[], _filePath: string): ProgramStatement {
        tokens = t;

        const eof = t.find(r => r.type === TokenType.EndOfFile);
        program = { body: [], type: NodeType.Program, range: { start: { character: 0, line: 0 }, end: eof.range.end } };
        filePath = _filePath;

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
    export function at(i: number = 0): Token {
        return tokens[i];
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

            if (token.type === TokenType.ImportKeyword) return StatementParser.parseImportStatement(this, put, token);

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
    export function node(node: Node, put: boolean) {
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
    export function parseExpression(put: boolean = true, statements: boolean = true): Node {
        const tt = at().type;

        if (tt === TokenType.SingleQuote) return ExpressionParser.parseSingleQuotedString(this, put);
        else if (tt === TokenType.DoubleQuote) return ExpressionParser.parseDoubleQuotedString(this, put);
        else if (keywords.includes(tt)) {
            if (!statements) throw new CompilerError(at().range, 'Statements are not allowed here.', filePath);
            return parseStatement();
        }
        else throw new CompilerError(at().range, `Unexpected expression: '${at().value}'`, filePath);


    }

    const keywords = [TokenType.ImportKeyword];

}

type parser = typeof syxparser | typeof sysparser;

namespace StatementParser {

    /**
     * Parses an import statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseImportStatement({ parseExpression, filePath, combineTwo, at, node, tokens }: parser, put: boolean, token: Token): Node {
        const ex = parseExpression(false, false);
        if (ex.type !== NodeType.String) throw new CompilerError(ex.range, 'Expected file path after import statement.', filePath);
        if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, `Expected ';' after import statement, found '${at().value}'.`, filePath);
        tokens.shift();
        return node({ type: NodeType.Import, path: (ex as Expression).value, range: combineTwo(token, ex.range) }, put);
    }

    /**
     * Parses an import statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseRuleStatement({ parseExpression, filePath, combineTwo, at, node, tokens, program }: parser, token: Token, put: boolean): Node {
        const ruleExpr = parseExpression(false, false) as Expression;
        if (ruleExpr.type !== NodeType.String) { throw new CompilerError(ruleExpr.range, `Expected rule name as string after 'rule', found ${ruleExpr.value}.`, filePath); }
        if (at().value !== ':') throw new CompilerError(at().range, `Expected \':\' after rule name, found ${at().value}.`, filePath);
        tokens.shift();
        if (!dictionary.Rules.find(r => r.name === ruleExpr.value)) throw new CompilerError(ruleExpr.range, `Unknown rule '${ruleExpr.value}'.`, filePath);
        const rule = dictionary.Rules.find(r => r.name === ruleExpr.value);

        if (rule.type === 'boolean') {
            const boolEx = parseExpression(false, false, true) as Expression;
            if (!(boolEx.type === NodeType.String && dictionary.RuleTypeRegexes.boolean.test(boolEx.value))) { throw new CompilerError(boolEx.range, `Rule '${rule.name}' requires a boolean value, found '${boolEx.value}'.`, filePath); }


            if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, `Expected semicolon after rule statement, found '${at().value}'.`, filePath);
            return node({ type: NodeType.Rule, rule: ruleExpr.value, value: boolEx.value, range: combineTwo(token, tokens.shift()) }, put);
        } else if (rule.type === 'keyword') {
            const keyEx = parseExpression(false, false, true) as Expression;
            if (!(
                keyEx.type === NodeType.String &&
                program.body.some(s =>
                    (s.type === NodeType.Keyword && (s as KeywordStatement).word === keyEx.value) ||
                    (s.type === NodeType.Export && (s as ExportStatement).body.type === NodeType.Keyword && ((s as ExportStatement).body as KeywordStatement).word === keyEx.value)
                )
            )) throw new CompilerError(keyEx.range, `Can't find keyword '${keyEx.value}'.`, filePath, caf.mk(keyEx.value, program, keyEx.range, filePath));

            if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, `Expected semicolon after rule statement, found ${at().value}.`, filePath);
            return node({ type: NodeType.Rule, rule: ruleExpr.value, value: keyEx.value, range: combineTwo(token, tokens.shift()) }, put);
        }
    }

    /**
     * Parses a keyword statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseKeywordStatement({ parseExpression, at, tokens, node, combineTwo, filePath }: parser, put: boolean, token: Token): Node {
        const ex = parseExpression(false, false, true) as Expression;
        if (ex.type !== NodeType.String) throw new CompilerError(ex.range, `Expected identifier after keyword statement, found '${ex.value}'.`, filePath);
        if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, `Expected ';' after statement, found '${at().value}'.`, filePath);
        tokens.shift(); // skip semicolon
        return node({ type: NodeType.Keyword, word: ex.value, range: combineTwo(token, ex.range) }, put);
    }

    /**
     * Parses an export statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseExportStatement({ parseStatement, node, combineTwo, filePath }: parser, token: Token, put: boolean, exportable: NodeType[]): Node {
        const stmt = parseStatement(false);
        if (!exportable.includes(stmt.type)) throw new CompilerError(stmt.range, 'Expected exportable statement after \'export\'.', filePath);
        return node({ type: NodeType.Export, body: stmt, range: combineTwo(token, stmt.range) }, put);
    }

    /**
     * Parses a function statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseFunctionStatement({ at, tokens, filePath, parseExpression, combineTwo, node }: parser, token: Token, put: boolean, dr: Range): Node {
        const statement: FunctionStatement = { type: NodeType.Function, arguments: [], name: '', body: [], range: dr };

        if (at().type !== TokenType.Identifier) throw new CompilerError(at().range, `Expected identifier after function statement, found '${at().value}'.`, filePath);
        statement.name = at().value;
        tokens.shift();

        while (at().type !== TokenType.OpenBrace) {
            const expr = parseExpression(false, false) as Expression;
            if (expr.type !== NodeType.PrimitiveType) throw new CompilerError(expr.range, `Expected argument types after function name, found ${expr.value}.`, filePath);
            statement.arguments.push((expr as PrimitiveTypeExpression).value);
        }

        const braceExpr = parseExpression(false);
        if (braceExpr.type !== NodeType.Brace) throw new CompilerError(braceExpr.range, 'Function statement requires braces.', filePath);
        braceExpr.body.forEach(s => { if (!([NodeType.Compile, NodeType.Imports].includes(s.type))) throw new CompilerError(s.range, 'Statement not allowed inside a function statement.', filePath); });

        statement.body = braceExpr.body;
        statement.range = combineTwo(token, braceExpr.range);

        return node(statement, put);
    }

    /**
     * Parses an imports statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseImportsStatement({ at, filePath, tokens, parseExpression, combineTwo, node }: parser, token: Token, put: boolean, dr: Range) {
        const statement: ImportsStatement = { type: NodeType.Imports, formats: [], module: '', range: dr };

        if (at().type !== TokenType.OpenParen) throw new CompilerError(at().range, 'Imports statement require parens.', filePath);

        tokens.shift(); // skip OpenParen
        while (at().type !== TokenType.CloseParen) {
            const t = tokens.shift();

            if (t.type === TokenType.Comma && at().type !== TokenType.Identifier) throw new CompilerError(t.range, 'Expected identifier after comma.', filePath);
            else if (t.type === TokenType.Comma && statement.formats.length === 0) throw new CompilerError(t.range, 'Can\'t start with comma.', filePath);
            else if (t.type === TokenType.Comma) { }
            else if (t.type === TokenType.Identifier) statement.formats.push(t.value);
            else throw new CompilerError(t.range, `Expected comma or identifier, found '${t.value}'.`, filePath);
        }
        tokens.shift(); // skip CloseParen

        if (statement.formats.length === 0) throw new CompilerError(token.range, 'At least one file type is required.', filePath);


        const moduleExpr = parseExpression(false, false) as Expression;

        if (moduleExpr.type !== NodeType.String) throw new CompilerError(moduleExpr.range, `Expected string after parens of imports statement, found '${moduleExpr.value}'.`, filePath);

        statement.module = moduleExpr.value;
        statement.range = combineTwo(token, moduleExpr.range);

        if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, `Expected ';' after imports statement, found '${at().value}'.`, filePath);
        tokens.shift();

        return node(statement, put);
    }

    /**
     * Parses a compile statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseCompileStatement({ at, tokens, filePath, parseExpression, combineTwo, node }: parser, token: Token, dr: Range, put: boolean): Node {
        const statement: CompileStatement = { type: NodeType.Compile, formats: [], body: [], range: dr };

        if (at().type !== TokenType.OpenParen) throw new CompilerError(at().range, 'Compile statement require parens.', filePath);

        tokens.shift(); // skip OpenParen
        while (at().type !== TokenType.CloseParen) {
            const t = tokens.shift();

            if (t.type === TokenType.Comma && at().type !== TokenType.Identifier) throw new CompilerError(t.range, 'Expected identifier after comma.', filePath);
            else if (t.type === TokenType.Comma && statement.formats.length === 0) throw new CompilerError(t.range, 'Can\'t start with comma.', filePath);
            else if (t.type === TokenType.Comma) { }
            else if (t.type === TokenType.Identifier) statement.formats.push(t.value);
            else throw new CompilerError(t.range, `Expected comma or identifier, found '${t.value}'.`, filePath);
        }
        tokens.shift(); // skip CloseParen

        if (statement.formats.length === 0) throw new CompilerError(token.range, 'At least one file type is required.', filePath);

        while (at().type !== TokenType.Semicolon) {
            const expr = parseExpression(false, false);
            statement.body.push(expr as Expression);
        }
        statement.range = combineTwo(token, tokens.shift()); // Skip semicolon and make it the end of the range.

        return node(statement, put);
    }

    /**
     * Parses an operator statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseOperatorStatement({ at, parseExpression, combineTwo, node, filePath }: parser, token: Token, dr: Range, put: boolean) {
        const statement: OperatorStatement = { type: NodeType.Operator, regex: [], body: [], range: dr };


        while (at().type !== TokenType.OpenBrace) {
            const ex = parseExpression(false);
            statement.regex.push(ex);
        }

        const braceExpr = parseExpression(false);
        if (braceExpr.type !== NodeType.Brace) throw new CompilerError(braceExpr.range, 'Expected braces after operator regex.', filePath);
        braceExpr.body.forEach(s => { if (!([NodeType.Compile, NodeType.Imports].includes(s.type))) throw new CompilerError(s.range, 'Statement not allowed inside of operator statement.'); }, filePath);

        statement.body = braceExpr.body;
        statement.range = combineTwo(token, braceExpr.range);

        return node(statement, put);
    }
}

namespace ExpressionParser {

    /**
     * Parses a single quote string expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
     * @returns Parsed node.
    */
    export function parseSingleQuotedString({ at, tokens, node, combineTwo, filePath }: parser, put: boolean) {
        let s = '';
        const { range } = at();

        tokens.shift();
        while (at().type !== TokenType.SingleQuote) {
            const _t = tokens.shift();
            if (_t.type === TokenType.EndOfFile) throw new CompilerError(combineTwo(range, { start: { line: 0, character: 0 }, end: { character: range.end.character + s.length, line: range.end.line } }), 'Strings must be closed.', filePath);

            s += _t.value;
        }

        return node({ type: NodeType.String, value: s, range: combineTwo(range, tokens.shift()) }, put);
    }

    /**
     * Parses a double quote string expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
     * @returns Parsed node.
    */
    export function parseDoubleQuotedString({ at, tokens, node, combineTwo, filePath }: parser, put: boolean) {
        let s = '';
        const { range } = at();

        tokens.shift();
        while (at().type !== TokenType.DoubleQuote) {
            const _t = tokens.shift();
            if (_t.type === TokenType.EndOfFile) throw new CompilerError(combineTwo(range, { start: { line: 0, character: 0 }, end: { character: range.end.character + s.length, line: range.end.line } }), 'Strings must be closed.', filePath);

            s += _t.value;
        }

        return node({ type: NodeType.String, value: s, range: combineTwo(range, tokens.shift()) }, put);
    }

}