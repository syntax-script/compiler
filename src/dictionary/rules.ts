/**
 * Value type of a rule.
 */
export type RuleType = 'keyword' | 'boolean';

/**
 * Base interface for rules. Represents a rule that can be modified by any file using `rule` modifier.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface BaseRule {
    name: string;
    type: RuleType;
}

/**
 * A rule that has a boolean type.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface BooleanRule extends BaseRule {
    type: 'boolean';
    default: boolean;
}


/**
 * A rule that has a string type.
 * @author efekos
 * @version 1.0.0
 * @since 0.0.1-alpha
 */
export interface StringRule extends BaseRule {
    type: 'keyword';
    default: string;
}

/**
 * A rule that can be modified using `rule` statements.
 */
export type Rule = BooleanRule | StringRule;