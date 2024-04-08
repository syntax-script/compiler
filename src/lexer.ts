import { CompilerError, Token, TokenType } from './types.js';

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

/**
 * Tokenizes a .syx file.
 * @param {string} source Source string.
 * @param {boolean} watchMode Whether is it watch mode or not. Errors will throw an error instead of exiting if this value is set to `true`.
 * @returns A list of tokens generated from source string.
 * @author efekos
 * @version 1.0.4
 * @since 0.0.1-alpha
 * @throws LexerError if an error occurs.
 */
export function tokenizeSyx(source: string, watchMode: boolean): Token[] {
    const tokens: Token[] = [];
    const src = source.split('');
    let curPos = 0;
    let curLine = 0;

    while (src.length > 0) {
        if (src[0] === '/' && src[1] === '/') {
            while (src.length>0 && src[0] !== '\n') {
                src.shift();
            }
        }
        if (src[0] === '(') tokens.push({ type: TokenType.OpenParen, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === ')') tokens.push({ type: TokenType.CloseParen, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '{') tokens.push({ type: TokenType.OpenBrace, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '}') tokens.push({ type: TokenType.CloseBrace, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '[') tokens.push({ type: TokenType.OpenSquare, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === ']') tokens.push({ type: TokenType.CloseSquare, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === ',') tokens.push({ type: TokenType.Comma, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === ';') tokens.push({ type: TokenType.Semicolon, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '<') tokens.push({ type: TokenType.OpenDiamond, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '>') tokens.push({ type: TokenType.CloseDiamond, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '\'') tokens.push({ type: TokenType.SingleQuote, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '"') tokens.push({ type: TokenType.DoubleQuote, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '|') tokens.push({ type: TokenType.VarSeperator, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '+' && chars.includes(src[1])) {
            if (src[1] === 's') tokens.push({ type: TokenType.WhitespaceIdentifier, value: '+s', pos: curPos, end: curPos + 2, line: curLine });
            else throw new CompilerError({character:curPos,line:curLine},`Unexpected identifier: '${src[1]}'`);
            curPos += 2;
            src.shift(); src.shift();
        } else if (isInt(src[0])) {
            let ident = '';
            const startPos = curPos;
            while (src.length > 0 && isInt(src[0])) {
                ident += src.shift();
            }

            curPos += ident.length;
            tokens.push({ type: TokenType.IntNumber, value: ident, pos: startPos, end: curPos, line: curLine });
        } else if (isAlphabetic(src[0])) {
            let ident = '';
            const startPos = curPos;
            while (src.length > 0 && isAlphabetic(src[0])) {
                ident += src.shift();
                curPos++;
            }

            const reserved = keywords[ident];
            tokens.push({ type: reserved ?? TokenType.Identifier, value: ident, pos: startPos, end: curPos, line: curLine });
        } else if (isSkippable(src[0])) {
            src.shift();
            curPos++;
            if (src[0] === '\n') curLine++;
        }
        else tokens.push({ type: TokenType.Raw, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
    }

    tokens.push({ type: TokenType.EndOfFile, value: 'EOF', pos: source.length, end: source.length, line: curLine });
    return tokens;
}

/**
 * Tokenizes a .sys file. Stops when the file end marker (:::) is encountered.
 * @param {string} source Source string.
 * @returns A list of tokens generated from th esource file.
 * @author efekos
 * @version 1.0.2
 * @since 0.0.1-alpha
 */
export function tokenizeSys(source: string): Token[] {
    const src = source.split('');
    const tokens: Token[] = [];

    let curPos = -1;
    let curLine = 0;

    while (src.length > 0 && `${src[0]}${src[1]}${src[2]}` !== ':::') {
        if (src[0] === ';') tokens.push({ type: TokenType.Semicolon, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '\'') tokens.push({ type: TokenType.SingleQuote, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (src[0] === '"') tokens.push({ type: TokenType.DoubleQuote, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });
        else if (isAlphabetic(src[0])) {
            let ident = '';
            const startPos = curPos;
            while (src.length > 0 && isAlphabetic(src[0])) {
                ident += src.shift();
                curPos++;
            }

            const reserved = keywords[ident];
            tokens.push({ type: reserved ?? TokenType.Identifier, value: ident, pos: startPos, end: curPos, line: curLine });
        } else if (isSkippable(src[0])) {
            src.shift();
            curPos++;
            if (src[0] === '\n') curLine++;
        }
        else tokens.push({ type: TokenType.Raw, value: src.shift(), pos: curPos, end: ++curPos, line: curLine });

    }

    tokens.push({ type: TokenType.EndOfFile, value: 'eof', pos: curPos, end: ++curPos, line: curLine });
    return tokens;
}