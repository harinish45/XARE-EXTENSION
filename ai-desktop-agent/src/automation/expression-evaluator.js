/**
 * Expression Evaluator
 * Safely evaluates expressions for workflow conditional logic
 */

class ExpressionEvaluator {
    constructor() {
        // Allowed operators
        this.operators = {
            '==': (a, b) => a == b,
            '===': (a, b) => a === b,
            '!=': (a, b) => a != b,
            '!==': (a, b) => a !== b,
            '>': (a, b) => a > b,
            '>=': (a, b) => a >= b,
            '<': (a, b) => a < b,
            '<=': (a, b) => a <= b,
            '&&': (a, b) => a && b,
            '||': (a, b) => a || b,
            '+': (a, b) => a + b,
            '-': (a, b) => a - b,
            '*': (a, b) => a * b,
            '/': (a, b) => a / b,
            '%': (a, b) => a % b
        };

        // Allowed functions
        this.functions = {
            'contains': (str, substr) => String(str).includes(substr),
            'startsWith': (str, prefix) => String(str).startsWith(prefix),
            'endsWith': (str, suffix) => String(str).endsWith(suffix),
            'length': (str) => String(str).length,
            'toLowerCase': (str) => String(str).toLowerCase(),
            'toUpperCase': (str) => String(str).toUpperCase(),
            'trim': (str) => String(str).trim(),
            'parseInt': (str) => parseInt(str, 10),
            'parseFloat': (str) => parseFloat(str),
            'isNumber': (val) => !isNaN(parseFloat(val)) && isFinite(val),
            'isEmpty': (val) => !val || val.length === 0,
            'isNull': (val) => val === null || val === undefined,
            'abs': (num) => Math.abs(num),
            'round': (num) => Math.round(num),
            'floor': (num) => Math.floor(num),
            'ceil': (num) => Math.ceil(num),
            'max': (...args) => Math.max(...args),
            'min': (...args) => Math.min(...args)
        };
    }

    /**
     * Evaluate an expression with context
     * @param {string} expression - Expression to evaluate
     * @param {Object} context - Variable context
     * @returns {any} Evaluation result
     */
    evaluate(expression, context = {}) {
        try {
            // Replace variables with values
            const resolved = this.resolveVariables(expression, context);

            // Parse and evaluate
            return this.evaluateExpression(resolved, context);
        } catch (error) {
            console.error('[ExpressionEvaluator] Error:', error);
            return false;
        }
    }

    /**
     * Resolve variables in expression
     * @param {string} expression - Expression with variables
     * @param {Object} context - Variable context
     * @returns {string} Resolved expression
     */
    resolveVariables(expression, context) {
        // Replace {{variable}} with actual values
        return expression.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
            if (context.hasOwnProperty(varName)) {
                const value = context[varName];
                // Quote strings for evaluation
                if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '\\"')}"`;
                }
                return String(value);
            }
            return match;
        });
    }

    /**
     * Evaluate a resolved expression
     * @param {string} expression - Resolved expression
     * @param {Object} context - Variable context
     * @returns {any} Result
     */
    evaluateExpression(expression, context) {
        // Handle simple boolean values
        if (expression === 'true') return true;
        if (expression === 'false') return false;
        if (expression === 'null') return null;
        if (expression === 'undefined') return undefined;

        // Handle numbers
        if (/^-?\d+(\.\d+)?$/.test(expression.trim())) {
            return parseFloat(expression);
        }

        // Handle strings
        if (/^["'].*["']$/.test(expression.trim())) {
            return expression.trim().slice(1, -1);
        }

        // Handle function calls
        const functionMatch = expression.match(/^(\w+)\((.*)\)$/);
        if (functionMatch) {
            return this.evaluateFunction(functionMatch[1], functionMatch[2], context);
        }

        // Handle comparison operators
        for (const [op, fn] of Object.entries(this.operators)) {
            if (expression.includes(op)) {
                const parts = this.splitByOperator(expression, op);
                if (parts.length === 2) {
                    const left = this.evaluateExpression(parts[0].trim(), context);
                    const right = this.evaluateExpression(parts[1].trim(), context);
                    return fn(left, right);
                }
            }
        }

        // If nothing matched, try to get from context
        if (context.hasOwnProperty(expression.trim())) {
            return context[expression.trim()];
        }

        // Default to the expression itself
        return expression;
    }

    /**
     * Evaluate a function call
     * @param {string} funcName - Function name
     * @param {string} argsStr - Arguments string
     * @param {Object} context - Variable context
     * @returns {any} Function result
     */
    evaluateFunction(funcName, argsStr, context) {
        if (!this.functions.hasOwnProperty(funcName)) {
            throw new Error(`Unknown function: ${funcName}`);
        }

        // Parse arguments
        const args = this.parseArguments(argsStr, context);

        // Call function
        return this.functions[funcName](...args);
    }

    /**
     * Parse function arguments
     * @param {string} argsStr - Arguments string
     * @param {Object} context - Variable context
     * @returns {Array} Parsed arguments
     */
    parseArguments(argsStr, context) {
        if (!argsStr.trim()) return [];

        const args = [];
        let current = '';
        let inString = false;
        let stringChar = '';
        let depth = 0;

        for (let i = 0; i < argsStr.length; i++) {
            const char = argsStr[i];

            if ((char === '"' || char === "'") && argsStr[i - 1] !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
                current += char;
            } else if (char === '(' && !inString) {
                depth++;
                current += char;
            } else if (char === ')' && !inString) {
                depth--;
                current += char;
            } else if (char === ',' && !inString && depth === 0) {
                args.push(this.evaluateExpression(current.trim(), context));
                current = '';
            } else {
                current += char;
            }
        }

        if (current.trim()) {
            args.push(this.evaluateExpression(current.trim(), context));
        }

        return args;
    }

    /**
     * Split expression by operator
     * @param {string} expression - Expression to split
     * @param {string} operator - Operator to split by
     * @returns {Array} Parts
     */
    splitByOperator(expression, operator) {
        const parts = [];
        let current = '';
        let inString = false;
        let stringChar = '';
        let depth = 0;

        for (let i = 0; i < expression.length; i++) {
            const char = expression[i];
            const nextChars = expression.substr(i, operator.length);

            if ((char === '"' || char === "'") && expression[i - 1] !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
                current += char;
            } else if (char === '(' && !inString) {
                depth++;
                current += char;
            } else if (char === ')' && !inString) {
                depth--;
                current += char;
            } else if (nextChars === operator && !inString && depth === 0) {
                parts.push(current);
                current = '';
                i += operator.length - 1;
            } else {
                current += char;
            }
        }

        parts.push(current);
        return parts;
    }

    /**
     * Register a custom function
     * @param {string} name - Function name
     * @param {Function} fn - Function implementation
     */
    registerFunction(name, fn) {
        this.functions[name] = fn;
    }

    /**
     * Register a custom operator
     * @param {string} symbol - Operator symbol
     * @param {Function} fn - Operator implementation
     */
    registerOperator(symbol, fn) {
        this.operators[symbol] = fn;
    }
}

module.exports = ExpressionEvaluator;
