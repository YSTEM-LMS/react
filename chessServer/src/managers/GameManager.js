const { Chess } = require("chess.js")

/**
 * GameManager class handles chess game sessions, state, and logic.
 */
class GameManager {
    constructor() {
        this.ongoingGames = []
    }

    /**
     * 
     * @param {Object} param0 - Contains student, mentor, role, socketId
     * @returns {Object} Game object, assigned color, and new game status
     */
    createOrJoinGame({ student, mentor, role, socketId }) {
        let game = this.ongoingGames.find(
            (g) => g.student.username === student || g.mentor.username === mentor
        );

        if (role != "student" && role != "mentor") {
            throw new Error("Invalid role!");
        }

        // Player already in a game
        if (game) {
            console.log("already in a game")
            if (role == "student") {
                game.student.id = socketId;
                return { game, color: game.student.color, newGame: false };
            }
            else if (role == "mentor") {
                game.mentor.id = socketId;
                return { game, color: game.mentor.color, newGame: false };
            }
            else {
                throw new Error("Invalid role!");
            }
        }

        console.log("creating new game in game manager")
        // Create a new game instance
        const board = new Chess();
        const studentColor = role === "student" ? "black" : "white";
        const mentorColor = role === "student" ? "white" : "black";

        const studentPlayer = {
            username: student,
            id: role === "student" ? socketId : null,
            color: studentColor
        };
        const mentorPlayer = {
            username: mentor,
            id: role === "mentor" ? socketId : null,
            color: mentorColor
        };

        const newGame = {
            student: studentPlayer,
            mentor: mentorPlayer,
            // Role-neutral view of the SAME two player objects (same references,
            // so mutating game.student also updates game.players[0]). Lets shared
            // logic — outcome detection, resignation — work for both
            // mentor-vs-student and student-vs-student games without caring which
            // slot is which. See student-vs-student-design.md §5a.
            players: [studentPlayer, mentorPlayer],
            gameId: null,
            isPvp: false,
            boardState: board,
            pastStates: []
        };

        this.ongoingGames.push(newGame);

        return {
            game: newGame,
            color: role === "student" ? studentColor : mentorColor,
            newGame: true
        };
    }

    /**
     * Creates or joins a student-vs-student (PvP) game, keyed by a shared
     * gameId issued by the middleware when a challenge is accepted.
     *
     * Both players are students, so there is no student/mentor asymmetry here.
     * The two internal slots are still named `student`/`mentor` so that all the
     * existing machinery (makeMove, broadcastBoardState, relayToOpponent, …)
     * keeps working unchanged; `game.players` is the role-neutral accessor and
     * `game.isPvp` marks that the slot NAMES carry no meaning in this game.
     * See student-vs-student-design.md §5a.
     *
     * The challenger takes white. Whichever client connects first creates the
     * game; the second joins it by gameId. Reconnecting with the same username
     * reclaims the original seat and color rather than creating a new game.
     *
     * Each seat also carries the joining client's `credentials` (bearer token).
     * The result report at game end is sent to the middleware as one of the two
     * players, and resign/disconnect endings are triggered by a socket event
     * that carries no body — so the token has to be captured at join time.
     *
     * @param {Object} param0 - Contains gameId, challenger, opponent, username, socketId, credentials
     * @returns {Object} Game object, assigned color, and new game status
     */
    createOrJoinPvpGame({ gameId, challenger, opponent, username, socketId, credentials }) {
        if (!gameId) {
            throw new Error("A gameId is required to join a student-vs-student game!");
        }
        if (!challenger || !opponent) {
            throw new Error("Both challenger and opponent usernames are required!");
        }
        if (challenger === opponent) {
            throw new Error("A student cannot challenge themselves!");
        }
        if (username !== challenger && username !== opponent) {
            throw new Error("You are not a player in this game!");
        }

        const game = this.getGameByGameId(gameId);

        // Game already exists — take (or reclaim) our seat.
        if (game) {
            const seat = game.players.find((p) => p.username === username);
            if (!seat) {
                throw new Error("You are not a player in this game!");
            }
            seat.id = socketId;
            if (credentials) seat.credentials = credentials;
            return { game, color: seat.color, newGame: false };
        }

        // First player in creates the game; both seats are known upfront from
        // the accepted challenge, so the opponent's seat just waits for a socket.
        const board = new Chess();
        const challengerPlayer = {
            username: challenger,
            id: username === challenger ? socketId : null,
            credentials: username === challenger ? credentials : null,
            color: "white"
        };
        const opponentPlayer = {
            username: opponent,
            id: username === opponent ? socketId : null,
            credentials: username === opponent ? credentials : null,
            color: "black"
        };

        const newGame = {
            student: challengerPlayer,
            mentor: opponentPlayer,
            players: [challengerPlayer, opponentPlayer],
            gameId,
            isPvp: true,
            boardState: board,
            pastStates: []
        };

        this.ongoingGames.push(newGame);

        return {
            game: newGame,
            color: username === challenger ? "white" : "black",
            newGame: true
        };
    }

    /**
     * Verifies that the holder of `credentials` is the real, paired mentor of
     * `claimedStudent`, via middlewareNode's GET /user/getMentorship (the same
     * bearer-forwarding pattern EventHandlers.js already uses for /gameResults).
     * Fails closed: missing config, a missing/invalid token, a non-200 response,
     * a network error, or a mismatched pairing all throw and reject the join.
     * @param {string} claimedStudent
     * @param {string} credentials
     */
    async verifyMentorPairing(claimedStudent, credentials) {
        if (!process.env.MIDDLEWARE_URL) {
            console.error("[createOrJoinPuzzle] MIDDLEWARE_URL unset — rejecting mentor join");
            throw new Error("Server misconfigured: cannot verify mentor pairing");
        }
        if (!credentials) {
            throw new Error("A login token is required to join as a mentor");
        }

        let data;
        try {
            const response = await fetch(`${process.env.MIDDLEWARE_URL}/user/getMentorship`, {
                headers: {
                    // NOTE: /gameResults uses "Authentication" here, matching its own
                    // requireAuth check — but GET /user/getMentorship is protected by
                    // passport-jwt's fromAuthHeaderAsBearerToken(), which only reads
                    // the standard "Authorization" header. Using "Authentication" here
                    // would make this check silently reject every valid token.
                    Authorization: `Bearer ${credentials}`,
                },
            });
            if (response.status !== 200) {
                throw new Error("Could not verify mentor pairing");
            }
            data = await response.json();
        } catch (e) {
            throw new Error("Could not verify mentor pairing");
        }

        if (!data || !data.username || data.username !== claimedStudent) {
            throw new Error("You are not this student's mentor");
        }
    }

    /**
     *
     * @param {Object} param0 - Contains student, mentor, role, socketId
     * @returns {Object} Game object, assigned color, and new game status
     */
    async createOrJoinPuzzle({ student, mentor, role, socketId, credentials }, io) {
        // must be a student or mentor to connect to server
        if (role !== "student" && role !== "mentor") {
            throw new Error("Invalid role!");
        }

        // The mentor seat gets a live view into another user's puzzle session,
        // so it must be verified against the real mentor/student pairing before
        // anyone is seated. Student joins are unchanged (see PuzzleStreak.tsx,
        // which shares this room model but has no real mentor to verify against).
        if (role === "mentor") {
            await this.verifyMentorPairing(student, credentials);
        }

        const socket = io.sockets.sockets.get(socketId);

        // A puzzle room is keyed to the STUDENT (the solver). Both the student's
        // client and the mentor's client send the same student username, so both
        // resolve to the same room regardless of who connects first.
        let game = this.ongoingGames.find((g) => g.student.username === student);

        if (!game) {
            // First contact for this student — create the room. The student seat
            // is the host/solver; the mentor seat is a passive observer.
            game = {
                student: {
                    username: student,
                    id: role === "student" ? socketId : null,
                    color: "white",
                    credentials: credentials,
                },
                mentor: {
                    username: mentor,
                    id: role === "mentor" ? socketId : null,
                    color: "white", // student & mentor are on the same side in a puzzle
                },
                boardState: new Chess(),
                pastStates: [],
                puzzle: "No hints available",
                isPuzzle: true,
            };
            this.ongoingGames.push(game);
        } else {
            // Room exists — record/refresh this client's socket id on its seat.
            if (role === "student") {
                game.student.id = socketId;
                if (credentials) game.student.credentials = credentials;
            } else {
                game.mentor.id = socketId;
            }
        }

        // Role — not connection order — decides who drives the puzzle:
        //   student => host (solves), mentor => guest (watches only).
        // This makes the Socratic flow deterministic: the student always solves
        // and the mentor always observes, even if the mentor connects first.
        if (role === "student") {
            socket.emit("host");
        } else {
            socket.emit("guest");
            // Show the observing mentor the current board + hints immediately.
            socket.emit("boardstate", JSON.stringify({
                boardState: game.boardState.fen(),
                color: game.student.color,
            }));
            socket.emit("message", JSON.stringify({ message: game.puzzle }));
        }

        return {
            game,
            color: role === "student" ? game.student.color : game.mentor.color,
            newGame: role === "student",
        };
    }


    /**
     * Handles a player making a move.
     * @param {*} socketId 
     * @param {*} moveFrom 
     * @param {*} moveTo 
     * @returns {Object} Updated board state, move details, and socket IDs
     */
    makeMove(socketId, moveFrom, moveTo) {
        const game = this.getGameBySocketId(socketId);

        if (!game) {
            throw new Error("Game not found for this socket!");
        }

        if (game.isPuzzle && socketId !== game.student.id) {
            throw new Error("Only the student may move in a puzzle!");
        }

        const board = game.boardState;
        const move = {from: moveFrom, to: moveTo};
        //console.log(move, typeof(move), typeof(move)==='object');
        const moveResult = board.move(move);
        console.log(moveResult);

        if (!moveResult) {
            throw new Error("Invalid move!");
        }

        // Save board state
        game.pastStates.push(board.fen())

        const flags = moveResult.flags || ""; // e.g., 'c' capture, 'k'/'q' castle, 'e' en passant, 'p' promotion
        const activityEvents = [];

        const captureMap = {
            q: "captureQueen",
            r: "captureRook",
            n: "captureKnight",
            b: "captureBishop",
            p: "capturePawn"
        };

        // Capture (including en passant)
        if (flags.includes("c") || flags.includes("e")) {
            const capLetter = moveResult.captured; // 'q','r','n','b','p'
            const name = capLetter ? captureMap[capLetter] : null;
            if (name) {
            activityEvents.push({
                name,
                meta: {
                from: moveResult.from,
                to: moveResult.to,
                san: moveResult.san
                },
                at: Date.now()
            });
            }
        }

        // Castling
        if (flags.includes("k") || flags.includes("q")) {
            activityEvents.push({
            name: "performCastle",
            meta: { san: moveResult.san },
            at: Date.now()
            });
        }
        //console.log(activityEvents);
        //console.log('student info',game.student);

        // Detect game-over so the result can be recorded for the leaderboard.
        // See documentation/student-vs-student-design.md §6.
        const outcome = this.detectOutcome(game);
        // Latch the game as finished so a later disconnect/resign on the same
        // game can't emit a second "gameover" and report the result twice.
        if (outcome.over) {
            game.isOver = true;
        }

        return {
                result: {
                            boardState: board.fen(),
                            move: moveResult,
                            studentId: game.student.id,
                            mentorId: game.mentor.id,
                            studentUsername: game.student.username,
                            outcome,
                        },
                activityEvents: activityEvents
        };
    }

    /**
     * Undoes the last move in the game.
     * @param {*} socketId 
     * @returns {Object} Updated board state and undo info
     */
    undoMove(socketId) {
        const game = this.getGameBySocketId(socketId);

        if (!game) {
            throw new Error("Cannot undo: no active game found for this socket.");
        }

        if (game.isPuzzle && socketId !== game.student.id) {
            throw new Error("Only the student may undo in a puzzle!");
        }

        const board = game.boardState;

        // Attempt to undo
        const undoneMove = board.undo();

        if (!undoneMove) {
            throw new Error("No move to undo");
        }

        return {
            boardState: board.fen(),
            undoneMove,
            studentId: game.student.id,
            mentorId: game.mentor.id
        };
    }

    /**
     * Ends a game and removes it from the list.
     * @param {*} studentUsername 
     * @param {*} mentorUsername 
     */
    endGame(studentUsername, mentorUsername) {
        const gameIndex = this.ongoingGames.findIndex(
            (game) =>
                game.student.username == studentUsername && game.mentor.username == mentorUsername
        );

        if (gameIndex === -1) {
            throw new Error("Game not found");
        }

        const [removedGame] = this.ongoingGames.splice(gameIndex, 1);

        return {
            success: true,
            studentId: removedGame.student.id,
            mentorId: removedGame.mentor.id
        };
    }

    /**
     * Emits current board state to both student and mentor.
     * @param {*} game 
     * @param {*} io 
     */
    broadcastBoardState(gameInfo, io) {
        const fen = gameInfo.boardState;

        const studentSocket = io.sockets.sockets.get(gameInfo.studentId);
        const mentorSocket = io.sockets.sockets.get(gameInfo.mentorId);

        if (studentSocket) {
        studentSocket.emit("boardstate", JSON.stringify({ boardState: fen }));
        }
        if (mentorSocket) {
        mentorSocket.emit("boardstate", JSON.stringify({ boardState: fen }));
        }
    }

    /**
     * Emits simple messages to both players.
     * @param {*} socketId 
     * @param {*} message
     * @param {*} io 
     */
    broadcastSimpleMessage(socketId, message, io) {
        const game = this.getGameBySocketId(socketId);

        if (!game) {
            throw new Error("Game not found");
        }

        const payload = JSON.stringify({ message });

        io.to(game.student.id).emit("message", payload);
        io.to(game.mentor.id).emit("message", payload);
    }

    /**
     * Sets board state from provided FEN string.
     * @param {*} socketId 
     * @param {*} fen 
     */
    setBoardState(socketId, fen) {
        const game = this.getGameBySocketId(socketId);

        if (!game) {
            throw new Error("Game not found for this socket!");
        }

        game.boardState.load(fen);

        return {
            game,
            boardState: game.boardState.fen(),
            studentId: game.student.id,
            mentorId: game.mentor.id
        };
    }

    /**
     * Sets board state as in setBoardState, but allows modifying colors (specifically for puzzles)
     * @param {*} socketId 
     * @param {*} fen 
     * @param {*} color
     */
    setBoardColor(socketId, fen, color, hints, io) {
        const game = this.getGameBySocketId(socketId); // find the corresponding game of the client

        if (!game) { // if game does not exist
            throw new Error("Game not found for this socket!");
        }

        // modify board state by fen parameter
        game.boardState.load(fen);
        game.puzzle = hints;
        // modify player color (mentor & player on same side for puzzles)
        game.student.color = color;
        game.mentor.color = color;

        const studentSocket = io.sockets.sockets.get(game.student.id);
        const mentorSocket = io.sockets.sockets.get(game.mentor.id);

        // broadcast state changes to all players, including changes in color
        if (studentSocket) {
            studentSocket.emit("boardstate", JSON.stringify({ boardState: fen, color: color }));
        }
        if (mentorSocket) {
            mentorSocket.emit("boardstate", JSON.stringify({ boardState: fen, color: color }));
        }

        return {
            game,
            boardState: game.boardState.fen(),
            studentId: game.student.id,
            mentorId: game.mentor.id
        };
    }

    /**
     * Emits last move highlight to both players.
     * @param {*} socketId 
     * @param {*} fromMove 
     * @param {*} toMove 
     * @param {*} io 
     */
    broadcastLastMove(socketId, fromMove, toMove, io) {
        const game = this.getGameBySocketId(socketId);

        if (!game) {
            throw new Error("Game not found");
        }

        const payload = JSON.stringify({ fromMove, toMove });

        io.to(game.student.id).emit("lastmove", payload);
        io.to(game.mentor.id).emit("lastmove", payload);
    }

    /**
     * Relays an event to the opponent player.
     * @param {*} socketId 
     * @param {*} eventName 
     * @param {*} data 
     * @param {*} io 
     */
    relayToOpponent(socketId, eventName, data, io) {
        const game = this.getGameBySocketId(socketId);

        if (!game) {
            throw new Error("Game not found");
        }

        const senderId = socketId;
        const receiverId = game.student.id === senderId ? game.mentor.id : game.student.id;

        io.to(receiverId).emit(eventName, JSON.stringify(data));
    }

    /**
     * Inspects the board after a move and reports whether the game is over.
     * Works for both mentor-vs-student and student-vs-student games because it
     * resolves the winner from color, not from the student/mentor slot names.
     *
     * chess.js (^1.0.0-beta.8) exposes camelCase status helpers; after a
     * successful move, board.turn() is the side to move NEXT — i.e. the side
     * that was just checkmated is the loser.
     * @param {Object} game
     * @returns {Object} { over, reason?, winnerUsername?, loserUsername? }
     */
    detectOutcome(game) {
        const board = game.boardState;
        if (board.isCheckmate()) {
            const loserColorChar = board.turn(); // 'w' | 'b' — side to move is mated
            const loser = this.playerByColorChar(game, loserColorChar);
            const winner = this.playerByColorChar(game, loserColorChar === "w" ? "b" : "w");
            return {
                over: true,
                reason: "checkmate",
                winnerUsername: winner.username,
                loserUsername: loser.username,
            };
        }
        if (
            board.isStalemate() ||
            board.isThreefoldRepetition() ||
            board.isInsufficientMaterial() ||
            board.isDraw()
        ) {
            return { over: true, reason: "draw" };
        }
        return { over: false };
    }

    /**
     * Records a resignation (or a disconnect treated as a forfeit): the resigning
     * player loses, the other wins. Returns the same outcome shape as a checkmate
     * so callers can emit "gameover" and report the result identically.
     * @param {*} socketId - the resigning player's socket
     * @param {string} [reason] - "resign" (default) or "disconnect"
     * @returns {Object|null} { game, outcome } or null if no game / no opponent
     */
    resign(socketId, reason = "resign") {
        const game = this.getGameBySocketId(socketId);
        if (!game) {
            return null;
        }
        // Already decided (by checkmate, an earlier resign, or a forfeit) —
        // don't emit a second gameover or award the winner twice.
        if (game.isOver) {
            return null;
        }
        game.isOver = true;
        const loser = game.players.find((p) => p.id === socketId);
        const winner = game.players.find((p) => p.id !== socketId);
        // If the opponent never joined there's nobody to award — just end it.
        if (!loser || !winner || !winner.username) {
            return { game, outcome: { over: true, reason } };
        }
        return {
            game,
            outcome: {
                over: true,
                reason,
                winnerUsername: winner.username,
                loserUsername: loser.username,
            },
        };
    }

    /**
     * Returns the player (student or mentor slot) whose color matches the given
     * first character ('w' | 'b').
     * @param {Object} game
     * @param {string} colorChar
     * @returns {Object} player object
     */
    playerByColorChar(game, colorChar) {
        return game.players.find((p) => p.color.charAt(0) === colorChar);
    }

    /**
     * Finds the game using socket ID.
     * @param {*} socketId
     * @returns
     */
    getGameBySocketId(socketId) {
        return this.ongoingGames.find(
            (game) => game.student.id === socketId || game.mentor.id === socketId
        );
    }

    /**
     * Finds a game by its shared gameId (student-vs-student games only).
     * @param {string} gameId
     * @returns {Object|undefined}
     */
    getGameByGameId(gameId) {
        return this.ongoingGames.find((game) => game.gameId && game.gameId === gameId);
    }
}

module.exports = GameManager;