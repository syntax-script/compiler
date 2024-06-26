import { Position, Range } from 'lsp-types';
import { Token, TokenType } from './types.js';

const keywords: Record<string, TokenType> = {
    operator: TokenType.OperatorKeyword,
    compile: TokenType.CompileKeyword,
    import: TokenType.ImportKeyword,
    imports: TokenType.ImportsKeyword,
    export: TokenType.ExportKeyword,
    global: TokenType.GlobalKeyword,
    class: TokenType.ClassKeyword,
    function: TokenType.FunctionKeyword,
    keyword: TokenType.KeywordKeyword,
    rule: TokenType.RuleKeyword
};

const chars = ['s'];

/**
 * Determines whether the given source is an alphabetic identifier.
 * @param {string} src The source string. 
 * @returns Whether the identifier matches `/^[a-zA-Z]+$/`.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
function isAlphabetic(src: string) {
    return src.match(/^[a-zA-Z]+$/);
}

/**
 * Determines whether the given source can be skippable by tokenizers.
 * @param {string} src Source string.
 * @returns Whether the source matches `/^\s|\\n|\\t$/`.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
function isSkippable(src: string) {
    return src.match(/^\s|\\n|\\t$/);
}

/**
 * Determines whether the given source is a number.
 * @param {string} src Source string.
 * @returns Whether the source matches `/^[0-9]+$/`.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
function isInt(src: string) {
    return src.match(/^[0-9]+$/);
}

function opr(line: number, character: number): Range {
    return { end: { line, character: character + 1 }, start: { line, character: character } };
}

function pos(line: number, character: number): Position {
    return { line, character };
}

function tpr(start: Position, end: Position): Range {
    return { end, start };
}

/**
 * Tokenizes a .syx file.
 * @param {string} source Source string.
 * @returns A list of tokens generated from source string.
 * @author efekos
 * @version 1.0.9
 * @since 0.0.2-alpha
 */
export function tokenizeSyx(source: string): Token[] {
    const tokens: Token[] = [];
    const src = source.split('');
    let lastString = 'n';
    let inString = false;
    function t(s: string) {
        if (lastString === 'n') { lastString = s; inString = true; }
        else if (lastString === '\'' && s === '\'' || (lastString === '"' && s === '"')) { lastString = 'n'; inString = false; };
    }
    let curPos = 1;
    let curLine = 1;

    while (src.length > 0) {
        if (src[0] === '/' && src[1] === '/' && !inString) {
            while (src.length > 0 && src[0] as string !== '\n') {
                src.shift();
                curPos++;
            }
        }
        if (src[0] === '(') tokens.push({ type: inString ? 20 : TokenType.OpenParen, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === ')') tokens.push({ type: inString ? 20 : TokenType.CloseParen, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === '{') tokens.push({ type: inString ? 20 : TokenType.OpenBrace, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === '}') tokens.push({ type: inString ? 20 : TokenType.CloseBrace, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === '[') tokens.push({ type: inString ? 20 : TokenType.OpenSquare, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === ']') tokens.push({ type: inString ? 20 : TokenType.CloseSquare, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === ',') tokens.push({ type: inString ? 20 : TokenType.Comma, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === ';') tokens.push({ type: inString ? 20 : TokenType.Semicolon, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === '<') tokens.push({ type: inString ? 20 : TokenType.OpenDiamond, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === '>') tokens.push({ type: inString ? 20 : TokenType.CloseDiamond, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === '\'') { tokens.push({ type: TokenType.SingleQuote, value: src.shift(), range: opr(curLine, curPos++) }); t('\''); }
        else if (src[0] === '"') { tokens.push({ type: TokenType.DoubleQuote, value: src.shift(), range: opr(curLine, curPos++) }); t('"'); }
        else if (src[0] === '|') tokens.push({ type: inString ? 20 : TokenType.VarSeperator, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === '+' && chars.includes(src[1])) {
            if (src[1] === 's') tokens.push({ type: inString ? 20 : TokenType.WhitespaceIdentifier, value: '+s', range: tpr(pos(curLine, curPos), pos(curLine, curPos + 2)) });
            curPos += 2;
            src.shift(); src.shift();
        } else if (isInt(src[0])) {
            let ident = '';
            const startPos = curPos;
            while (src.length > 0 && isInt(src[0])) {
                ident += src.shift();
            }

            curPos += ident.length;
            tokens.push({ type: inString ? 20 : TokenType.IntNumber, value: ident, range: tpr(pos(curLine, startPos), pos(curLine, curPos)) });
        } else if (isAlphabetic(src[0])) {
            let ident = '';
            const startPos = curPos;
            while (src.length > 0 && isAlphabetic(src[0])) {
                ident += src.shift();
                curPos++;
            }

            const reserved = keywords[ident];
            tokens.push({ type: inString ? 20 : reserved ?? TokenType.Identifier, value: ident, range: tpr(pos(curLine, startPos), pos(curLine, curPos)) });
        } else if (isSkippable(src[0]) && !inString) {
            src.shift();
            curPos++;
            if (src[0] === '\n') { curLine++; curPos = 0; };
        }
        else tokens.push({ type: TokenType.Raw, value: src.shift(), range: opr(curLine, curPos++) });
    }

    tokens.push({ type: TokenType.EndOfFile, value: 'EOF', range: opr(curLine, 0) });
    return tokens;
}

/**
 * Tokenizes a .sys file. Stops when the file end marker (:::) is encountered.
 * @param {string} source Source string.
 * @returns A list of tokens generated from the source file.
 * @author efekos
 * @version 1.0.6
 * @since 0.0.2-alpha
 */
export function tokenizeSys(source: string): Token[] {
    const src = source.split('');
    const tokens: Token[] = [];
    let lastString = 'n';
    let inString = false;
    function t(s: string) {
        if (lastString === 'n') { lastString = s; inString = true; }
        else if (lastString === '\'' && s === '\'' || (lastString === '"' && s === '"')) { lastString = 'n'; inString = false; };
    }

    let curPos = 0;
    let curLine = 1;

    while (src.length > 0 && `${src[0]}${src[1]}${src[2]}` !== ':::') {
        if (src[0] === ';') tokens.push({ type: inString ? 20 : TokenType.Semicolon, value: src.shift(), range: opr(curLine, curPos++) });
        else if (src[0] === '\'') { tokens.push({ type: TokenType.SingleQuote, value: src.shift(), range: opr(curLine, curPos++) }); t('\''); }
        else if (src[0] === '"') { tokens.push({ type: TokenType.DoubleQuote, value: src.shift(), range: opr(curLine, curPos++) }); t('"'); }
        else if (isAlphabetic(src[0])) {
            let ident = '';
            const startPos = curPos;
            while (src.length > 0 && isAlphabetic(src[0])) {
                ident += src.shift();
                curPos++;
            }

            const reserved = keywords[ident];
            tokens.push({ type: reserved ?? TokenType.Identifier, value: ident, range: tpr(pos(curLine, startPos), pos(curLine, curPos)) });
        } else if (isSkippable(src[0]) && !inString) {
            src.shift();
            curPos++;
            if (src[0] === '\n') curLine++;
        }
        else tokens.push({ type: TokenType.Raw, value: src.shift(), range: opr(curLine, curPos++) });

    }

    tokens.push({ type: TokenType.EndOfFile, value: 'eof', range: opr(curLine, curPos++) });
    return tokens;
}