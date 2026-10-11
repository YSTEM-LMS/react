// Production environment config.
//
// REACT_APP_* variables are inlined at build time by the `define` block in
// vite.config.mts. That is a plain text substitution, so every variable must be
// referenced by its full literal name (process.env.REACT_APP_FOO). A dynamic
// lookup like process.env[name] cannot be replaced, and would survive into the
// bundle as a reference to `process`, which does not exist in the browser.
// Production builds must provide all service URLs explicitly.

const requiredProductionEnv = (name, value) => {
        if (process.env.NODE_ENV === 'production' && !value) {
                throw new Error(`Missing required production environment variable: ${name}`);
        }

        return value || '';
};

export const environment = {
        production: true,
        agora: {
                appId: process.env.REACT_APP_AGORA_APP_ID || '',
        },
        urls: {
                // No trailing slash. Consumers append their own route paths.
                middlewareURL: requiredProductionEnv(
                        'REACT_APP_MIDDLEWARE_URL',
                        process.env.REACT_APP_MIDDLEWARE_URL
                ),
                stockfishServerURL: requiredProductionEnv(
                        'REACT_APP_STOCKFISH_SERVER_URL',
                        process.env.REACT_APP_STOCKFISH_SERVER_URL
                ),
                chessServerURL: requiredProductionEnv(
                        'REACT_APP_CHESS_SERVER_URL',
                        process.env.REACT_APP_CHESS_SERVER_URL
                ),
                // Optional, not required: only gates the "open board" button in
                // PlayStudent.tsx, which already handles an empty value gracefully.
                // Unlike the three URLs above, a missing value here shouldn't take
                // down the whole app for every visitor.
                chessClientURL: process.env.REACT_APP_CHESS_CLIENT_URL || '',
        },
        productionType: 'production',
};
