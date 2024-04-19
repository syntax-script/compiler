import { CompileStatement, FunctionStatement, GlobalStatement, ImportStatement, ImportsStatement, KeywordStatement, NodeType, ProgramStatement, RuleStatement, TokenType } from '../types.js';
import { describe, it } from '@efekos/es-test/bin/testRunner.js';
import { tokenizeSys, tokenizeSyx } from '../lexer.js';
import { expect } from 'chai';
import { syxparser } from '../ast.js';

describe('Compiler module', () => {

    it('should provide correct ranges', () => {

        const tokens = tokenizeSyx('keyword hello;');
        const r = tokens[0].range;

        expect(r).to.have.property('start').to.be.a('object');
        expect(r).to.have.property('end').to.be.a('object');
        expect(r.start).to.have.property('line').to.be.a('number');
        expect(r.start).to.have.property('character').to.be.a('number');
        expect(r.end).to.have.property('character').to.be.a('number');
        expect(r.end).to.have.property('line').to.be.a('number');
        expect(r).to.deep.equal({ end: { line: 1, character: 7 }, start: { line: 1, character: 0 } });

    });

    it('should provide correct tokenization', () => {
        const t = tokenizeSyx('class } > ) ] , compile " export function global random import imports 1 keyword { < ( [ operator * rule ; \' | +s');
        const tList = [
            TokenType.ClassKeyword, TokenType.CloseBrace, TokenType.CloseDiamond, TokenType.CloseParen, TokenType.CloseSquare, TokenType.Comma, TokenType.CompileKeyword, TokenType.DoubleQuote,
            TokenType.ExportKeyword, TokenType.FunctionKeyword, TokenType.GlobalKeyword, TokenType.Identifier, TokenType.ImportKeyword, TokenType.ImportsKeyword, TokenType.IntNumber, TokenType.KeywordKeyword,
            TokenType.OpenBrace, TokenType.OpenDiamond, TokenType.OpenParen, TokenType.OpenSquare, TokenType.OperatorKeyword, TokenType.Raw, TokenType.RuleKeyword, TokenType.Semicolon, TokenType.SingleQuote,
            TokenType.VarSeperator, TokenType.WhitespaceIdentifier, TokenType.EndOfFile
        ];

        expect(t).to.be.a('array');
        expect(t).to.have.lengthOf(tList.length);
        expect(t.map(tt => tt.type)).to.be.deep.equal(tList);

        const sys = tokenizeSys('import \' " ; :::');
        const sysList = [TokenType.ImportKeyword, TokenType.SingleQuote, TokenType.DoubleQuote, TokenType.Semicolon, TokenType.EndOfFile];

        expect(sys).to.be.a('array');
        expect(sys).to.have.lengthOf(sysList.length);
        expect(sys.map(tt => tt.type)).to.be.deep.equal(sysList);
    });

    describe('should provide correct parsing', () => {

        function astTypeExpectations(ast:ProgramStatement){
            expect(ast).to.be.a('object');
            expect(ast).to.have.property('type').to.be.a('number').to.be.equal(NodeType.Program);
            expect(ast).to.have.property('modifiers').to.be.a('array').to.have.lengthOf(0);
            expect(ast).to.have.property('body').to.be.a('array').to.have.lengthOf(1);
            expect(ast).to.have.property('range').to.be.a('object');
            expect(ast.range).to.have.property('start').to.be.a('object');
            expect(ast.range).to.have.property('end').to.be.a('object');
            expect(ast.range.start).to.have.property('line').to.be.a('number');
            expect(ast.range.start).to.have.property('character').to.be.a('number');
            expect(ast.range.end).to.have.property('line').to.be.a('number');
            expect(ast.range.end).to.have.property('character').to.be.a('number');
        }

        it('for keyword statements', () => {

            const tokens = tokenizeSyx('keyword ruleish;');
            const ast = syxparser.parseTokens(tokens, 'TEST_FILE');
            const stmt: KeywordStatement = { type: NodeType.Keyword, modifiers: [], range: { end: { line: 1, character: 14 }, start: { line: 1, character: 0 } }, word: 'ruleish' };

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for rule statements', () => {

            const tokens = tokenizeSyx('rule \'function-value-return-enabled\': true;');
            const ast = syxparser.parseTokens(tokens, 'TEST_FILE');
            const stmt:RuleStatement = {range:{start:{line:1,character:0},end:{line:1,character:41}},modifiers:[],rule:'function-value-return-enabled',value:'true',type:NodeType.Rule};

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for compile statements',()=>{

            const tokens = tokenizeSyx('compile(ts,js) \'test\';');
            const ast = syxparser.parseTokens(tokens,'TEST_FILE');
            const stmt:CompileStatement = {range:{start:{line:1,character:0},end:{line:1,character:20}},formats:['ts','js'],type:NodeType.Compile,modifiers:[],body:[{type:NodeType.String,modifiers:[],range:{start:{line:1,character:15},end:{line:1,character:20}},value:'test'}]};

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for imports statements',()=>{

            const tokens = tokenizeSyx('imports(ts,js) \'math\';');
            const ast = syxparser.parseTokens(tokens,'TEST_FILE');
            const stmt:ImportsStatement = {range:{start:{line:1,character:0},end:{line:1,character:20}},formats:['ts','js'],type:NodeType.Imports,modifiers:[],module:'math'};

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for global statements',()=>{

            const tokens = tokenizeSyx('global randomizer {}');
            const ast = syxparser.parseTokens(tokens,'TEST_FILE');
            const stmt:GlobalStatement = {range:{start:{line:1,character:0},end:{line:1,character:19}},name:'randomizer',type:NodeType.Global,modifiers:[],body:[]};
            
            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for function statements',()=>{

            const tokens = tokenizeSyx('function randomizer <int> {}');
            const ast = syxparser.parseTokens(tokens,'TEST_FILE');
            const stmt:FunctionStatement = {range:{start:{line:1,character:0},end:{line:1,character:27}},name:'randomizer',type:NodeType.Function,modifiers:[],body:[],arguments:['int']};
            
            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

        it('for import statements',()=>{

            const tokens = tokenizeSyx('import \'./math\';');
            const ast = syxparser.parseTokens(tokens,'TEST_FILE');
            const stmt:ImportStatement = {range:{start:{line:1,character:0},end:{line:1,character:14}},type:NodeType.Import,modifiers:[],path:'./math'};

            astTypeExpectations(ast);
            expect(ast.body[0]).to.be.a('object').to.be.deep.equal(stmt);

        });

    });
});