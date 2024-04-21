import { CompileStatement, CompilerError, ImportStatement, ImportsStatement, NodeType, PrimitiveTypeExpression, StringExpression, TokenType, VariableExpression, statementIsA } from './types.js';
import { dirname, join } from 'path';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { sysparser, syxparser } from './ast.js';
import { tokenizeSys, tokenizeSyx } from './lexer.js';

/**
 * Main class used to compile a folder containing syntax script declaration (.syx) and syntax script (.sys) files.
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export class SyntaxScriptCompiler {

    private readonly rootDir: string;
    private readonly outDir: string;
    private readonly mainFileFormat: string;

    public readonly exportData: Record<string, AnyExportable[]> = {};

    /**
     * Constructs a new compiler.
     * @param {string} rootDir Root dir to search for source files.
     * @param {string} outDir Out dir to write compiled files.
     * @param {string} format File format to compile.
     * @author efekos
     * @version 1.0.1
     * @since 0.0.1-alpha
     */
    constructor(rootDir: string, outDir: string, format: string) {
        this.rootDir = join(process.cwd(), rootDir);
        this.outDir = join(process.cwd(), outDir);
        this.mainFileFormat = format;
    }

    /**
     * Parses .syx files and compiles .sys files using them.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.0
     */
    public async compile() {
        await this.compileSyxFiles(this.rootDir);
        await this.compileSysFiles(this.rootDir);
        return Promise.resolve();
    }

    /**
     * Compiles every .syx file found in the path.
     * @param {string} folderPath A folder path to search for .syx files.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    public compileSyxFiles(folderPath: string) {

        const files = readdirSync(folderPath);

        files.forEach(f => {
            if (f.endsWith('.syx')) this.compileSyx(join(folderPath, f));
            else if (statSync(join(folderPath, f)).isDirectory()) this.compileSyxFiles(join(folderPath, f));
        });
    }

    /**
     * Compiles one .syx file from the path given.
     * @param {string} file Path to a file to compile.
     * @author efekos
     * @version 1.0.5
     * @since 0.0.2-alpha
     */
    public compileSyx(file: string) {
        const ast = syxparser.parseTokens(tokenizeSyx(readFileSync(file).toString()), file);
        const out: AnyExportable[] = [];

        ast.body.forEach(statement => {
            if (!statement.modifiers.some(token => token.type === TokenType.ExportKeyword)) return;


            if (statementIsA(statement, NodeType.Operator)) {


                //# Generate regexMatcher
                let regexMatcher: RegExp = new RegExp('');
                statement.regex.forEach(regexStatement => {

                    if (regexStatement.type === NodeType.PrimitiveType) {
                        regexMatcher = new RegExp(regexMatcher.source + regexes[(regexStatement as PrimitiveTypeExpression).value].source);
                    }
                    if (regexStatement.type === NodeType.WhitespaceIdentifier) {
                        regexMatcher = new RegExp(regexMatcher.source + regexes['+s'].source);
                    }
                    if (regexStatement.type === NodeType.String) {
                        regexMatcher = new RegExp(regexMatcher.source + escapeRegex((regexStatement as StringExpression).value));
                    }

                });

                const operatorStmtExport: ExportedOperator = { imports: {}, outputGenerators: {}, regexMatcher, type: ExportType.Operator };

                //# Handle statements
                statement.body.forEach(stmt => {
                    if (stmt.type === NodeType.Compile) {
                        const compileStmt = stmt as CompileStatement;

                        compileStmt.formats.forEach(frmt => {
                            if (operatorStmtExport.outputGenerators[frmt] !== undefined) throw new CompilerError(compileStmt.range, `Duplicate file format at compile statement \'${frmt}\'`);

                            operatorStmtExport.outputGenerators[frmt] = (src) => {
                                let out = '';

                                compileStmt.body.forEach(e => {
                                    if (e.type === NodeType.String) out += e.value;
                                    else if (e.type === NodeType.Variable) {
                                        const varExpr = e as VariableExpression;
                                        const v = src.match(new RegExp(regexes[varExpr.value].source, 'g'))[varExpr.index];

                                        if (v === undefined) throw new CompilerError(compileStmt.range, 'Unknown statement/expression.');
                                        out += v;
                                    } else if (e.type === NodeType.WhitespaceIdentifier) out += ' ';
                                });

                                return out;
                            };

                        });

                    } else if (stmt.type === NodeType.Imports) {
                        const importStmt = stmt as ImportsStatement;

                        importStmt.formats.forEach(frmt => {
                            if (operatorStmtExport.imports[frmt] !== undefined) throw new CompilerError(importStmt.range, `Duplicate file format at imports statement \'${frmt}\'`);
                            operatorStmtExport.imports[frmt] = importStmt.module;
                        });

                    } else throw new CompilerError(stmt.range, `Unexpected \'${stmt.type}\' statement insdie operator statement.`);
                });

                out.push(operatorStmtExport);
            } else if (statementIsA(statement, NodeType.Function)) {
                const statementExport: ExportedFunction = { type: ExportType.Function, args: statement.arguments.map(s => regexes[s]), name: statement.name, formatNames: {}, imports: {} };

                statement.body.forEach(stmt => {

                    if (statementIsA(stmt, NodeType.Compile)) {
                        if (stmt.body[0].type !== NodeType.String) throw new CompilerError(stmt.range, 'Expected a string after compile statement parens');
                        stmt.formats.forEach(each => {
                            if (statementExport.formatNames[each] !== undefined) throw new CompilerError(stmt.range, `Encountered multiple compile statements for target language '${each}'`);
                            statementExport.formatNames[each] = stmt.body[0].value;
                        });
                    } else if (statementIsA(stmt, NodeType.Imports)) {
                        stmt.formats.forEach(each => {
                            if (statementExport.imports[each] !== undefined) throw new CompilerError(stmt.range, `Encountered multiple import statements for target language '${each}'`);
                            statementExport.imports[each] = stmt.module;
                        });
                    }

                });


                out.push(statementExport);
            } else if (statementIsA(statement, NodeType.Keyword)) {
                out.push({ type: ExportType.Keyword, word: statement.word });
            } else if (statementIsA(statement, NodeType.Global)) {
                //TODO
            } else throw new CompilerError(statement.range, `Unexpected \'${statement.type}\' statement after export statement.`, file);

        });


        this.exportData[file] = out;
    }

    /**
     * Compiles every .sys file found in the given folder.
     * @param {string} folderPath Folder path to search for .sys files.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    public compileSysFiles(folderPath: string) {
        const files = readdirSync(folderPath);

        files.forEach(f => {
            if (f.endsWith('.sys')) this.compileSys(join(folderPath, f));
            else if (statSync(join(folderPath, f)).isDirectory()) this.compileSysFiles(join(folderPath, f));
        });
    }

    /**
     * Compiles a .sys file at the path given.
     * @param {string} file Path to the .sys file to compile.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.3
     */
    public compileSys(file: string) {
        const ast = sysparser.parseTokens(tokenizeSys(readFileSync(file).toString()), file);

        //# Handle import statements 
        var imported: AnyExportable[] = [];
        ast.body.forEach(stmt => {
            if (stmt.type === NodeType.Import) {
                const importStmt = stmt as ImportStatement;

                const pathToImport = join(dirname(file), importStmt.path.endsWith('.syx') ? importStmt.path : importStmt.path + '.syx');
                if (!existsSync(pathToImport)) throw new CompilerError(importStmt.range, `File \'${pathToImport}\' imported from \'${file}\' does not exist.`);
                this.exportData[pathToImport].forEach(exported => {
                    if (exported.type === ExportType.Operator)
                        if (imported.filter(r => r.type === ExportType.Operator).some(i => exported.regexMatcher === (i as ExportedOperator).regexMatcher)) throw new CompilerError(importStmt.range, `There are more than one operators with the same syntax imported to \'${file}\'.`);
                    imported.push(exported);
                });
            }
        });

        //# Get the actual file content to compile 
        const src = readFileSync(file).toString().split('');

        while (src.length > 0 && `${src[0]}${src[1]}${src[2]}` !== ':::') {
            src.shift();
        }
        src.shift();
        src.shift();
        src.shift();

        let fileContent = src.join('');
        const imports = [];

        //# Compile
        imported.forEach(i => {

            if (i.type === ExportType.Operator) {
                if (i.outputGenerators[this.mainFileFormat] === undefined) throw new CompilerError({ end: { character: 0, line: 0 }, start: { character: 0, line: 0 } }, `Can't compile operator to target language (${this.mainFileFormat}).`);
                fileContent = fileContent.replace(new RegExp(i.regexMatcher.source, 'g'), i.outputGenerators[this.mainFileFormat]);
                if (i.imports[this.mainFileFormat] !== undefined && !imports.includes(i.imports[this.mainFileFormat])) imports.push(i.imports[this.mainFileFormat]);
            } else if (i.type === ExportType.Function) {
                if (i.formatNames[this.mainFileFormat] === undefined) throw new CompilerError({ end: { character: 0, line: 0 }, start: { character: 0, line: 0 } }, `Can't compile function to target language (${this.mainFileFormat}).`);
                fileContent = fileContent.replace(new RegExp(i.name + '\\(' + i.args.map(m => m.source).join(',') + '\\)', 'g'), (m) => m.replace(i.name, i.formatNames[this.mainFileFormat]));
            }

        });

        writeFileSync(file.replace(this.rootDir, this.outDir).replace(/\.[^/.]+$/, '') + '.' + this.mainFileFormat, imports.map(i => `import ${i}`).join('\n') + '\n' + fileContent);

    }

}

/**
 * Type of something that can be exported.
 * @version 1.0.1
 * @since 0.0.1-alpha
 * @author efekos
 */
export enum ExportType {

    /**
     * {@link ExportedOperator}.
     */
    Operator,

    /**
     * {@link ExportedFunction}.
     */
    Function,

    /**
     * {@link ExportedKeyword}.
     */
    Keyword,

    /**
     * {@link ExportedGlobal}.
     */
    Global

}

/**
 * Base exportable interface.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface Exported {
    type: ExportType;
}

/**
 * Represents an exported operator. Uses type {@link ExportType.Operator}.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface ExportedOperator extends Exported {
    type: ExportType.Operator,
    regexMatcher: RegExp;
    outputGenerators: Record<string, OneParameterMethod<string, string>>;
    imports: Record<string, string>;
}

/**
 * Represents an exported function. Uses type {@link ExportType.Function}.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface ExportedFunction extends Exported {
    type: ExportType.Function;
    name: string;
    args: RegExp[];
    formatNames: Record<string, string>;
    imports: Record<string, string>;
}

/**
 * Represents an exported keyword. Uses type {@link ExportType.Keyword}.
 * @author efekos
 * @version 1.0.1
 * @since 0.0.1-alpha
 */
export interface ExportedKeyword extends Exported {
    type: ExportType.Keyword;
    word: string;
}

/**
 * A method that has one parameter with the type {@link V} and returns {@link R}.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export type OneParameterMethod<V, R> = (v: V) => R;

/**
 * A method that takes no parameters and returns an {@link R}.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export type ReturnerMethod<R> = () => R;

/**
 * Any interface that represents something exportable.
 */
export type AnyExportable = ExportedOperator | ExportedFunction | ExportedKeyword;

export const regexes: Record<string, RegExp> = {
    /**
     * Regex for `int` primitive type. `int`s can be any number that does not contain fractional digits.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.0
     */
    int: /([0-9]+)/,

    /**
     * Regex used for `string` primitive type. `string`s are phrases wrapped with quotation marks that can contain anything.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.0
     */
    string: /('[\u0000-\uffff]*'|"[\u0000-\uffff]*")/,

    /**
     * Regex used for `boolean` primitive type. `boolean`s are one bit, but 0 is represented as `false` and 1 is `false`.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.0
     */
    boolean: /(true|false)/,

    /**
     * Regex used for `decimal` primitive type. `decimal`s are either integers or numbers with fractional digits.
     * @author efekos
     * @since 0.0.1-alpha
     * @version 1.0.0
     */
    decimal: /([0-9]+(\.[0-9]+)?)/,

    /**
     * Regex used for whitespace identifiers, an identifier used to reference any amount of spaces.
     * @author efekos
     * @version 1.0.0
     * @since 0.0.1-alpha
     */
    '+s': /\s*/

};

/**
 * Escapes every RegExp character at the source string.
 * @param src Source string.
 * @returns Same string with every RegExp character replaced with '\\$&'. 
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export function escapeRegex(src: string): string {
    return src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}