import { Diagnostic, DiagnosticSeverity, DocumentDiagnosticReportKind, FullDocumentDiagnosticReport } from './diagnosticTypes.js';
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
export function createSyntaxScriptDiagnosticReport(filePath: string,fileContent?:string): FullDocumentDiagnosticReport {
    const isSyx: boolean = filePath.endsWith('.syx');

    const items:Diagnostic[] = [{message:'Base',range:{end:{character:0,line:1},start:{character:0,line:0}},severity:DiagnosticSeverity.Warning,source:'syntax-script'}];

    try {

        const content = fileContent??readFileSync(filePath).toString();
        const tokens = (isSyx ? tokenizeSyx : tokenizeSys)(content);
        (isSyx ? syxparser : sysparser).parseTokens(tokens);

    } catch (error) {
        if (isCompilerError(error)) {
            items.push({ message: error.message, range: error.range, severity: DiagnosticSeverity.Error, source: 'syntax-script' });
        }
    } finally {
        return {items,kind:DocumentDiagnosticReportKind.Full};
    }

}
