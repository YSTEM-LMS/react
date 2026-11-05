// Production environment config.
//
// Single origin: the frontend nginx serves the app and proxies each service
// under a path prefix (nginx/default.conf.template), so these URLs are
// relative and the same build runs in every environment.

export const environment = {
        production: true,
        agora: {
                appId: process.env.REACT_APP_AGORA_APP_ID || '',
        },
        urls: {
                // No trailing slash. Consumers append their own route paths.
                middlewareURL: '/middleware',
                stockfishServerURL: '/stockfishserver',
                chessServerURL: '/chessserver',
                chessClientURL: '/chessclient',
        },
        productionType: 'production',
};
