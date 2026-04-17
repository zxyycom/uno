/**
 * xstate spread 替换脚本
 * 基于 diff 文件 xstate-spread-to-array-from.diff 进行文本替换
 * 将 [...Set] 和 [...new Set(...)] 转换为 Array.from()
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';

import { isMainModule } from './bundle-libraries.js';
import { applyRules, escapeRegex } from './text-replace-utils.js';

// 替换规则数组
export const REPLACEMENTS = [
    {
        // 313
        pattern: RegExp(
            escapeRegex(
                'return [...new Set([...snapshot._nodes.flatMap(sn => sn.ownEvents)])]'
            )
        ),
        replacement:
            'return Array.from(new Set(snapshot._nodes.flatMap((sn) => sn.ownEvents)));',
        startLine: 300,
        endLine: 323,
    },
    {
        // 1671
        pattern: RegExp(escapeRegex('[...stateNode.transitions.keys()]')),
        replacement: 'Array.from(stateNode.transitions.keys())',
        startLine: 1661,
        endLine: 1681,
    },
    {
        pattern: RegExp(escapeRegex('return [...targets];')),
        replacement: 'return Array.from(targets);',
        startLine: 2045,
        endLine: 2065,
    },
    {
        pattern: RegExp(escapeRegex('return [...statesToExit];')),
        replacement: 'return Array.from(statesToExit);',
        startLine: 2081,
        endLine: 2101,
    },
    {
        pattern: RegExp(
            escapeRegex('const nextStateNodes = [...mutStateNodeSet];')
        ),
        replacement: 'const nextStateNodes = Array.from(mutStateNodeSet);',
        startLine: 2115,
        endLine: 2135,
    },
    {
        pattern: RegExp(
            escapeRegex(
                'for (const stateNodeToEnter of [...statesToEnter].sort('
            )
        ),
        replacement:
            'for (const stateNodeToEnter of Array.from(statesToEnter).sort(',
        startLine: 2156,
        endLine: 2176,
    },
    {
        pattern: RegExp(
            escapeRegex('![...statesToEnter].some(s => isDescendant(s, child))')
        ),
        replacement:
            '!Array.from(statesToEnter).some((s) => isDescendant(s, child))',
        startLine: 2260,
        endLine: 2280,
    },
    {
        pattern: RegExp(
            escapeRegex('![...statesToEnter].some(s => isDescendant(s, child))')
        ),
        replacement:
            '!Array.from(statesToEnter).some((s) => isDescendant(s, child))',
        startLine: 2279,
        endLine: 2299,
    },
    {
        pattern: RegExp(
            escapeRegex('return getStateValue(rootNode, [...allStateNodes]);')
        ),
        replacement:
            'return getStateValue(rootNode, Array.from(allStateNodes));',
        startLine: 2498,
        endLine: 2518,
    },
    {
        pattern: RegExp(
            escapeRegex(
                'transitions: [...this.transitions.values()].flat().map(t => ({'
            )
        ),
        replacement:
            'transitions: Array.from(this.transitions.values())\n.flat()\n.map((t) => ({',
        startLine: 3816,
        endLine: 3836,
    },
    {
        pattern: RegExp(escapeRegex('return [...transitions]')),
        replacement: 'return Array.from(transitions)',
        startLine: 3871,
        endLine: 3891,
    },
    {
        pattern: RegExp(escapeRegex('_nodes: [...nodeSet],')),
        replacement: '_nodes: Array.from(nodeSet),',
        startLine: 4024,
        endLine: 4044,
    },
    {
        pattern: RegExp(
            escapeRegex('target: [...getInitialStateNodes(this.root)],')
        ),
        replacement: 'target: Array.from(getInitialStateNodes(this.root)),',
        startLine: 4097,
        endLine: 4117,
    },
    {
        pattern: RegExp(escapeRegex('const sorted = [...this.timeouts].sort(')),
        replacement: 'const sorted = Array.from(this.timeouts).sort(',
        startLine: 4826,
        endLine: 4856,
    },
];

/**
 * 执行xstate替换操作
 * @returns {boolean} - 是否成功
 */
export function applyXstateReplacements() {
    const filePath = './assets/libs/npm/xstate/xstate.js';
    if (!existsSync(filePath)) {
        console.error(`❌ 文件不存在: ${filePath}`);
        return false;
    }

    console.log(`📖 正在读取文件: ${filePath}`);
    const content = readFileSync(filePath, 'utf8');

    // 应用替换规则
    const result = applyRules(content, REPLACEMENTS);

    if (result.applied.length === 0 || !result.success) {
        console.log('❌ 没有应用任何替换');
        return false;
    }

    // 写回文件
    writeFileSync(filePath, result.result, 'utf8');

    console.log(`\n✅ 成功应用 ${result.applied.length} 个替换`);

    return true;
}

if (isMainModule()) {
    applyXstateReplacements();
}
