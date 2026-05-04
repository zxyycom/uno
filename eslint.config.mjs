import eslintJs from '@eslint/js';
import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
    // 基础JavaScript规则
    eslintJs.configs.recommended,

    // 全局变量
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    // 忽略文件
    {
        ignores: [
            'dist/**',
            '.git/**',
            'build/**',
            'assets/tiledmap/**',
            'node_modules/**',
            '*.config.js',
            '*.config.ts',
            'assets/libs/npm/**',
            'cocos-engine/**',
            'temp/**',
            'library/**',
            'docs/**',
            '**/*.d.ts',
            'extensions/**',
            '.claude/worktrees/**',
        ],
    },

    // TypeScript配置
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tsEslint,
        },
        rules: {
            ...tsEslint.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },

    // // 导入排序
    // {
    //     plugins: {
    //         'simple-import-sort': simpleImportSort,
    //     },
    //     rules: {
    //         'simple-import-sort/imports': [
    //             'warn',
    //             {
    //                 groups: [
    //                     // 第三方库
    //                     [String.raw`^@?\w`],
    //                     // 内部路径
    //                     ['^@/'],
    //                     // 相对路径
    //                     [String.raw`^\.`],
    //                 ],
    //             },
    //         ],
    //     },
    // },

    // Prettier集成
    {
        files: ['**/*.{js,ts,tsx}'],
        ...prettierConfig,
        plugins: {
            prettier: prettierPlugin,
        },
    },

    // 为特定文件/目录设置 Node.js 环境
    {
        // 匹配开发脚本文件（根据你的实际路径调整）
        files: ['scripts/**/*.js', 'scripts/**/*.ts', '*.dev.js'],
        // 为这些文件设置 Node.js 环境
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
];
