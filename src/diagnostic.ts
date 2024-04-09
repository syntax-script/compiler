import { DiagnosticSeverity, DocumentDiagnosticReportKind, FullDocumentDiagnosticReport } from './diagnosticTypes.js';
import { sysparser, syxparser } from './ast.js';
import { tokenizeSys, tokenizeSyx } from './lexer.js';
import { CompilerError } from './types.js';
import { readFileSync } from 'fs';


/**
 * Creates a diagnostic report from the file path given.
 * @param {string} filePath Path of the file to create a report. 
 * @returns A diagnostic report language servers can use.
 */
export function createSyntaxScriptDiagnosticReport(filePath: string): FullDocumentDiagnosticReport {
    const isSyx: boolean = filePath.endsWith('.syx');

    try {

        const content = readFileSync(filePath).toString();
        const tokens = (isSyx ? tokenizeSyx : tokenizeSys)(content);
        (isSyx ? syxparser : sysparser).parseTokens(tokens);

        return { kind: DocumentDiagnosticReportKind.Full, items: [] };
    } catch (error) {
        if (error instanceof CompilerError) {
            const compilerError = error as CompilerError;
            return {
                kind: DocumentDiagnosticReportKind.Full, items: [
                    { message: compilerError.message, range: compilerError.range, severity: DiagnosticSeverity.Error, source: 'syntax-script' }
                ]
            };
        }
    }

}
