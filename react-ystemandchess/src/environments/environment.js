export const environment = {
	production: false,
	agora: {
		appId: '6b7772f2a76f406192d8167460181be0',
	},
	urls: {
    middlewareURL: 'http://localhost:8000',
    stockfishServerURL: 'http://localhost:8080', // unified naming
    chessServerURL: 'http://localhost:8080',     // point to mock stockfish server for testing
  },
  productionType: 'development',
};
