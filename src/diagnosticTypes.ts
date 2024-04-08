
/**
 * Represents a diagnostic, such as a compiler error or warning. Diagnostic objects are only valid in the scope of a resource.
 * @author Microsoft
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic
 * @since 3.17.0
 */
export interface Diagnostic {
    /**
     * The range at which the message applies.
     */
    range: Range;

    /**
     * The diagnostic's severity. Can be omitted. If omitted it is up to the
     * client to interpret diagnostics as error, warning, info or hint.
     */
    severity?: DiagnosticSeverity;

    /**
     * The diagnostic's code, which might appear in the user interface.
     */
    code?: number | string;

    /**
     * An optional property to describe the error code.
     *
     * @since 3.16.0
     */
    codeDescription?: CodeDescription;

    /**
     * A human-readable string describing the source of this
     * diagnostic, e.g. 'typescript' or 'super lint'.
     */
    source?: string;

    /**
     * The diagnostic's message.
     */
    message: string;

    /**
     * Additional metadata about the diagnostic.
     *
     * @since 3.15.0
     */
    tags?: DiagnosticTag[];

    /**
     * An array of related diagnostic information, e.g. when symbol-names within
     * a scope collide all definitions can be marked via this property.
     */
    relatedInformation?: DiagnosticRelatedInformation[];

    /**
     * A data entry field that is preserved between a
     * `textDocument/publishDiagnostics` notification and
     * `textDocument/codeAction` request.
     *
     * @since 3.16.0
     */
    data?: unknown;
}

/**
 * A diagnostic report with a full set of problems.
 *
 * @since 3.17.0
 * @author Microsoft
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#fullDocumentDiagnosticReport
 * 
 */
export interface FullDocumentDiagnosticReport {
    /**
     * A full document diagnostic report.
     */
    kind: DocumentDiagnosticReportKind.Full;

    /**
     * An optional result id. If provided it will
     * be sent on the next diagnostic request for the
     * same document.
     */
    resultId?: string;

    /**
     * The actual items.
     */
    items: Diagnostic[];
}

/**
 * Severity of a diagnostic.
 * @author Microsoft
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnosticSeverity
 * @since 3.17.0
 */
export enum DiagnosticSeverity {

    /**
     * An error.
     */
    Error = 1,

    /**
     * A warning.
     */
    Warning = 2,

    /**
     * An information.
     */
    Information = 3,

    /**
     * A hint.
     */
    Hint = 4
}

/**
 * @author Microsoft
 * @since 3.17.0
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#position
 */
interface Position {
    /**
     * Line position in a document (zero-based).
     */
    line: number;

    /**
     * Character offset on a line in a document (zero-based). The meaning of this
     * offset is determined by the negotiated `PositionEncodingKind`.
     *
     * If the character value is greater than the line length it defaults back
     * to the line length.
     */
    character: number;
}

/**
 * A range in a text document expressed as (zero-based) start and end positions.
 * A range is comparable to a selection in an editor. Therefore, the end position
 * is exclusive. If you want to specify a range that contains a line including
 * the line ending character(s) then use an end position denoting the start of the next line.
 * @author Microsoft
 * @since 3.17.0
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#range
 */
interface Range {
    /**
     * The range's start position.
     */
    start: Position;

    /**
     * The range's end position.
     */
    end: Position;
}

/**
 * The diagnostic tags.
 *
 * @since 3.15.0
 * @author Microsoft
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnosticTag
 */
export enum DiagnosticTag {
    /**
     * Unused or unnecessary code.
     *
     * Clients are allowed to render diagnostics with this tag faded out
     * instead of having an error squiggle.
     */
    Unnecessary = 1,
    /**
     * Deprecated or obsolete code.
     *
     * Clients are allowed to rendered diagnostics with this tag strike through.
     */
    Deprecated = 2
}

/**
 * Structure to capture a description for an error code.
 *
 * @since 3.16.0
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#codeDescription
 * @author Microsoft
 */
export interface CodeDescription {
    /**
     * An URI to open with more information about the diagnostic error.
     */
    href: URI;
}

/**
 * Represents a string used as an uri.
 */
export type URI = string;


/**
 * Represents a related message and source code location for a diagnostic.
 * This should be used to point to code locations that cause or are related to
 * a diagnostics, e.g when duplicating a symbol in a scope.
 * @author Microsoft
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnosticRelatedInformation
 * @since 3.17.0
 */
export interface DiagnosticRelatedInformation {
    /**
     * The location of this related diagnostic information.
     */
    location: Location;

    /**
     * The message of this related diagnostic information.
     */
    message: string;
}


/**
 * The document diagnostic report kinds.
 *
 * @since 3.17.0
 * @author Microsoft
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#documentDiagnosticReportKind
 */
export enum DocumentDiagnosticReportKind {
    /**
     * A diagnostic report with a full
     * set of problems.
     */
    Full = 'full',

    /**
     * A report indicating that the last
     * returned report is still accurate.
     */
    Unchanged = 'unchanged'
}