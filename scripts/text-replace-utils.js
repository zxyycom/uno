/**
 * 文本替换工具
 * 提供文本正则替换功能，支持行数范围控制
 */

/**
 * 在整个文本中进行正则匹配并替换
 * @param {string} text - 原始文本
 * @param {RegExp} pattern - 正则表达式
 * @param {string} replacement - 替换字符串
 * @returns {Object} - { success: boolean, result: string, matched: boolean }
 */
export function replaceInText(text, pattern, replacement) {
    if (!text || typeof text !== 'string') {
        return { success: false, result: text, matched: false };
    }

    const newResult = text.replace(pattern, replacement);
    const matched = newResult !== text;

    return {
        success: true,
        result: newResult,
        matched: matched,
    };
}

/**
 * 在指定行数范围内提取文本片段，进行正则匹配并替换
 * @param {string} text - 原始文本
 * @param {number} startLine - 起始行号（1开始）
 * @param {number} endLine - 结束行号
 * @param {RegExp} pattern - 正则表达式
 * @param {string} replacement - 替换字符串
 * @returns {Object} - { success: boolean, result: string, matched: boolean, line: number | null }
 */
export function replaceInLineRange(
    text,
    startLine,
    endLine,
    pattern,
    replacement
) {
    if (!text || typeof text !== 'string') {
        return { success: false, result: text, matched: false, line: null };
    }

    if (startLine < 1 || endLine < startLine) {
        return { success: false, result: text, matched: false, line: null };
    }

    const lines = text.split('\n');
    const startIndex = startLine - 1;
    const endIndex = Math.min(endLine, lines.length) - 1;

    // 提取指定行范围的文本片段
    const beforeLines = lines.slice(0, startIndex);
    const targetLines = lines.slice(startIndex, endIndex + 1);
    const afterLines = lines.slice(endIndex + 1);

    // 对提取出的文本片段进行正则替换
    const targetText = targetLines.join('\n');
    const newTargetText = targetText.replace(pattern, replacement);
    const matched = newTargetText !== targetText;

    // 拼接回原始文本
    const newLines = [
        ...beforeLines,
        ...newTargetText.split('\n'),
        ...afterLines,
    ];
    const result = newLines.join('\n');

    return {
        success: true,
        result: result,
        matched: matched,
        line: matched ? startLine : null,
    };
}

/**
 * 批量应用替换规则（支持动态行号调整）
 * @param {string} text - 原始文本
 * @param {Array} rules - 替换规则数组 [{ pattern, replacement, startLine, endLine }]
 * @returns {Object} - { success: boolean, result: string, applied: Array, lineOffset: number }
 */
export function applyRules(text, rules) {
    let result = text;
    let applied = [];
    let lineOffset = 0; // 行号偏移量，记录前面替换导致的行号变化
    let success = true;
    // 按起始行号排序
    rules.sort((a, b) => a.startLine - b.startLine);

    rules.forEach((rule, index) => {
        let replaceResult;
        let originalStartLine;
        let lineDiff = 0; // 当前替换导致的行号变化

        if (rule.startLine && rule.endLine) {
            // 有行数范围限制，需要动态调整行号
            originalStartLine = rule.startLine;

            // 应用行号偏移量，计算出实际要替换的行号范围
            const adjustedStartLine = rule.startLine + lineOffset;
            const adjustedEndLine = rule.endLine + lineOffset;

            // 原始行数
            const originalLineCount = (result.match(/\n/g) || []).length;

            // 执行替换
            replaceResult = replaceInLineRange(
                result,
                adjustedStartLine,
                adjustedEndLine,
                rule.pattern,
                rule.replacement
            );

            // 如果匹配成功，计算行号变化
            if (replaceResult.matched) {
                // 替换后行数
                const replacementLineCount = (
                    replaceResult.result.match(/\n/g) || []
                ).length;
                lineDiff = replacementLineCount - originalLineCount;
            }
        } else {
            // 无行数范围限制，全局替换
            const linesBefore = result.split('\n');
            const beforeLineCount = linesBefore.length;

            replaceResult = replaceInText(
                result,
                rule.pattern,
                rule.replacement
            );

            if (replaceResult.matched) {
                const linesAfter = replaceResult.result.split('\n');
                const afterLineCount = linesAfter.length;
                lineDiff = afterLineCount - beforeLineCount;
            }
        }

        if (replaceResult.success && replaceResult.matched) {
            applied.push({
                index: index + 1,
                line: replaceResult.line ? replaceResult.line : null,
                originalLine: originalStartLine || null,
                lineDiff: lineDiff,
                currentOffset: lineOffset,
            });
        } else {
            success = false;
        }

        result = replaceResult.result;
        lineOffset += lineDiff; // 累加行号偏移量
    });

    return {
        success: success,
        result: result,
        applied: applied,
        lineOffset: lineOffset,
    };
}

export function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
