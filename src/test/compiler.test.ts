import { CompileStatement, FunctionStatement, GlobalStatement, ImportStatement, ImportsStatement, KeywordStatement, NodeType, ProgramStatement, RuleStatement, Token, TokenType, isCompilerError } from '../types.js';
import { Diagnostic, DiagnosticSeverity, DocumentDiagnosticReportKind, Range } from 'lsp-types';
import { describe, inst, it } from '@efekos/es-test/bin/testRunner.js';
import { tokenizeSys, tokenizeSyx } from '../lexer.js';
import { HandlerFn } from '@efekos/es-test/bin/types.js';
import { createSyntaxScriptDiagnosticReport } from '../diagnostic.js';
import { expect } from 'chai';
import { syxparser } from '../ast.js';

describe('Compiler module', () => {

    function rangeExpectations(r: Range) {
        expect(r).to.have.property('start').to.be.a('object');
        expect(r).to.have.property('end').to.be.a('object');
        expect(r.start).to.have.property('line').to.be.a('number').to.be.greaterThanOrEqual(0);
        expect(r.start).to.have.property('character').to.be.a('number').to.be.greaterThanOrEqual(0);
        expect(r.end).to.have.property('character').to.be.a('number').to.be.greaterThanOrEqual(0);
        expect(r.end).to.have.property('line').to.be.a('number').to.be.greaterThanOrEqual(0);
    }

    function tokenExpectations(t: Token) {
        expect(t).to.have.property('range').to.be.a('object');
        rangeExpectations(t.range);

        expect(t).to.have.property('type').to.be.a('number').to.be.greaterThanOrEqual(0);
        expect(t).to.have.property('value').to.be.a('string').to.be.not.equal(undefined);
    }

    it('should provide correct ranges', () => {

        inst(() => {

            const tokens = tokenizeSyx('keyword hello;');

            tokens.map(r => r.range).forEach(r => rangeExpectations(r));
            expect(tokens[0].range).to.deep.equal({ end: { line: 1, character: 8 }, start: { line: 1, character: 1 } });
            expect(tokens[1].range).to.deep.equal({ end: { line: 1, character: 14 }, start: { line: 1, character: 9 } });
            expect(tokens[2].range).to.deep.equal({ end: { line: 1, character: 15 }, start: { line: 1, character: 14 } });

        });

        inst(() => {

            const tokens = tokenizeSyx('rule "imports-keyword": cray;');

            expect(tokens).to.be.a('array').to.have.lengthOf(10);
            tokens.map(r => r.range).forEach(r => rangeExpectations(r));
            expect(tokens[0].range).to.be.deep.equal({ end: { line: 1, character: 5 }, start: { line: 1, character: 1 } });
            expect(tokens[1].range).to.be.deep.equal({ end: { line: 1, character: 7 }, start: { line: 1, character: 6 } });
            expect(tokens[2].range).to.be.deep.equal({ end: { line: 1, character: 14 }, start: { line: 1, character: 7 } });
            expect(tokens[3].range).to.be.deep.equal({ end: { line: 1, character: 15 }, start: { line: 1, character: 14 } });
            expect(tokens[4].range).to.be.deep.equal({ end: { line: 1, character: 22 }, start: { line: 1, character: 15 } });
            expect(tokens[5].range).to.be.deep.equal({ end: { line: 1, character: 23 }, start: { line: 1, character: 22 } });
            expect(tokens[6].range).to.be.deep.equal({ end: { line: 1, character: 24 }, start: { line: 1, character: 23 } });
            expect(tokens[7].range).to.be.deep.equal({ end: { line: 1, character: 29 }, start: { line: 1, character: 25 } });
            expect(tokens[8].range).to.be.deep.equal({ end: { line: 1, character: 30 }, start: { line: 1, character: 29 } });

        });

        inst(() => {
            const tokens = tokenizeSyx('rule "return-function-value-enabled":true;');

            expect(tokens).to.be.a('array').to.have.lengthOf(14);
            tokens.map(r => r.range).forEach(r => rangeExpectations(r));
            expect(tokens[0].range).to.be.deep.equal({ end: { line: 1, character: 5 }, start: { line: 1, character: 1 } });
            expect(tokens[1].range).to.be.deep.equal({ end: { line: 1, character: 7 }, start: { line: 1, character: 6 } });
            expect(tokens[2].range).to.be.deep.equal({ end: { line: 1, character: 13 }, start: { line: 1, character: 7 } });
            expect(tokens[3].range).to.be.deep.equal({ end: { line: 1, character: 14 }, start: { line: 1, character: 13 } });
            expect(tokens[4].range).to.be.deep.equal({ end: { line: 1, character: 22 }, start: { line: 1, character: 14 } });
            expect(tokens[5].range).to.be.deep.equal({ end: { line: 1, character: 23 }, start: { line: 1, character: 22 } });
            expect(tokens[6].range).to.be.deep.equal({ end: { line: 1, character: 28 }, start: { line: 1, character: 23 } });
            expect(tokens[7].range).to.be.deep.equal({ end: { line: 1, character: 29 }, start: { line: 1, character: 28 } });
            expect(tokens[8].range).to.be.deep.equal({ end: { line: 1, character: 36 }, start: { line: 1, character: 29 } });
            expect(tokens[9].range).to.be.deep.equal({ end: { line: 1, character: 37 }, start: { line: 1, character: 36 } });
            expect(tokens[10].range).to.be.deep.equal({ end: { line: 1, character: 38 }, start: { line: 1, character: 37 } });
            expect(tokens[11].range).to.be.deep.equal({ end: { line: 1, character: 42 }, start: { line: 1, character: 38 } });
            expect(tokens[12].range).to.be.deep.equal({ end: { line: 1, character: 43 }, start: { line: 1, character: 42 } });

        });

    }, true);

    it('should provide correct tokenization', () => {

        function _case(src: string, types: TokenType[]): HandlerFn {
            return () => {
                const ts = tokenizeSyx(src);

                expect(ts).to.be.a('array');
                ts.forEach(t => tokenExpectations(t));
                expect(ts.map(t => t.type)).to.be.deep.equal(types);
            };
        }

        inst(
            _case('class } > ) ] , compile "" export function global random import imports 1 keyword { < ( [ operator * rule ; \'\' | +s', [
                TokenType.ClassKeyword, TokenType.CloseBrace, TokenType.CloseDiamond, TokenType.CloseParen, TokenType.CloseSquare, TokenType.Comma, TokenType.CompileKeyword, TokenType.DoubleQuote, TokenType.DoubleQuote,
                TokenType.ExportKeyword, TokenType.FunctionKeyword, TokenType.GlobalKeyword, TokenType.Identifier, TokenType.ImportKeyword, TokenType.ImportsKeyword, TokenType.IntNumber, TokenType.KeywordKeyword,
                TokenType.OpenBrace, TokenType.OpenDiamond, TokenType.OpenParen, TokenType.OpenSquare, TokenType.OperatorKeyword, TokenType.Raw, TokenType.RuleKeyword, TokenType.Semicolon, TokenType.SingleQuote, TokenType.SingleQuote,
                TokenType.VarSeperator, TokenType.WhitespaceIdentifier, TokenType.EndOfFile
            ])
        );

        inst(
            _case('class}>)],compile""exportfunctionglobalrandomimportimports1keyword{<([operator*rule;\'\'|+s', [
                TokenType.ClassKeyword, TokenType.CloseBrace, TokenType.CloseDiamond, TokenType.CloseParen, TokenType.CloseSquare, TokenType.Comma, TokenType.CompileKeyword, TokenType.DoubleQuote, TokenType.DoubleQuote,
                TokenType.Identifier, TokenType.IntNumber, TokenType.KeywordKeyword, TokenType.OpenBrace, TokenType.OpenDiamond, TokenType.OpenParen, TokenType.OpenSquare, TokenType.OperatorKeyword, TokenType.Raw,
                TokenType.RuleKeyword, TokenType.Semicolon, TokenType.SingleQuote, TokenType.SingleQuote, TokenType.VarSeperator, TokenType.WhitespaceIdentifier, TokenType.EndOfFile
            ])
        );

        inst(
            _case(
                '+s+s+s+s+s+s+s',
                [TokenType.WhitespaceIdentifier, TokenType.WhitespaceIdentifier, TokenType.WhitespaceIdentifier, TokenType.WhitespaceIdentifier, TokenType.WhitespaceIdentifier, TokenType.WhitespaceIdentifier, TokenType.WhitespaceIdentifier, TokenType.EndOfFile]
            )
        );

        inst(
            _case(
                'operator <int>"+"<int> {',
                [TokenType.OperatorKeyword,TokenType.OpenDiamond,TokenType.Identifier,TokenType.CloseDiamond,TokenType.DoubleQuote,TokenType.Raw,TokenType.DoubleQuote,TokenType.OpenDiamond,TokenType.Identifier,TokenType.CloseDiamond,TokenType.OpenBrace,TokenType.EndOfFile]
            )
        );

        inst(
            _case(
                'o-+?',
                [TokenType.Identifier,TokenType.Raw,TokenType.Raw,TokenType.Raw,TokenType.EndOfFile]
            )
        );

        inst(
            _case(
                'rmh09345kg9',
                [TokenType.Identifier,TokenType.IntNumber,TokenType.Identifier,TokenType.IntNumber, TokenType.EndOfFile]
            )
        );

        inst(
            _case(
                'rule \'custom-random-rule?\';',
                [TokenType.RuleKeyword,TokenType.SingleQuote,20,20,20,20,20,20,TokenType.SingleQuote,TokenType.Semicolon, TokenType.EndOfFile]
            )
        );

        inst(
            _case(
                'keyword pray;rule\'imports-keyword\': pray;',
                [TokenType.KeywordKeyword,TokenType.Identifier,TokenType.Semicolon,TokenType.RuleKeyword,TokenType.SingleQuote,20,20,20,TokenType.SingleQuote,TokenType.Raw,TokenType.Identifier,TokenType.Semicolon, TokenType.EndOfFile]
            )
        );

        inst(
            _case(
                'çş',
                [TokenType.Raw,TokenType.Raw, TokenType.EndOfFile]
            )
        );

        inst(
            _case(
                'keyword altınasıçĞ;',
                [TokenType.KeywordKeyword,TokenType.Identifier,20,TokenType.Identifier,20,20,20,TokenType.Semicolon, TokenType.EndOfFile]
            )
        );

        inst(
            _case(
                'keyword imsodonewiththistest12casesisenough',
                [TokenType.KeywordKeyword,TokenType.Identifier,TokenType.IntNumber,TokenType.Identifier, TokenType.EndOfFile]
            )
        );

        inst(() => {

            const sys = tokenizeSys('import "" \'\' ; :::');
            const sysList = [TokenType.ImportKeyword, TokenType.DoubleQuote, TokenType.DoubleQuote, TokenType.SingleQuote, TokenType.SingleQuote, TokenType.Semicolon, TokenType.EndOfFile];

            sys.forEach(t => tokenExpectations(t));
            expect(sys).to.be.a('array');
            expect(sys.map(tt => tt.type)).to.be.deep.equal(sysList);

        });

    }, true);

    describe('should provide correct parsing', () => {

        function astTypeExpectations(ast: ProgramStatement) {
            expect(ast).to.be.a('object');
            expect(ast).to.have.property('type').to.be.a('number').to.be.equal(NodeType.Program);
            expect(ast).to.have.property('modifiers').to.be.a('array').to.have.lengthOf(0);
            expect(ast).to.have.property('body').to.be.a('array').to.have.lengthOf(1);
            expect(ast).to.have.property('range').to.be.a('object');
            rangeExpectations(ast.range);
        }

        it('for keyword statements', () => {

            const tokens = tokenizeSyx('keyword ruleish;');
            const ast = syxparser.parseTokens(tokens, 'TEST_FILE');
            const stmt: KeywordStatement = { type: NodeType.Keyword, modifiers: [], range: { end: { line: 1, character: 16 }, start: { line: 1, character: 1 } }, word: 'ruleish' };

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for rule statements', () => {

            const tokens = tokenizeSyx('rule \'function-value-return-enabled\': true;');
            const ast = syxparser.parseTokens(tokens, 'TEST_FILE');
            const stmt: RuleStatement = { range: { start: { line: 1, character: 1 }, end: { line: 1, character: 43 } }, modifiers: [], rule: 'function-value-return-enabled', value: 'true', type: NodeType.Rule };

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for compile statements', () => {

            const tokens = tokenizeSyx('compile(ts,js) \'test\';');
            const ast = syxparser.parseTokens(tokens, 'TEST_FILE');
            const stmt: CompileStatement = { range: { start: { line: 1, character: 1 }, end: { line: 1, character: 22 } }, formats: ['ts', 'js'], type: NodeType.Compile, modifiers: [], body: [{ type: NodeType.String, modifiers: [], range: { start: { line: 1, character: 16 }, end: { line: 1, character: 22 } }, value: 'test' }] };

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for imports statements', () => {

            const tokens = tokenizeSyx('imports(ts,js) \'math\';');
            const ast = syxparser.parseTokens(tokens, 'TEST_FILE');
            const stmt: ImportsStatement = { range: { start: { line: 1, character: 1 }, end: { line: 1, character: 22 } }, formats: ['ts', 'js'], type: NodeType.Imports, modifiers: [], module: 'math' };

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for global statements', () => {

            const tokens = tokenizeSyx('global randomizer {}');
            const ast = syxparser.parseTokens(tokens, 'TEST_FILE');
            const stmt: GlobalStatement = { range: { start: { line: 1, character: 1 }, end: { line: 1, character: 21 } }, name: 'randomizer', type: NodeType.Global, modifiers: [], body: [] };

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for function statements', () => {

            const tokens = tokenizeSyx('function randomizer <int> {}');
            const ast = syxparser.parseTokens(tokens, 'TEST_FILE');
            const stmt: FunctionStatement = { range: { start: { line: 1, character: 1 }, end: { line: 1, character: 29 } }, name: 'randomizer', type: NodeType.Function, modifiers: [], body: [], arguments: ['int'] };

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for import statements', () => {

            const tokens = tokenizeSyx('import \'./math\';');
            const ast = syxparser.parseTokens(tokens, 'TEST_FILE');
            const stmt: ImportStatement = { range: { start: { line: 1, character: 1 }, end: { line: 1, character: 16 } }, type: NodeType.Import, modifiers: [], path: './math' };

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for export statements', () => {

            const tokens = tokenizeSyx('export keyword ruleish;');
            const ast = syxparser.parseTokens(tokens, 'TEST_FILE');
            const stmt: KeywordStatement = { type: NodeType.Keyword, modifiers: [{ range: { end: { line: 1, character: 7 }, start: { line: 1, character: 1 } }, type: TokenType.ExportKeyword, value: 'export' }], range: { end: { line: 1, character: 23 }, start: { line: 1, character: 1 } }, word: 'ruleish' };

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

    });

    it('should provide correct diagnostic reports', () => {

        const report = createSyntaxScriptDiagnosticReport('TEST_FILE.syx', 'keyword ruleis');

        expect(report).to.be.a('object');
        expect(report).to.have.property('items').to.be.a('array').to.have.lengthOf(1);
        expect(report).to.have.property('kind').to.be.a('string').to.be.equal(DocumentDiagnosticReportKind.Full);

        const diag = report.items[0];
        const item: Diagnostic = { message: 'Expected \';\' after statement, found \'EOF\'.', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, severity: DiagnosticSeverity.Error, source: 'syntax-script', data: [] };

        expect(diag).to.have.property('message').to.be.a('string');
        expect(diag).to.have.property('range');
        expect(diag).to.have.property('severity').to.be.a('number').to.be.equal(DiagnosticSeverity.Error);
        rangeExpectations(diag.range);
        expect(diag).to.have.property('source').to.be.a('string').to.be.equal('syntax-script');
        expect(diag).to.be.a('object').to.be.deep.equal(item);

    });

});