import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'node', // Do chúng ta test module logic (không có react UI)
        globals: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
})
