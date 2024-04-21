import { CodeAction, CodeActionKind, Diagnostic, DiagnosticSeverity, DocumentDiagnosticReportKind, FullDocumentDiagnosticReport, Range } from 'lsp-types';
import { GlobalStatement, ImportStatement, NodeType, OperatorStatement, ProgramStatement, RuleStatement, Statement, TokenType, isCompilerError, statementIsA } from './types.js';
import { existsSync, readFileSync, statSync } from 'fs';
import { sysparser, syxparser } from './ast.js';
import { tokenizeSys, tokenizeSyx } from './lexer.js';
import { CompilerFunctions } from './compiler.js';
import { dictionary } from './dictionary/index.js';
import { fileURLToPath } from 'url';
import { join } from 'path';


// Use with addRange to include semicolons
const semiRange: Range = { end: { line: 0, character: 1 }, start: { line: 0, character: 0 } };

/**
 * Creates a diagnostic report from the file path given.
 * @param {string} filePath Path of the file to create a report. 
 * @param {string} fileContent Content of the file if it is already fetched. 
 * @author efekos
 * @version 1.0.1
 * @since 0.0.2-alpha
 * @returns A diagnostic report language servers can use.
 */
export function createSyntaxScriptDiagnosticReport(filePath: string, fileContent?: string): FullDocumentDiagnosticReport {
    const isSyx: boolean = filePath.endsWith('.syx');

    const items: Diagnostic[] = [];

    try {

        const content = fileContent ?? readFileSync(filePath).toString();
        const tokens = (isSyx ? tokenizeSyx : tokenizeSys)(content);
        const ast = (isSyx ? syxparser : sysparser).parseTokens(tokens, filePath);

        items.push(...exportableCheck(ast.body, filePath));
        items.push(...ruleConflictCheck(ast, filePath));
        items.push(...sameRuleCheck(ast, filePath));
        items.push(...importedExistentCheck(ast, filePath));
        items.push(...sameRegexCheck(ast,filePath));
    } catch (error) {
        if (isCompilerError(error)) {
            items.push({
                message: error.message,
                range: subRange(error.range),
                severity: DiagnosticSeverity.Error,
                source: 'syntax-script',
                data: error.actions
            });
        } else {
            items.push({ message: `Parser Error: ${error.message}`, range: { end: { line: 0, character: 1 }, start: { line: 0, character: 0 } }, severity: DiagnosticSeverity.Warning });
        }
    } finally {
        return { items, kind: DocumentDiagnosticReportKind.Full };
    }

}

// Checks rule conflicts and adds warnings when there is two defined rules that conflict each other
function ruleConflictCheck(ast: ProgramStatement, filePath: string): Diagnostic[] {
    const items: Diagnostic[] = [];

    ast.body.forEach(stmt => {
        if (statementIsA(stmt, NodeType.Rule)) {
            const dictRule = dictionary.Rules.find(r => r.name === stmt.rule);

            ast.body.filter(r => statementIsA(r, NodeType.Rule)).filter(r => r.range !== stmt.range).map(r => r as RuleStatement).forEach(otherRules => {
                if (dictRule.conflicts.includes(otherRules.rule)) items.push({
                    message: `Rule '${otherRules.rule}' conflicts with '${stmt.rule}', Both of them should not be defined.`,
                    range: subRange(otherRules.range),
                    source: 'syntax-script',
                    severity: DiagnosticSeverity.Warning,
                    data: [
                        {
                            title: `Remove ${stmt.rule} definition`,
                            kind: CodeActionKind.QuickFix,
                            edit: {
                                changes: {
                                    [filePath]: [
                                        {
                                            range: subRange(addRange(stmt.range, semiRange)),
                                            newText: ''
                                        }
                                    ]
                                }
                            }
                        },
                        {
                            title: `Remove ${otherRules.rule} definition`,
                            kind: CodeActionKind.QuickFix,
                            edit: {
                                changes: {
                                    [filePath]: [
                                        {
                                            range: subRange(addRange(otherRules.range, semiRange)),
                                            newText: ''
                                        }
                                    ]
                                }
                            }
                        }
                    ] as CodeAction[]
                });
            });
        }
    });

    return items;
}

// Checks if same rule is defined twice
function sameRuleCheck(ast: ProgramStatement, filePath: string): Diagnostic[] {
    const items: Diagnostic[] = [];

    ast.body.forEach(stmt => {
        if (statementIsA(stmt, NodeType.Rule)) {
            ast.body.filter(r => statementIsA(r, NodeType.Rule)).filter(r => r.range !== stmt.range).map(r => r as RuleStatement).forEach(otherRules => {
                if (otherRules.rule === stmt.rule) items.push({
                    message: `Rule '${stmt.rule}' is already defined.`,
                    range: subRange(stmt.range),
                    source: 'syntax-script',
                    severity: DiagnosticSeverity.Error,
                    data: [
                        {
                            title: 'Remove this definition',
                            kind: CodeActionKind.QuickFix,
                            edit: {
                                changes: {
                                    [filePath]: [
                                        {
                                            range: subRange(addRange(stmt.range, semiRange)),
                                            newText: ''
                                        }
                                    ]
                                }
                            }
                        }
                    ] as CodeAction[]
                });
            });
        }
    });

    return items;
}

// Checks if an import statements refers to an empty file
function importedExistentCheck(ast: ProgramStatement, filePath: string): Diagnostic[] {
    const items: Diagnostic[] = [];

    ast.body.filter(r => statementIsA(r, NodeType.Import)).map(r => r as ImportStatement).forEach(stmt => {

        const filePathButPath = fileURLToPath(filePath);
        const fullPath = join(filePathButPath, '../', stmt.path);
        if (!existsSync(fullPath)) items.push({
            message: `Can't find file '${fullPath}' imported from '${filePathButPath}'`,
            severity: DiagnosticSeverity.Error,
            range: subRange(stmt.range),
            source: 'syntax-script',
            data: [
                {
                    title: 'Remove this import statement',
                    kind: CodeActionKind.QuickFix,
                    edit: {
                        changes: {
                            [filePath]: [
                                { range: subRange(addRange(stmt.range, semiRange)), newText: '' }
                            ]
                        }
                    }
                }
            ] as CodeAction[]
        });

        if (existsSync(fullPath)) {
            const status = statSync(fullPath);

            if (!status.isFile()) items.push({
                message: `'${fullPath}' imported from '${filePathButPath}' doesn't seem to be a file.`,
                severity: DiagnosticSeverity.Error,
                range: subRange(stmt.range),
                source: 'syntax-script',
                data: [
                    {
                        title: 'Remove this import statement',
                        kind: CodeActionKind.QuickFix,
                        edit: {
                            changes: {
                                [filePath]: [
                                    { range: subRange(addRange(stmt.range, semiRange)), newText: '' }
                                ]
                            }
                        }
                    }
                ] as CodeAction[]
            });

            if (!fullPath.endsWith('.syx')) items.push({
                message: `'${fullPath}' imported from '${filePathButPath}' cannot be imported.`,
                severity: DiagnosticSeverity.Error,
                range: subRange(stmt.range),
                source: 'syntax-script',
                data: [
                    {
                        title: 'Remove this import statement',
                        kind: CodeActionKind.QuickFix,
                        edit: {
                            changes: {
                                [filePath]: [
                                    { range: subRange(addRange(stmt.range, semiRange)), newText: '' }
                                ]
                            }
                        }
                    }
                ] as CodeAction[]
            });
        }

    });

    return items;
}

// Checks if there are multiple operators with the same regex
function sameRegexCheck(ast:ProgramStatement, filePath:string): Diagnostic[] {
    const items:Diagnostic[] = [];

    const encounteredRegexes:RegExp[] = [];

    ast.body.filter(r=>statementIsA(r,NodeType.Operator)).map(r => r as OperatorStatement).forEach(stmt=>{

        const regex = new RegExp(CompilerFunctions.generateRegexMatcher(stmt));

        if(encounteredRegexes.some(r=>r.source===regex.source)) items.push({
            message:'Regex of this operator is same with another operator.',
            range:subRange(syxparser.combineTwo(stmt.regex[0].range,stmt.regex[stmt.regex.length-1].range)),
            severity:DiagnosticSeverity.Error,
            source:'syntax-script',
            data:[
                {
                    title:'Remove this operator',
                    kind:CodeActionKind.QuickFix,
                    edit:{
                        changes:{
                            [filePath]:[
                                {
                                    newText:'',
                                    range:subRange(stmt.range)
                                }
                            ]
                        }
                    }
                }
            ] as CodeAction[]
        });
        else encounteredRegexes.push(regex);

    });

    return items;
}

// Checks if every exported statement it actually exportable
function exportableCheck(statements: Statement[], filePath: string): Diagnostic[] {

    const items: Diagnostic[] = [];

    statements.forEach(stmt => {

        if (stmt.modifiers.some(t => t.type === TokenType.ExportKeyword) && !dictionary.ExportableNodeTypes.includes(stmt.type)) items.push({
            message: 'This statement cannot be exported.',
            range: subRange(stmt.range),
            severity: DiagnosticSeverity.Error,
            source: 'syntax-script',
            data: [
                {
                    title: 'Remove export keyword',
                    kind: CodeActionKind.QuickFix,
                    edit: {
                        changes: {
                            [filePath]: [
                                {
                                    newText: '', range: subRange(stmt.modifiers.find(r => r.type === TokenType.ExportKeyword).range)
                                }
                            ]
                        }
                    }
                }
            ] as CodeAction[]
        });

        if (dictionary.StatementTypesWithBody.includes(stmt.type)) items.push(...exportableCheck((stmt as GlobalStatement).body, filePath));
    });

    return items;
}

/**
 * Modifies the given range to be zero-based.
 * @param {Range} r Any range. 
 * @returns Same range with every value decreased by 1.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export function subRange(r: Range): Range {
    const a = r.start.character;
    const b = r.start.line;
    const c = r.end.character;
    const d = r.end.line;

    return { start: { character: a === 0 ? 0 : a - 1, line: b === 0 ? 0 : b - 1 }, end: { character: c === 0 ? 0 : c - 1, line: d === 0 ? 0 : d - 1 } };
}

function addRange(r: Range, r2: Range): Range {
    return { end: { line: r.end.line + r2.end.line, character: r.end.character + r.end.character }, start: { character: r.start.character, line: r.start.line } };
}