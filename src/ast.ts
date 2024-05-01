import { BraceExpression, CompileStatement, CompilerError, Expression, FunctionStatement, GlobalStatement, ImportsStatement, KeywordStatement, Node, NodeType, OperatorStatement, ParenExpression, ProgramStatement, SquareExpression, StringExpression, Token, TokenType, VariableExpression, statementIsA } from './types.js';
import { CodeAction, CodeActionKind, Range } from 'lsp-types';
import { dictionary } from './dictionary/dictionary.js';
import levenshtein from 'js-levenshtein';
import { subRange } from './diagnostic.js';

const caf = {
    mk: (keyword: string, program: ProgramStatement, range: Range, filePath: string): CodeAction[] => {
        const existingKeywords = program.body
            .filter(r => statementIsA(r, NodeType.Keyword))
            .map(r => r as KeywordStatement)
            .map(r => r.word)
            .sort(a => levenshtein(keyword, a.value));

        return existingKeywords.map(word => {
            return {
                title: `Replace with '${word}'`,
                kind: CodeActionKind.QuickFix,
                edit: {
                    changes: {
                        [filePath]: [{
                            range: subRange(range),
                            newText: word.value
                        }]
                    }
                }
            };
        });
    }
};

export namespace syxparser {


    //#                                                             
    //#                     STATEMENT PARSERS                       
    //#                                                             
    /**
      * Parses an import statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
      * @returns Parsed node.
      */
    export function parseImportStatement(put: boolean, token: Token): Node {
        const ex = parseExpression(false, false);
        if (!statementIsA(ex, NodeType.String)) throw new CompilerError(ex.range, 'Expected file path after import statement.', filePath);
        if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, dictionary.ErrorMessages.misingSemicolon, filePath);
        tokens.shift();
        return node({ type: NodeType.Import, path: ex, range: combineTwo(token, ex.range), modifiers: [] }, put);
    }

    /**
     * Parses an import statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseRuleStatement(token: Token, put: boolean): Node {
        const ruleExpr = parseExpression(false, false) as Expression;
        if (!statementIsA(ruleExpr, NodeType.String)) throw new CompilerError(ruleExpr.range,dictionary.ErrorMessages.expectedString(ruleExpr.value), filePath);
        if (at().value !== ':') throw new CompilerError(at().range, `Expected \':\' after rule name, found ${at().value}.`, filePath);
        tokens.shift();
        if (!dictionary.Rules.some(r => r.name === ruleExpr.value)) throw new CompilerError(ruleExpr.range, `Unknown rule '${ruleExpr.value}'.`, filePath);
        const rule = dictionary.Rules.find(r => r.name === ruleExpr.value);

        if (rule.type === 'boolean') {
            const boolEx = parseExpression(false, false, true) as Expression;
            if (!(statementIsA(boolEx, NodeType.Identifier) && dictionary.RuleTypeRegexes.boolean.test(boolEx.value))) throw new CompilerError(boolEx.range, dictionary.ErrorMessages.expectedBoolean(boolEx.value), filePath);

            if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, dictionary.ErrorMessages.misingSemicolon, filePath);
            tokens.shift();
            return node({ type: NodeType.Rule, rule: ruleExpr, value: boolEx.value, range: combineTwo(token, boolEx.range), modifiers: [] }, put);
        } else if (rule.type === 'keyword') {
            const keyEx = parseExpression(false, false, true);
            if (!statementIsA(keyEx, NodeType.Identifier)) throw new CompilerError(keyEx.range, 'Expected keyword.', filePath);
            if (!program.body.some(s => statementIsA(s, NodeType.Keyword) && s.word.value === keyEx.value)) throw new CompilerError(keyEx.range, `Can't find keyword '${keyEx.value}'.`, filePath, caf.mk(keyEx.value, program, keyEx.range, filePath));

            if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, dictionary.ErrorMessages.misingSemicolon, filePath);
            tokens.shift();
            return node({ type: NodeType.Rule, rule: ruleExpr, value: keyEx.value, range: combineTwo(token, token), modifiers: [] }, put);
        }
    }

    /**
     * Parses a keyword statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseKeywordStatement(put: boolean, token: Token): Node {
        const ex = parseExpression(false, false, true);
        if (!statementIsA(ex, NodeType.Identifier)) throw new CompilerError(ex.range, 'Expected identifier after keyword statement.', filePath);

        if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, dictionary.ErrorMessages.misingSemicolon, filePath);
        tokens.shift(); // skip semicolon

        return node({ type: NodeType.Keyword, word: ex, range: combineTwo(token, ex.range), modifiers: [] }, put);
    }

    /**
     * Parses an export statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseExportStatement(token: Token, put: boolean): Node {
        const stmt = parseStatement(false);
        stmt.range = combineTwo(token, stmt.range);
        stmt.modifiers.push(token);
        return node(stmt, put);
    }

    /**
     * Parses a function statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseFunctionStatement(token: Token, put: boolean): Node {
        const statement: FunctionStatement = { type: NodeType.Function, arguments: [], name: {type:NodeType.Identifier,modifiers:[],value:'',range:defaultRange}, body: [], range: defaultRange, modifiers: [] };

        if (at().type !== TokenType.Identifier) throw new CompilerError(at().range, `Expected identifier after function statement, found '${at().value}'.`, filePath);
        statement.name = {type:NodeType.Identifier,modifiers:[],range:at().range,value:at().value};
        tokens.shift();

        while (at().type !== TokenType.OpenBrace) {
            const expr = parseExpression(false, false) as Expression;
            if (!statementIsA(expr, NodeType.PrimitiveType)) throw new CompilerError(expr.range, `Expected argument types after function name, found ${expr.value}.`, filePath);
            statement.arguments.push(expr);
        }

        const braceExpr = parseExpression(false);
        if (!statementIsA(braceExpr, NodeType.Brace)) throw new CompilerError(braceExpr.range, 'Function statement requires braces.', filePath);
        braceExpr.body.forEach(s => { if (!([NodeType.Compile, NodeType.Imports].includes(s.type))) throw new CompilerError(s.range, 'Statement not allowed inside a function statement.', filePath); });

        statement.body = braceExpr.body;
        statement.range = combineTwo(token, braceExpr.range);

        return node(statement, put);
    }

    /**
     * Parses an imports statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseImportsStatement(token: Token, put: boolean) {
        const statement: ImportsStatement = { type: NodeType.Imports, formats: [], module: {type:NodeType.String,modifiers:[],range:defaultRange,value:''}, range: defaultRange, modifiers: [] };

        if (at().type !== TokenType.OpenParen) throw new CompilerError(at().range, 'Imports statement require parens.', filePath);

        tokens.shift(); // skip OpenParen
        while (at().type !== TokenType.CloseParen) {
            const t = tokens.shift();

            if (t.type === TokenType.Comma && at().type !== TokenType.Identifier) throw new CompilerError(t.range, 'Expected identifier after comma.', filePath);
            else if (t.type === TokenType.Comma && statement.formats.length === 0) throw new CompilerError(t.range, 'Can\'t start with comma.', filePath);
            else if (t.type === TokenType.Comma) { }
            else if (t.type === TokenType.Identifier) statement.formats.push({type:NodeType.Identifier,modifiers:[],range:t.range,value:t.value});
            else throw new CompilerError(t.range, `Expected comma or identifier, found '${t.value}'.`, filePath);
        }
        tokens.shift(); // skip CloseParen

        if (statement.formats.length === 0) throw new CompilerError(token.range, 'At least one file type is required.', filePath);


        const moduleExpr = parseExpression(false, false) as Expression;

        if (!statementIsA(moduleExpr, NodeType.String)) throw new CompilerError(moduleExpr.range, dictionary.ErrorMessages.expectedString(moduleExpr.value), filePath);

        statement.module = moduleExpr;
        statement.range = combineTwo(token, moduleExpr.range);

        if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, dictionary.ErrorMessages.misingSemicolon, filePath);
        tokens.shift();

        return node(statement, put);
    }

    /**
     * Parses a compile statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseCompileStatement(token: Token, put: boolean): Node {
        const statement: CompileStatement = { type: NodeType.Compile, formats: [], body: [], range: defaultRange, modifiers: [] };

        if (at().type !== TokenType.OpenParen) throw new CompilerError(at().range, 'Compile statement require parens.', filePath);

        tokens.shift(); // skip OpenParen
        while (at().type !== TokenType.CloseParen) {
            const t = tokens.shift();

            if (t.type === TokenType.Comma && at().type !== TokenType.Identifier) throw new CompilerError(t.range, 'Expected identifier after comma.', filePath);
            else if (t.type === TokenType.Comma && statement.formats.length === 0) throw new CompilerError(t.range, 'Can\'t start with comma.', filePath);
            else if (t.type === TokenType.Comma) { }
            else if (t.type === TokenType.Identifier) statement.formats.push({type:NodeType.Identifier,modifiers:[],range:t.range,value:t.value});
            else throw new CompilerError(t.range, `Expected comma or identifier, found '${t.value}'.`, filePath);
        }
        tokens.shift(); // skip CloseParen

        if (statement.formats.length === 0) throw new CompilerError(token.range, 'At least one file type is required.', filePath);

        while (at().type !== TokenType.Semicolon) {
            const expr = parseExpression(false, false);
            statement.body.push(expr as Expression);
            statement.range = combineTwo(token, expr.range);
        }
        tokens.shift();

        return node(statement, put);
    }

    /**
     * Parses an operator statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseOperatorStatement(token: Token, put: boolean) {
        const statement: OperatorStatement = { type: NodeType.Operator, regex: [], body: [], range: defaultRange, modifiers: [] };


        while (at().type !== TokenType.OpenBrace) {
            const ex = parseExpression(false);
            statement.regex.push(ex);
        }

        const braceExpr = parseExpression(false);
        if (!statementIsA(braceExpr, NodeType.Brace)) throw new CompilerError(braceExpr.range, 'Expected braces after operator regex.', filePath);
        braceExpr.body.forEach(s => { if (!([NodeType.Compile, NodeType.Imports].includes(s.type))) throw new CompilerError(s.range, 'Statement not allowed inside of operator statement.'); }, filePath);

        statement.body = braceExpr.body;
        statement.range = combineTwo(token, braceExpr.range);

        return node(statement, put);
    }

    /**
     * Parses an operator statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
     * @returns Parsed node.
     */
    export function parseGlobalStatement(token: Token, put: boolean) {
        const stmt: GlobalStatement = { type: NodeType.Global, range: token.range, body: [], modifiers: [], name: {type:NodeType.Identifier,modifiers:[],range:defaultRange,value:''} };

        if (at().type !== TokenType.Identifier) throw new CompilerError(at().range, `Expected identifier after function statement, found '${at().value}'.`, filePath);
        const {range,value} = tokens.shift();
        stmt.name = {modifiers:[],type:NodeType.Identifier,range,value};

        const braceExpr = parseExpression(false, false, false);
        if (!statementIsA(braceExpr, NodeType.Brace)) throw new CompilerError(braceExpr.range, 'Expected braces after global name.', filePath);

        stmt.body = braceExpr.body;
        stmt.range = combineTwo(token, braceExpr.range);
        return node(stmt, put);
    }


    //#                                                              
    //#                     EXPRESSION PARSERS                       
    //#                                                              
    /**
     * Parses a single quote string expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
     * @returns Parsed node.
    */
    export function parseSingleQuotedString(put: boolean) {
        let s = '';
        const { range } = at();

        tokens.shift();
        while (at().type !== TokenType.SingleQuote) {
            const _t = tokens.shift();
            if (_t.type === TokenType.EndOfFile) throw new CompilerError(combineTwo(range, { start: { line: 0, character: 0 }, end: { character: range.end.character + s.length, line: range.end.line } }), 'Strings must be closed.', filePath);

            s += _t.value;
        }

        return node({ type: NodeType.String, value: s, range: combineTwo(range, tokens.shift()), modifiers: [] }, put);
    }

    /**
     * Parses a double quote string expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
     * @returns Parsed node.
    */
    export function parseDoubleQuotedString(put: boolean) {
        let s = '';
        const { range } = at();

        tokens.shift();
        while (at().type !== TokenType.DoubleQuote) {
            const _t = tokens.shift();
            if (_t.type === TokenType.EndOfFile) throw new CompilerError(combineTwo(range, { start: { line: 0, character: 0 }, end: { character: range.end.character + s.length, line: range.end.line } }), 'Strings must be closed.', filePath);

            s += _t.value;
        }

        return node({ type: NodeType.String, value: s, range: combineTwo(range, tokens.shift()), modifiers: [] }, put);
    }

    /**
     * Parses a primitive type expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
     * @returns Parsed node.
    */
    export function parsePrimitiveType(primitiveTypes: RegExp, put: boolean): Node {
        const newToken = at(1);
        if (newToken.type !== TokenType.Identifier) throw new CompilerError(newToken.range, `Expected identifier after '<', found '${newToken.value}'.`, filePath);
        if (!primitiveTypes.test(newToken.value)) throw new CompilerError(newToken.range, `Expected primitive type identifier after '<', found '${newToken.value}'`, filePath);
        if (at(2).type !== TokenType.CloseDiamond) throw new CompilerError(at(2).range, `Expected '>' after primitive type identifier, found '${at(2).value}'`, filePath);
        const t = tokens.shift();
        tokens.shift();
        return node({ type: NodeType.PrimitiveType, value: newToken.value, range: combineTwo(t, tokens.shift()), modifiers: [] }, put);
    }

    /**
     * Parses a whitespace identifier expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
     * @returns Parsed node.
    */
    export function parseWhitespaceIdentifier(put: boolean): Node {
        const { range } = tokens.shift();
        return node({ type: NodeType.WhitespaceIdentifier, value: '+s', range, modifiers: [] }, put);
    }

    /**
     * Parses a brace expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
     * @returns Parsed node.
    */
    export function parseBraceExpression(put: boolean, dr: Range) {
        const { range } = tokens.shift();

        const expr: BraceExpression = { type: NodeType.Brace, body: [], value: '{', range: dr, modifiers: [] };

        while (at().type !== TokenType.CloseBrace) {
            const stmt = parseStatement(false);
            expr.body.push(stmt);
        }
        expr.range = combineTwo(range, tokens.shift());
        return node(expr, put);
    }

    /**
         * Parses a square expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
         * @returns Parsed node.
        */
    export function parseSquareExpression(put: boolean, dr: Range) {
        const { range } = tokens.shift();

        const expr: SquareExpression = { type: NodeType.Square, body: [], value: '[', range: dr, modifiers: [] };

        while (at().type !== TokenType.CloseSquare) {
            const stmt = parseStatement(false);
            expr.body.push(stmt);
        }
        expr.range = combineTwo(range, tokens.shift());
        return node(expr, put);
    }

    /**
         * Parses a paren expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
         * @returns Parsed node.
        */
    export function parseParenExpression(put: boolean, dr: Range) {
        const { range } = tokens.shift();

        const expr: ParenExpression = { type: NodeType.Paren, body: [], value: '(', range: dr, modifiers: [] };

        while (at().type !== TokenType.CloseParen) {
            const stmt = parseStatement(false);
            expr.body.push(stmt);
        }
        expr.range = combineTwo(range, tokens.shift());
        return node(expr, put);
    }

    /**
     * Parses a primitive variable expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
     * @returns Parsed node.
    */
    export function parsePrimitiveVariable(put: boolean) {

        if (at(2).type !== TokenType.IntNumber) throw new CompilerError(at(2).range, `Expected index after ${at().value} variable, found ${at(2).value}.`, filePath);

        const id = tokens.shift(); // id
        tokens.shift(); // sep
        const index = tokens.shift(); // index
        const expr: VariableExpression = { index: parseInt(index.value), type: NodeType.Variable, value: id.value, range: combineTwo(id, index), modifiers: [] };

        return node(expr, put);
    }


    //#                                                             
    //#                       ACTUAL PARSER                         
    //#                                                             
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
     * @version 1.0.4
     * @since 0.0.2-alpha
     */
    export function parseTokens(t: Token[], _filePath: string): ProgramStatement {
        tokens = t;

        const eof = t.find(r => r.type === TokenType.EndOfFile);
        program = { body: [], type: NodeType.Program, range: { end: eof.range.end, start: { line: 0, character: 0 } }, modifiers: [] };
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
     * @version 1.1.0
     * @since 0.0.2-alpha
     */
    export function parseStatement(put: boolean = true): Node {
        if (keywords.includes(at().type)) {
            const token = at();
            tokens.shift();

            switch (token.type) {
                case TokenType.ImportKeyword: return parseImportStatement(put, token);
                case TokenType.OperatorKeyword: return parseOperatorStatement(token, put);
                case TokenType.CompileKeyword: return parseCompileStatement(token, put);
                case TokenType.ExportKeyword: return parseExportStatement(token, put);
                case TokenType.ImportsKeyword: return parseImportsStatement(token, put);
                case TokenType.FunctionKeyword: return parseFunctionStatement(token, put);
                case TokenType.KeywordKeyword: return parseKeywordStatement(put, token);
                case TokenType.RuleKeyword: return parseRuleStatement(token, put);
                case TokenType.GlobalKeyword: return parseGlobalStatement(token, put);
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
     * @version 1.1.0
     * @since 0.0.2-alpha
     */
    export function parseExpression(put: boolean = true, statements: boolean = true, expectIdentifier: boolean = false): Node {
        const tt = at().type;

        switch (tt) {
            case TokenType.SingleQuote: return parseSingleQuotedString(put);
            case TokenType.DoubleQuote: return parseDoubleQuotedString(put);
            case TokenType.OpenDiamond: return parsePrimitiveType(primitiveTypes, put);
            case TokenType.WhitespaceIdentifier: return parseWhitespaceIdentifier(put);
            case TokenType.OpenBrace: return parseBraceExpression(put, defaultRange);
            case TokenType.OpenSquare: return parseSquareExpression(put, defaultRange);
            case TokenType.OpenParen: return parseParenExpression(put, defaultRange);
            case TokenType.Identifier:
                if (at(1).type === TokenType.VarSeperator) return parsePrimitiveVariable(put);
                else if (keywords.includes(tt)) {
                    if (!statements) throw new CompilerError(at().range, 'Statement not allowed here.', filePath);
                    return parseStatement();
                } else if (expectIdentifier) {
                    const { value, range } = tokens.shift();
                    return node({ type: NodeType.Identifier, value, range, modifiers: [] }, put);
                }
        }

        throw new CompilerError(at().range, `Unexpected expression: '${at().value}'`, filePath);


    }

    const primitiveTypes = /^(int|string|boolean|decimal)$/;

    const keywords = [TokenType.ImportKeyword, TokenType.ExportKeyword, TokenType.CompileKeyword, TokenType.OperatorKeyword, TokenType.ImportsKeyword, TokenType.GlobalKeyword, TokenType.FunctionKeyword, TokenType.KeywordKeyword, TokenType.RuleKeyword];

}



export namespace sysparser {


    //#                                                             
    //#                     STATEMENT PARSERS                       
    //#                                                             
    /**
      * Parses an import statement. Parameters are related to the environment of {@link syxparser.parseStatement} or {@link sysparser.parseStatement}. 
      * @returns Parsed node.
      */
    export function parseImportStatement(put: boolean, token: Token): Node {
        const ex = parseExpression(false, false);
        if (!statementIsA(ex, NodeType.String)) throw new CompilerError(ex.range, 'Expected file path after import statement.', filePath);
        if (at().type !== TokenType.Semicolon) throw new CompilerError(at().range, dictionary.ErrorMessages.misingSemicolon, filePath);
        tokens.shift();
        return node({ type: NodeType.Import, path: ex, range: combineTwo(token, ex.range), modifiers: [] }, put);
    }

    //#                                                              
    //#                     EXPRESSION PARSERS                       
    //#                                                              
    /**
     * Parses a single quote string expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
     * @returns Parsed node.
    */
    export function parseSingleQuotedString(put: boolean) {
        let s = '';
        const { range } = at();

        tokens.shift();
        while (at().type !== TokenType.SingleQuote) {
            const _t = tokens.shift();
            if (_t.type === TokenType.EndOfFile) throw new CompilerError(combineTwo(range, { start: { line: 0, character: 0 }, end: { character: range.end.character + s.length, line: range.end.line } }), 'Strings must be closed.', filePath);

            s += _t.value;
        }

        return node({ type: NodeType.String, value: s, range: combineTwo(range, tokens.shift()), modifiers: [] }, put);
    }

    /**
     * Parses a double quote string expression. Parameters are related to the environment of {@link syxparser.parseExpression} or {@link sysparser.parseExpression}. 
     * @returns Parsed node.
    */
    export function parseDoubleQuotedString(put: boolean) {
        let s = '';
        const { range } = at();

        tokens.shift();
        while (at().type !== TokenType.DoubleQuote) {
            const _t = tokens.shift();
            if (_t.type === TokenType.EndOfFile) throw new CompilerError(combineTwo(range, { start: { line: 0, character: 0 }, end: { character: range.end.character + s.length, line: range.end.line } }), 'Strings must be closed.', filePath);

            s += _t.value;
        }

        return node({ type: NodeType.String, value: s, range: combineTwo(range, tokens.shift()), modifiers: [] }, put);
    }


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
     * @version 1.0.3
     * @since 0.0.2-alpha
     */
    export function parseTokens(t: Token[], _filePath: string): ProgramStatement {
        tokens = t;

        const eof = t.find(r => r.type === TokenType.EndOfFile);
        program = { body: [], type: NodeType.Program, range: { start: { character: 0, line: 0 }, end: eof.range.end }, modifiers: [] };
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

            if (token.type === TokenType.ImportKeyword) return parseImportStatement(put, token);

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

        if (tt === TokenType.SingleQuote) return parseSingleQuotedString(put);
        else if (tt === TokenType.DoubleQuote) return parseDoubleQuotedString(put);
        else if (keywords.includes(tt)) {
            if (!statements) throw new CompilerError(at().range, 'Statements are not allowed here.', filePath);
            return parseStatement();
        }
        else throw new CompilerError(at().range, `Unexpected expression: '${at().value}'`, filePath);


    }

    const keywords = [TokenType.ImportKeyword];

}