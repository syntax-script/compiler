import { CodeAction, CodeActionKind, Diagnostic, DiagnosticSeverity, DocumentDiagnosticReportKind, FullDocumentDiagnosticReport,Range } from 'lsp-types';
import { sysparser, syxparser } from './ast.js';
import { tokenizeSys, tokenizeSyx } from './lexer.js';
import { isCompilerError } from './types.js';
import { readFileSync } from 'fs';



/**
 * Creates a diagnostic report from the file path given.
 * @param {string} filePath Path of the file to create a report. 
 * @param {string} fileContent Content of the file if it is already fetched. 
 * @returns A diagnostic report language servers can use.
 */
export function createSyntaxScriptDiagnosticReport(filePath: string, fileContent?: string): FullDocumentDiagnosticReport {
    const isSyx: boolean = filePath.endsWith('.syx');

    const items: Diagnostic[] = [];

    try {

        const content = fileContent ?? readFileSync(filePath).toString();
        const tokens = (isSyx ? tokenizeSyx : tokenizeSys)(content);
        (isSyx ? syxparser : sysparser).parseTokens(tokens,filePath);

    } catch (error) {
        if (isCompilerError(error)) {
            items.push({
                message: error.message,
                range: subRange(error.range),
                severity: DiagnosticSeverity.Error,
                source: 'syntax-script',
                data: error.actions
            });
        }
    } finally {
        return { items, kind: DocumentDiagnosticReportKind.Full };
    }

}


/**
 * Modifies the given range to be zero-based.
 * @param {Range} r Any range. 
 * @returns Same range with every value decreased by 1.
 */
function subRange(r:Range):Range {
    return {start:{character:r.start.character-1,line:r.start.line-1},end:{character:r.end.character-1,line:r.end.line-1}};
}