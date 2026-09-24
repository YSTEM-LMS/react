import React, { useEffect, useState } from 'react';
import { environment } from '../../environments';
import styles from './StockfishTutor.module.scss';
import { CoachMascot, CoachExpression } from '../../components/animations/CoachMascot/CoachMascot';
import { Chess as ChessClass } from 'chess.js';
const Chess: any = ChessClass;

type Props = {
  enabled: boolean;
  trigger: number; // increment to signal a new move to analyze
  fenBefore?: string;
  fenAfter?: string;
  moveUci?: string;
  uciHistory?: string;
  // Optional callback allowing parent components to request the tutor restore/go to a FEN
  // now accepts optional highlight squares [from,to]
  onRequestGotoFen?: (fen: string, highlights?: string[] | null) => void;
};

type Analysis = {
  moveIndicator?: 'Best' | 'Good' | 'Neutral' | 'Book' | 'Inaccuracy' | 'Mistake' | 'Blunder';
  Analysis?: string;
  nextStepHint?: string;
  // new fields to answer user's requested appraisals
  botPreference?: 'More' | 'Less' | 'Equal' | 'Unknown';
  favorsCenter?: boolean;
  // how closely the player's move matched the engine's preferred move(s). 0..1
  matchScore?: number;
  // points mapped from matchScore (0..100)
  matchPoints?: number;
  // human-readable explanation of why botPreference was chosen
  // optional numeric score from local heuristic or engine (centipawns-ish for engine, heuristic scale for local)
  score?: number | null;
  botPreferenceReason?: string;
  // NEW: explicit evaluation metrics
  proximityType?: 'exact' | 'sameDestination' | 'samePiece' | 'similar' | 'distant';
  centipawnLoss?: number | null; // positive = material lost, negative = material gained
  positionEvalBefore?: number | null; // centipawn evaluation before move
  positionEvalAfter?: number | null; // centipawn evaluation after move
};

const GEMINI_FALLBACK_TEXT = "I couldn't get a Gemini response right now, so here's the quick takeaway: check move safety, piece activity, and king safety.";



function normalizeIndicator(ind?: string | null | undefined): Analysis['moveIndicator'] | undefined {
  if (!ind) return undefined;
  const v = String(ind).toLowerCase();
  if (v === 'best') return 'Best';
  if (v === 'good') return 'Good';
  if (v === 'book') return 'Book';
  if (v === 'mistake') return 'Mistake';
  if (v === 'blunder') return 'Blunder';
  // map old 'inaccuracy' to 'Neutral'
  if (v === 'inaccuracy' || v === 'inaccurate') return 'Neutral';
  if (v === 'neutral') return 'Neutral';
  // default: return undefined so downstream logic can decide
  return undefined;
}

// localAnalyze: simple browser-only heuristic fallback when no analysis server is configured.
// It examines net material change for the mover and returns a lightweight classification.
function localAnalyze(fenBefore: string, fenAfter: string, moveUci: string) {
  // piece values
  const values: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  function materialSum(fen: string, color: 'w' | 'b') {
    try {
      const ch = new Chess(fen);
      const board = ch.board();
      let sum = 0;
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const sq = board[r][f];
          if (!sq) continue;
          const v = values[sq.type] || 0;
          sum += sq.color === color ? v : -v;
        }
      }
      return sum;
    } catch (e) {
      // If chess.js cannot parse the fen, return 0
      return 0;
    }
  }

  // Determine which side moved: fen format '... w ...' or '... b ...' -> active color is side to move BEFORE the move
  const sideMoved: 'w' | 'b' = (fenBefore.split(' ')[1] === 'w') ? 'w' : 'b';
  const beforeMaterial = materialSum(fenBefore, sideMoved);
  const afterMaterial = materialSum(fenAfter, sideMoved);
  const delta = afterMaterial - beforeMaterial; // positive => net gain for mover
  const fullmoveNum = Number(fenBefore.split(' ')[5] || '1');
  // Additional lightweight heuristics to improve appraisals without Stockfish:
  // - center control (e4/d4/e5/d5)
  // - minor-piece development from baseline rank
  // - giving check
  // - captures (we already use material delta)
  // We'll compute a small score and map it to qualitative indicators.
  let score = 0;
  // material contribution (increased weight)
  if (delta >= 3) score += 6;
  else if (delta >= 1) score += 3;
  else if (delta <= -3) score -= 6;
  else if (delta <= -1) score -= 3;

  // parse move squares
  const from = moveUci ? moveUci.slice(0, 2) : '';
  const to = moveUci ? moveUci.slice(2, 4) : '';
  const promotion = moveUci && moveUci.length === 5 ? moveUci[4] : undefined;

  // center control bonus (increase to favor opening center moves like e4/d4)
  const centerSquares = new Set(['e4', 'd4', 'e5', 'd5']);
  let isOpeningCenterPawnPush = false;

  // attempt to apply the move on a local Chess instance to inspect result flags
  try {
    // chess before for king-attack baseline
    const chBefore = new Chess(fenBefore);
    const beforeMoves = chBefore.moves({ verbose: true }) as any[];
    // find king square before for the mover
    let kingSquareBefore = '';
    const boardBefore = chBefore.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = boardBefore[r][f];
        if (!sq) continue;
        if (sq.type === 'k' && sq.color === sideMoved) {
          // convert r,f to algebraic
          const file = 'abcdefgh'[f];
          const rank = 8 - r;
          kingSquareBefore = `${file}${rank}`;
        }
      }
    }
    const beforeKingAttacks = beforeMoves.filter(m => m.to === kingSquareBefore).length;

    const ch = new Chess(fenBefore);
    const moveObj = ch.move({ from: from as any, to: to as any, promotion: promotion as any });
    if (moveObj) {
      // detect castling by from/to pattern
      const isCastling = (from === 'e1' && (to === 'g1' || to === 'c1')) || (from === 'e8' && (to === 'g8' || to === 'c8'));
      const isCenterMove = centerSquares.has(to);
      const isPawnMove = moveObj.piece === 'p';

      if (isCenterMove) {
        if (isPawnMove) {
          isOpeningCenterPawnPush = true;
          const minorStartSquares = sideMoved === 'w'
            ? ['b1', 'g1', 'c1', 'f1']
            : ['b8', 'g8', 'c8', 'f8'];
          const undevelopedMinorPieces = minorStartSquares.filter((sq) => {
            const piece = chBefore.get(sq as any);
            return piece && piece.color === sideMoved && (piece.type === 'n' || piece.type === 'b');
          }).length;
          const hasDevelopment = undevelopedMinorPieces < minorStartSquares.length;

          // Check if both d and e pawns are advanced after this move (both on 4th/5th rank).
          const dPawn = ch.get(sideMoved === 'w' ? 'd4' : ('d5' as any));
          const ePawn = ch.get(sideMoved === 'w' ? 'e4' : ('e5' as any));
          const bothCenterPawnsAdvanced = !!(
            dPawn && dPawn.type === 'p' && dPawn.color === sideMoved &&
            ePawn && ePawn.type === 'p' && ePawn.color === sideMoved
          );

          // Central pawn pushes are fine, but they should not dominate the score before development.
          if (fullmoveNum <= 2) {
            score += bothCenterPawnsAdvanced ? -1 : 0;
          } else if (hasDevelopment) {
            score += bothCenterPawnsAdvanced ? 0 : 1;
          } else {
            score += bothCenterPawnsAdvanced ? -2 : 0;
          }
        } else {
          score += fullmoveNum <= 6 ? 2 : 1;
        }
      }

      // compute opponent moves after the move
      const afterMoves = ch.moves({ verbose: true }) as any[];
      const movingPieceAttacks = afterMoves.filter(m => m.to === moveObj.to).length;

      // find king square after for the mover
      let kingSquareAfter = '';
      const boardAfter = ch.board();
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const sq = boardAfter[r][f];
          if (!sq) continue;
          if (sq.type === 'k' && sq.color === sideMoved) {
            const file = 'abcdefgh'[f];
            const rank = 8 - r;
            kingSquareAfter = `${file}${rank}`;
          }
        }
      }
      const afterKingAttacks = afterMoves.filter(m => m.to === kingSquareAfter).length;

      // Capture handling: avoid double-counting material (delta already reflected in score)
      if (moveObj.captured) {
        const capturedType = (moveObj.captured as string) || 'p';
        const capturedValue = values[capturedType] || 1;
        // If material delta already gave a positive score, don't add full capturedValue again.
        if (delta > 0) {
          // small bonus for a good capture unless the capturing piece is immediately attacked
          score += movingPieceAttacks > 0 ? 0 : 1;
        } else {
          // no net material gain detected (delta == 0 or negative) — reward only safe captures
          if (movingPieceAttacks > 0) {
            // risky capture: small or negative reward
            score += Math.max(-2, capturedValue - 2);
          } else {
            score += Math.max(1, capturedValue - 1);
          }
        }
      }

      // check bonus
      if (ch.in_check()) score += 2;

      // king-safety change: fewer attacks on king is good, more is bad
      if (afterKingAttacks < beforeKingAttacks) score += 2;
      else if (afterKingAttacks > beforeKingAttacks) score -= 2;

      // castling is generally good early
      if (isCastling) {
        if (fullmoveNum <= 8) score += 4;
        else score += 2;
      }

      // development bonus: minor piece from starting rank moving forward
      const piece = moveObj.piece;
      const fromRank = parseInt(from[1] || '0', 10);
      const toRank = parseInt(to[1] || '0', 10);
      if (piece === 'n' || piece === 'b') {
        if ((fromRank === 1 && toRank > fromRank) || (fromRank === 8 && toRank < fromRank)) {
          score += 2;
        }
      }

      // penalize if the moved piece is attacked after the move (hanging piece)
      if (movingPieceAttacks > 0) {
        // STRONGER penalty for hanging or attacked pieces: each attacking move increases penalty.
        // Use -4 per attacker and cap at -12 so protecting pieces becomes more strongly encouraged.
        score -= Math.min(12, movingPieceAttacks * 4);
        // If we captured and the capturing piece is immediately attacked, that's especially bad.
        if (moveObj.captured && movingPieceAttacks > 0) {
          // extra penalty for risky capture
          score -= 3;
        }
      }
    }
  } catch (e) {
    // ignore invalid-move parsing here — fallback to material-only
  }

  // Map score to qualitative indicator (use 'Neutral' as default)
  let moveIndicator: Analysis['moveIndicator'];
  if (score >= 6) moveIndicator = 'Best';
  else if (score >= 3) moveIndicator = 'Good';
  else if (score <= -8) moveIndicator = 'Blunder';
  else if (score <= -4) moveIndicator = 'Mistake';
  else moveIndicator = 'Neutral';

  // If this is an early opening pawn move to center (book), mark as 'Book'
  const bookMoves = new Set([
    'e2e4','d2d4','c2c4','e2e3','d2d3','c2c3',
    'e7e5','d7d5','c7c5','e7e6','d7d6','c7c6',
  ]);
  const isEarlyBook = fullmoveNum <= 2 && bookMoves.has(moveUci || '');
  if (isEarlyBook) moveIndicator = 'Book';

  // Build analysis text summarizing key signals
  let analysisText: string[] = [];
  if (delta > 0) analysisText.push(`Net material gain of ${delta}.`);
  else if (delta < 0) analysisText.push(`Net material loss of ${Math.abs(delta)}.`);

  // Check if both d and e center pawns are now on 4th/5th rank
  try {
    const chAfter = new Chess(fenAfter);
    const dPawnAfter = chAfter.get(sideMoved === 'w' ? 'd4' : ('d5' as any));
    const ePawnAfter = chAfter.get(sideMoved === 'w' ? 'e4' : ('e5' as any));
    const bothAdvancedNow = (dPawnAfter && dPawnAfter.type === 'p' && dPawnAfter.color === sideMoved) &&
                            (ePawnAfter && ePawnAfter.type === 'p' && ePawnAfter.color === sideMoved);
    if (bothAdvancedNow && fullmoveNum <= 8) {
      analysisText.push('⚠️ Both center pawns advanced: exposes queen and king to knight/bishop attacks. Develop pieces first.');
      moveIndicator = 'Mistake';
    }
  } catch (e) {
    // ignore FEN parsing errors
  }

  if (centerSquares.has(to)) analysisText.push('Move controls the center.');
  if (isOpeningCenterPawnPush && fullmoveNum <= 8) {
    analysisText.push('Early central pawns help, but development and king safety matter more in the opening.');
  }
  if ((moveUci && moveUci.length >= 4) && ((moveUci === 'g1f3') || (moveUci === 'b1c3') || (moveUci === 'g8f6') || (moveUci === 'b8c6'))) {
    analysisText.push('Minor piece development.');
  }
  if (analysisText.length === 0) analysisText.push('No material change. Check tactics and development.');
  analysisText.push(`Move: ${moveUci}`);
  const analysisSummary = analysisText.join(' ');

  const _serious = new Set(['Blunder', 'Mistake']);
  const nextStepHint = _serious.has(moveIndicator ?? '')
    ? 'Review the capture sequence and look for hanging pieces.'
    : 'Continue development and watch for opponent threats.';

  // Compute a rough 'centipawn-like' loss metric from material delta so callers can treat large losses as bad.
  // This is a coarse estimate: material delta is in pawn units, convert to centipawns.
  const lostCentipawns = delta < 0 ? Math.abs(delta) * 100 : 0;

  // If the move caused more than ~20 centipawns of loss (heuristic), mark it as a Mistake at least.
  if (lostCentipawns >= 200) {
    moveIndicator = 'Blunder';
  } else if (lostCentipawns >= 50) {
    moveIndicator = 'Mistake';
  } else if (lostCentipawns >= 20) {
    // small but notable loss — nudge toward Inaccuracy/Mistake
    if (moveIndicator === 'Best' || moveIndicator === 'Good') moveIndicator = 'Neutral';
    else moveIndicator = 'Mistake';
  }

  // Opening center pawn pushes should not be overcalled "Best" because they can leave the king and queen exposed.
  if (isOpeningCenterPawnPush && fullmoveNum <= 8 && moveIndicator === 'Best') {
    moveIndicator = 'Good';
  }

  // Determine botPreference from the heuristic numeric score
  let botPreference: Analysis['botPreference'];
  if (score >= 3) botPreference = 'More';
  else if (score <= -3) botPreference = 'Less';
  else botPreference = 'Equal';

  // Is this an opening move that favors center control?
  const favorsCenter = fullmoveNum <= 8 && centerSquares.has(to);

  return {
    success: true,
    explanation: {
      moveIndicator,
      Analysis: analysisSummary,
      nextStepHint,
      botPreference,
      favorsCenter,
      score,
    } as Analysis,
    rawText: analysisSummary,
  };
}

// Helper: compute bot preference from an engine best-move and optional numeric score
function computeBotPreferenceFromEngine(bestMove: string | null | undefined, moveUci: string | undefined, score: number | null | undefined): Analysis['botPreference'] {
  if (!moveUci) return 'Unknown';
  // Require an exact UCI match (ignoring promotion suffix) for the engine to "favor" the user's move.
  const normalizeUci = (u?: string | null) => (u || '').toString().toLowerCase().replace(/[qrbn]$/, '');
  if (bestMove && normalizeUci(bestMove) === normalizeUci(moveUci)) return 'More';
  // If an engine score is provided we can heuristically decide: large negative score for the mover implies the move is worse
  // Note: engine scores are typically from side to move perspective; treat positive as good for the mover
  if (typeof score === 'number') {
    if (score >= 100) return 'More';
    if (score <= -100) return 'Less';
    return 'Equal';
  }
  if (bestMove) return 'Less';
  return 'Unknown';
}

// Build a human-friendly explanation for why a botPreference was chosen
function buildBotPreferenceReason(opts: { engineBest?: string | null | undefined; moveUci?: string | undefined; engineScore?: number | null | undefined; moveScore?: { matchScore: number; points: number; botPreference: Analysis['botPreference'] } | null | undefined; indicator?: Analysis['moveIndicator'] | undefined; }): string {
  const { engineBest, moveUci, engineScore, moveScore, indicator } = opts;
  const normalize = (u?: string | null | undefined) => (u || '').toString().toLowerCase().replace(/[qrbn]$/, '');
  try {
    if (engineBest && moveUci && normalize(engineBest) === normalize(moveUci)) {
      return `Exact engine best-move match (${engineBest}).`;
    }
    if (typeof engineScore === 'number') {
      if (engineScore >= 100) return `Engine score ${engineScore} → favors the mover (>=100 => More).`;
      if (engineScore <= -100) return `Engine score ${engineScore} → disfavors the mover (<=-100 => Less).`;
      return `Engine score ${engineScore} → near-equal (thresholds: >=100 More, <=-100 Less).`;
    }
    if (moveScore) {
      const p = moveScore.points;
      const s = moveScore.matchScore;
      if (p >= 95) return `High match to preferred move (${p}/100, matchScore ${s}).`;
      if (p <= 15) return `Low match to preferred move (${p}/100, matchScore ${s}).`;
      return `Partial agreement (${p}/100, matchScore ${s}).`;
    }
    if (indicator) {
      const inferred = inferBotPreferenceFromIndicator(indicator);
      return `Inferred from move indicator '${indicator}' → ${inferred}.`;
    }
    return 'No engine score or match data available.';
  } catch (e) {
    return '';
  }
}

// Compute how close the player's move is to the engine's recommendation.
// Now returns detailed proximity type and centipawn loss metrics.
function computeMoveScore(bestMove: string | null | undefined, moveUci: string | undefined, engineScore: number | null | undefined, fenBefore: string | undefined, bestMoveScore: number | null | undefined = null): { matchScore: number; points: number; botPreference: Analysis['botPreference']; proximityType?: Analysis['proximityType']; centipawnLoss?: number | null } {
  if (!moveUci) return { matchScore: 0, points: 0, botPreference: 'Unknown', proximityType: 'distant', centipawnLoss: null };
  
  // Normalize UCI strings for comparison
  const normalizeUci = (u?: string | null) => (u || '').toString().toLowerCase().replace(/[qrbn]$/, '');
  
  // exact match
  if (bestMove && normalizeUci(bestMove) === normalizeUci(moveUci)) {
    return { matchScore: 1, points: 100, botPreference: 'More', proximityType: 'exact', centipawnLoss: 0 };
  }

  // Try destination similarity and piece-type similarity as fallback heuristics
  const moveTo = moveUci.length >= 4 ? moveUci.slice(2, 4) : '';
  const bestTo = bestMove && bestMove.length >= 4 ? bestMove.slice(2, 4) : '';
  let score = 0;
  let proximityType: Analysis['proximityType'] = 'distant';
  
  if (bestTo && moveTo && bestTo === moveTo) {
    score = 0.75; // same destination
    proximityType = 'sameDestination';
  }

  // if we can inspect piece types, reward same-piece moves
  try {
    if (bestMove && fenBefore) {
      const ch = new Chess(fenBefore);
      const bestFrom = bestMove.slice(0, 2);
      const movedFrom = moveUci.slice(0, 2);
      const bestPiece = ch.get(bestFrom)?.type;
      const movedPiece = ch.get(movedFrom)?.type;
      if (bestPiece && movedPiece && bestPiece === movedPiece) {
        if (score < 0.5) {
          score = 0.5;
          proximityType = 'samePiece';
        }
      }
    }
  } catch (e) {
    // ignore chess parsing errors
  }

  // If engine score is provided and indicates the position is close, give moderate credit
  let centipawnLoss: number | null = null;
  if (typeof engineScore === 'number') {
    // engineScore is in centipawns from side-to-move perspective
    centipawnLoss = Math.abs(engineScore);
    
    // Be slightly more conservative: require closer agreement to award higher score.
    if (centipawnLoss <= 20) {
      if (score < 0.6) {
        score = 0.6;
        proximityType = 'similar';
      }
    } else if (centipawnLoss <= 60) {
      if (score < 0.4) {
        score = 0.4;
        proximityType = 'similar';
      }
    } else if (centipawnLoss <= 150) {
      if (score < 0.25) {
        score = 0.25;
        proximityType = 'distant';
      }
    } else {
      if (score < 0.1) {
        score = 0.1;
        proximityType = 'distant';
      }
    }
  }

  // default small credit if none of the above applied
  if (score === 0) {
    score = 0.2;
    proximityType = 'distant';
  }

  const points = Math.round(Math.min(1, Math.max(0, score)) * 100);
  let pref: Analysis['botPreference'];
  if (score >= 0.95) pref = 'More';
  else if (score <= 0.15) pref = 'Less';
  else pref = 'Equal';

  return { matchScore: score, points, botPreference: pref, proximityType, centipawnLoss };
}

// Infer bot preference from a qualitative moveIndicator when engine numeric data is not available
function inferBotPreferenceFromIndicator(ind?: Analysis['moveIndicator']): Analysis['botPreference'] {
  if (!ind) return 'Unknown';
  if (ind === 'Best' || ind === 'Good') return 'More';
  if (ind === 'Neutral' || ind === 'Book') return 'Equal';
  if (ind === 'Inaccuracy' || ind === 'Mistake' || ind === 'Blunder') return 'Less';
  return 'Unknown';
}

// Backward-compatible alias for older typo usage.
function inferBotPreferenceFormIndicator(ind?: Analysis['moveIndicator']): Analysis['botPreference'] {
  return inferBotPreferenceFromIndicator(ind);
}

// Improved blunder detection based on centipawn loss and game phase
// Blunders are moves that lose significant material or position advantage
function detectBlunderByCentipawnLoss(centipawnLoss: number | null | undefined, matchPoints: number | null | undefined, moveIndicator?: Analysis['moveIndicator'], fenBefore?: string): Analysis['moveIndicator'] | undefined {
  if (centipawnLoss === null || centipawnLoss === undefined) {
    return moveIndicator; // can't determine without engine score
  }

  const fullmoveNum = fenBefore ? Number(fenBefore.split(' ')[5] || '1') : 1;
  
  // Centipawn loss thresholds vary by game phase
  // Opening (moves 1-8): hangings are rare and highly punishable
  // Midgame (moves 9-40): more active play, but still punish big losses
  // Endgame (40+): small losses can be critical
  let blunderThreshold = 200; // default: 2 pawns of material
  let mistakeThreshold = 50;  // default: half a pawn
  
  if (fullmoveNum <= 8) {
    // Opening: any hanging of material is immediately bad
    blunderThreshold = 250; // 2.5 pawns
    mistakeThreshold = 75;
  } else if (fullmoveNum <= 40) {
    // Midgame: more aggressive, but still punish significant losses
    blunderThreshold = 200; // 2 pawns
    mistakeThreshold = 50;
  } else {
    // Endgame: even 1 pawn loss can be critical
    blunderThreshold = 150; // 1.5 pawns
    mistakeThreshold = 30;
  }

  // If the move loses a queen or more (900+ centipawns), always a blunder
  if (centipawnLoss >= 900) return 'Blunder';
  // If the move loses a rook or more (500+ centipawns), very likely a blunder
  if (centipawnLoss >= 500) return 'Blunder';
  // If meets blunder threshold
  if (centipawnLoss >= blunderThreshold) return 'Blunder';
  // If meets mistake threshold
  if (centipawnLoss >= mistakeThreshold && centipawnLoss < blunderThreshold) return 'Mistake';
  
  return moveIndicator;
}

// Enhanced version of applyBotPreferenceRules that also considers centipawn loss
function applyBotPreferenceRulesV2(a?: Analysis | null, previousMatchPoints: number | null = null): Analysis | null {
  if (!a) return a ?? null;
  const botPref = a.botPreference;
  // Determine current matchPoints if present, otherwise derive from matchScore
  let matchPoints: number | null = null;
  if (typeof a.matchPoints === 'number') matchPoints = a.matchPoints;
  else if (typeof a.matchScore === 'number') matchPoints = Math.round(Math.max(0, Math.min(1, a.matchScore)) * 100);

  // IMPROVED: Use centipawn loss as primary signal for blunders
  // If there's significant centipawn loss, that overrides previous classifications
  if (typeof a.centipawnLoss === 'number' && a.centipawnLoss > 0) {
    const updatedIndicator = detectBlunderByCentipawnLoss(a.centipawnLoss, matchPoints, a.moveIndicator, a.score?.toString?.());
    if (updatedIndicator && (updatedIndicator === 'Blunder' || updatedIndicator === 'Mistake')) {
      a.moveIndicator = updatedIndicator;
    }
  }

  if (botPref === 'Less') {
    if (typeof matchPoints === 'number') {
      // compute decrement relative to previousMatchPoints if available, otherwise relative to 100
      const base = typeof previousMatchPoints === 'number' ? previousMatchPoints : 100;
      const decrement = base - matchPoints;
      // IMPROVED: lower threshold for blunder detection (was 10, now 25 for midgame sensitivity)
      if (decrement > 25) {
        a.moveIndicator = 'Blunder';
      } else if (decrement > 5) {
        a.moveIndicator = 'Mistake';
      } else {
        a.moveIndicator = 'Neutral';
      }
    } else {
      // no match points available: mark as Mistake by default
      a.moveIndicator = 'Mistake';
    }
  }
  
  if (botPref === 'Equal') {
    if (typeof matchPoints === 'number') {
      if (matchPoints >= 95) {
        a.moveIndicator = 'Best';
      } else if (matchPoints > 80) {
        a.moveIndicator = 'Good';
      } else if (matchPoints <= 15) {
        // IMPROVED: was 25, now more sensitive to poor moves
        a.moveIndicator = 'Blunder';
      } else if (matchPoints <= 35) {
        // IMPROVED: expanded Mistake range
        a.moveIndicator = 'Mistake';
      } else if (matchPoints <= 50) {
        a.moveIndicator = 'Neutral';
      } else {
        a.moveIndicator = 'Good';
      }
    }
  }
  return a;
}

// Helper: determine whether the move favors center control in the opening
function computeFavorsCenter(moveUci: string | undefined, fenBefore: string | undefined): boolean {
  if (!moveUci || !fenBefore) return false;
  const to = moveUci.length >= 4 ? moveUci.slice(2, 4) : '';
  const centerSquares = new Set(['e4', 'd4', 'e5', 'd5']);
  const fullmoveNum = Number(fenBefore.split(' ')[5] || '1');
  return fullmoveNum <= 8 && centerSquares.has(to);
}

// Detect an early "second center pawn push" (e-pawn already advanced, then d-pawn push or vice-versa)
// before enough minor-piece development. This should be treated as cautionary, not automatically "Good".
function isEarlySecondCenterPawnPush(moveUci: string | undefined, fenBefore: string | undefined): boolean {
  if (!moveUci || !fenBefore || moveUci.length < 4) return false;
  const fullmoveNum = Number(fenBefore.split(' ')[5] || '1');
  if (fullmoveNum > 8) return false;

  const from = moveUci.slice(0, 2).toLowerCase();
  const to = moveUci.slice(2, 4).toLowerCase();
  const sideMoved: 'w' | 'b' = (fenBefore.split(' ')[1] === 'w') ? 'w' : 'b';

  const validSecondPush =
    (sideMoved === 'w' && ((from === 'd2' && to === 'd4') || (from === 'e2' && to === 'e4'))) ||
    (sideMoved === 'b' && ((from === 'd7' && to === 'd5') || (from === 'e7' && to === 'e5')));
  if (!validSecondPush) return false;

  try {
    const chBefore = new Chess(fenBefore);
    const otherCenterSquare = sideMoved === 'w'
      ? (from === 'd2' ? 'e4' : 'd4')
      : (from === 'd7' ? 'e5' : 'd5');
    const otherCenterPawn = chBefore.get(otherCenterSquare as any);
    if (!otherCenterPawn || otherCenterPawn.type !== 'p' || otherCenterPawn.color !== sideMoved) return false;

    const minorStartSquares = sideMoved === 'w'
      ? ['b1', 'g1', 'c1', 'f1']
      : ['b8', 'g8', 'c8', 'f8'];
    const undevelopedMinorPieces = minorStartSquares.filter((sq) => {
      const piece = chBefore.get(sq as any);
      return piece && piece.color === sideMoved && (piece.type === 'n' || piece.type === 'b');
    }).length;

    // If 3-4 minor pieces are still on original squares, development is still lagging.
    return undevelopedMinorPieces >= 3;
  } catch (e) {
    return false;
  }
}

// Opening center pawn pushes can be useful, but they should not be labeled as top-tier play
// before the position is developed enough to support them.
function enforceOpeningCenterPawnCaution(analysisObj: any, moveUci: string | undefined, fenBefore: string | undefined) {
  try {
    if (!analysisObj || !moveUci || !fenBefore) return analysisObj;
    const fullmoveNum = Number(fenBefore.split(' ')[5] || '1');
    if (fullmoveNum > 4) return analysisObj;
    const to = moveUci.length >= 4 ? moveUci.slice(2, 4).toLowerCase() : '';
    const from = moveUci.length >= 2 ? moveUci.slice(0, 2).toLowerCase() : '';
    const centerSquares = new Set(['e4', 'd4', 'e5', 'd5']);
    const startingPawnSquares = new Set(['e2', 'd2', 'e7', 'd7']);
    if (!centerSquares.has(to) || !startingPawnSquares.has(from)) return analysisObj;

    if (analysisObj.moveIndicator === 'Best') {
      analysisObj.moveIndicator = 'Good';
    }

    if (isEarlySecondCenterPawnPush(moveUci, fenBefore)) {
      if (analysisObj.moveIndicator === 'Best' || analysisObj.moveIndicator === 'Good' || analysisObj.moveIndicator === 'Book') {
        analysisObj.moveIndicator = 'Neutral';
      }
      if (analysisObj.botPreference === 'More') {
        analysisObj.botPreference = 'Equal';
      }
      const caution = 'Second early center-pawn push can overextend the center; develop minor pieces and secure king safety first.';
      if (!analysisObj.Analysis) {
        analysisObj.Analysis = caution;
      } else if (!/second early center-pawn push|overextend the center/i.test(String(analysisObj.Analysis))) {
        analysisObj.Analysis = `${analysisObj.Analysis} ${caution}`;
      }
    }
  } catch (e) {
    // ignore enforcement errors
  }
  return analysisObj;
}

// Helper: detect early side-pawn opening moves that are considered poor practice
function isEarlySidePawnMove(moveUci: string | undefined, fenBefore: string | undefined): boolean {
  if (!moveUci || !fenBefore) return false;
  const earlySet = new Set(['f2f4', 'c2c4', 'f7f5', 'c7c5']);
  const fullmoveNum = Number(fenBefore.split(' ')[5] || '1');
  // Treat very early moves (first two full moves) as especially suspect
  return fullmoveNum <= 4 && earlySet.has(moveUci.toLowerCase());
}

// Apply the "early side pawn is a blunder" rule to an analysis object if applicable.
function enforceEarlySidePawnBlunder(analysisObj: any, moveUci: string | undefined, fenBefore: string | undefined) {
  try {
    if (!analysisObj || !moveUci) return analysisObj;
    if (isEarlySidePawnMove(moveUci, fenBefore)) {
      // Force a strong negative label and preference so UI treats these as mistakes/blunders
      analysisObj.moveIndicator = 'Blunder';
      analysisObj.Analysis = (analysisObj.Analysis ? analysisObj.Analysis + ' ' : '') + 'Early side-pawn opening move — exposes your king to bishop attacks; avoid f- and c-file pawn thrusts in the opening.';
      analysisObj.botPreference = 'Less';
      // push matchPoints to a low value if not present
      if (typeof analysisObj.matchPoints !== 'number') analysisObj.matchPoints = 5;
      if (typeof analysisObj.matchScore !== 'number') analysisObj.matchScore = 0.05;
    }
  } catch (e) {
    // ignore enforcement errors
  }
  return analysisObj;
}

// Pure detection: returns a human-readable threat description if the player's move
// leaves a high-value piece immediately capturable, or null if there is no such threat.
// Does NOT mutate any object — callers can forward this string to the AI before overriding.
function detectHangingPiece(fenBefore: string | undefined, fenAfter: string | undefined): string | null {
  try {
    if (!fenBefore || !fenAfter) return null;
    const sideMoved: 'w' | 'b' = (fenBefore.split(' ')[1] === 'w') ? 'w' : 'b';
    const chAfter = new Chess(fenAfter);
    const opponentToMove: 'w' | 'b' = chAfter.turn() as 'w' | 'b';
    if (opponentToMove === sideMoved) return null;
    const opponentMoves = chAfter.moves({ verbose: true }) as any[];
    const valueByPiece: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
    const majorThreats = opponentMoves.filter((m: any) => !!m?.captured && (valueByPiece[m.captured] || 0) >= 3);
    if (majorThreats.length === 0) return null;
    const queenThreat = majorThreats.some((m: any) => m.captured === 'q');
    const rookThreat  = majorThreats.some((m: any) => m.captured === 'r');
    const minorThreatCount = majorThreats.filter((m: any) => m.captured === 'b' || m.captured === 'n').length;
    const maxThreatValue = majorThreats.reduce((mx: number, m: any) => Math.max(mx, valueByPiece[m.captured] || 0), 0);
    if (queenThreat) return 'This move leaves the queen immediately capturable by the opponent — this is a serious blunder.';
    if (rookThreat || maxThreatValue >= 5) return 'This move leaves a rook or major piece immediately capturable by the opponent — this is a blunder.';
    if (minorThreatCount >= 2) return 'This move leaves multiple pieces immediately capturable by the opponent — this is a blunder.';
    if (minorThreatCount >= 1) return 'This move leaves a piece immediately capturable by the opponent — this is a mistake.';
    return null;
  } catch (e) {
    return null;
  }
}
// If the player's move leaves high-value pieces immediately capturable, treat it as a serious error.
function enforceHangingPowerPieceBlunder(analysisObj: any, fenBefore: string | undefined, fenAfter: string | undefined) {
  try {
    if (!analysisObj || !fenBefore || !fenAfter) return analysisObj;
    const sideMoved: 'w' | 'b' = (fenBefore.split(' ')[1] === 'w') ? 'w' : 'b';
    const chAfter = new Chess(fenAfter);
    const opponentToMove: 'w' | 'b' = chAfter.turn() as 'w' | 'b';
    if (opponentToMove === sideMoved) return analysisObj;

    const opponentMoves = chAfter.moves({ verbose: true }) as any[];
    const valueByPiece: Record<string, number> = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
    const majorThreats = opponentMoves.filter((m: any) => !!m?.captured && (valueByPiece[m.captured] || 0) >= 3);
    if (majorThreats.length === 0) return analysisObj;

    const queenThreat = majorThreats.some((m: any) => m.captured === 'q');
    const rookThreat = majorThreats.some((m: any) => m.captured === 'r');
    const minorThreatCount = majorThreats.filter((m: any) => m.captured === 'b' || m.captured === 'n').length;
    const maxThreatValue = majorThreats.reduce((mx: number, m: any) => Math.max(mx, valueByPiece[m.captured] || 0), 0);

    if (queenThreat || rookThreat || minorThreatCount >= 2 || maxThreatValue >= 5) {
      analysisObj.moveIndicator = 'Blunder';
      analysisObj.botPreference = 'Less';
      if (typeof analysisObj.matchPoints !== 'number' || analysisObj.matchPoints > 10) analysisObj.matchPoints = 10;
      if (typeof analysisObj.matchScore !== 'number' || analysisObj.matchScore > 0.1) analysisObj.matchScore = 0.1;
      const warning = queenThreat
        ? 'Blunder: your move leaves the queen immediately capturable by the opponent.'
        : 'Blunder: your move leaves a high-value piece immediately capturable by the opponent.';
      if (!analysisObj.Analysis) analysisObj.Analysis = warning;
      else if (!/immediately capturable|leaves the queen/i.test(String(analysisObj.Analysis))) analysisObj.Analysis = `${analysisObj.Analysis} ${warning}`;
      return analysisObj;
    }

    if (minorThreatCount >= 1) {
      if (analysisObj.moveIndicator !== 'Blunder') analysisObj.moveIndicator = 'Mistake';
      analysisObj.botPreference = 'Less';
      if (typeof analysisObj.matchPoints !== 'number' || analysisObj.matchPoints > 25) analysisObj.matchPoints = 25;
      if (typeof analysisObj.matchScore !== 'number' || analysisObj.matchScore > 0.25) analysisObj.matchScore = 0.25;
      const warning = 'Mistake: your move leaves a piece immediately capturable by the opponent.';
      if (!analysisObj.Analysis) analysisObj.Analysis = warning;
      else if (!/immediately capturable|leaves a piece/i.test(String(analysisObj.Analysis))) analysisObj.Analysis = `${analysisObj.Analysis} ${warning}`;
    }
  } catch (e) {
    // ignore enforcement errors
  }
  return analysisObj;
}

// Final enforcement helper: ensure the early side-pawn blunder rule is applied as a last-step override
function ensureEarlySidePawnEnforcement(analysisObj: any, moveUci: string | undefined, fenBefore: string | undefined, fenAfter: string | undefined, previousMatchPoints: number | null = null) {
  try {
    if (!moveUci) return analysisObj;
    // If there's no analysis object (e.g. raw text), return as-is
    if (!analysisObj) return analysisObj;
    // Re-apply the early-side-pawn rule so engine/server results cannot override it
    enforceEarlySidePawnBlunder(analysisObj, moveUci, fenBefore);
    enforceOpeningCenterPawnCaution(analysisObj, moveUci, fenBefore);
    // Re-apply bot preference rules so 'Less' maps to Mistake/Blunder as intended
    return applyBotPreferenceRulesV2(analysisObj, previousMatchPoints) || analysisObj;
  } catch (e) {
    return analysisObj;
  }
}

// Attempt to run in-browser Stockfish if the `stockfish` package is installed.
// Returns null if Stockfish is not available or fails.
async function analyzeWithStockfish(fenBefore: string, fenAfter: string, moveUci: string, uciHistory: string, depth = 12, cancelled = false) {
  try {
    // Many projects may optionally bundle an in-browser Stockfish build that exposes a global
    // (e.g. window.Stockfish or window.stockfish). We MUST avoid forcing bundlers (webpack) to
    // attempt to resolve an optional 'stockfish' package at build time because it may not be
    // installed in developer environments. The previous dynamic import('stockfish') triggers
    // module resolution and produces the warning seen during `npm start`/build.
    //
    // Instead, detect a runtime-provided Stockfish and use it. If none is available, return null
    // and let the caller fall back to server analysis or local heuristics.
    // Check common global names where an in-browser stockfish may be exposed.
    const globalAny: any = (globalThis || window || ({} as any));
    const engineFactory = globalAny.Stockfish || globalAny.stockfish || globalAny.StockFish || null;
    if (!engineFactory) {
      // No in-browser stockfish available
      return null;
    }

    return await new Promise<any>((resolve) => {
      let bestMove: string | null = null;
      let score: number | null = null;
      let infoLines: string[] = [];
      const engine = typeof engineFactory === 'function' ? engineFactory() : engineFactory;

      const onMessage = (msg: any) => {
        if (!msg) return;
        const line = (typeof msg === 'string') ? msg : (msg.data || msg.data?.toString?.() || String(msg));
        infoLines.push(line);
        if (/^bestmove\s+/i.test(line)) {
          const parts = line.split(/\s+/);
          bestMove = parts[1] || null;
        }
        const scoreMatch = line.match(/score cp (-?\d+)/);
        if (scoreMatch) score = parseInt(scoreMatch[1], 10);
      };

      // Wire message handlers for common APIs
      try {
        if (typeof engine.onmessage === 'function') {
          engine.onmessage = (e: any) => onMessage(e.data || e);
        }
        if (typeof engine.addEventListener === 'function') {
          try { engine.addEventListener('message', (e: any) => onMessage(e.data || e)); } catch (e) {}
        }
      } catch (e) {
        // ignore
      }

      try {
        if (typeof engine.postMessage === 'function') {
          engine.postMessage('uci');
          engine.postMessage('ucinewgame');
          engine.postMessage(`position fen ${fenBefore}`);
          engine.postMessage(`go depth ${depth}`);
        } else if (typeof engine.send === 'function') {
          engine.send('uci');
          engine.send('ucinewgame');
          engine.send(`position fen ${fenBefore}`);
          engine.send(`go depth ${depth}`);
        }
      } catch (e) {
        // engine API failed; give up gracefully
        try { if (engine.terminate) engine.terminate(); } catch (ee) {}
        resolve(null);
        return;
      }

      // poll for bestmove for a limited time
      const timeout = setInterval(() => {
        if (cancelled) {
          clearInterval(timeout);
          try { if (engine.terminate) engine.terminate(); } catch (e) {}
          resolve(null);
        }
        if (bestMove !== null || infoLines.length > 0) {
          clearInterval(timeout);
          try { if (engine.terminate) engine.terminate(); } catch (e) {}
          let sfIndicator: string;
          // Require exact UCI match (ignoring promotion suffix) to mark the user's move as 'Best'
          const normalizeUciLocal = (u?: string | null) => (u || '').toString().toLowerCase().replace(/[qrbn]$/, '');
          const isExactBest = bestMove && moveUci && normalizeUciLocal(bestMove) === normalizeUciLocal(moveUci);
          if (isExactBest) {
            sfIndicator = 'Best';
          } else if (score !== null) {
            // Don't call 'Best' just from a numeric score; map numeric evaluations to a conservative label.
            if (score >= 100) sfIndicator = 'Good';
            else if (score >= 30) sfIndicator = 'Good';
            else if (score >= -20) sfIndicator = 'Neutral';
            else if (score >= -100) sfIndicator = 'Mistake';
            else sfIndicator = 'Blunder';
          } else {
            sfIndicator = 'Neutral';
          }

          resolve({ bestMove, score, explanation: `Stockfish score ${score ?? 'n/a'}`, moveIndicator: sfIndicator, nextStepHint: 'Consider reviewing the engine PV.', infoLines });
        }
      }, 150);
    });
  } catch (e) {
    // dynamic import failed or engine not present
    // eslint-disable-next-line no-console
    console.warn('StockfishTutor: in-browser stockfish unavailable or failed', e);
    return null;
  }
}

const getAiFeedbackForMove = async (
  analysisForPrompt: Analysis,
  fenBefore: string,
  fenAfter: string,
  moveUci: string,
  bestMove?: string | null,
  score?: number | null,
  hangingPieceThreat?: string | null
): Promise<Analysis> => {
  try {
    const response = await fetch(`${environment.urls.middlewareURL}/chat/chess-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fenBefore,
        fenAfter,
        moveUci,
        bestMove,
        score,
        moveIndicator: analysisForPrompt.moveIndicator,
        nextStepHint: analysisForPrompt.nextStepHint,
        analysisText: analysisForPrompt.Analysis,
        botPreference: analysisForPrompt.botPreference,
        favorsCenter: analysisForPrompt.favorsCenter,
        botPreferenceReason: analysisForPrompt.botPreferenceReason,
        hangingPieceThreat: hangingPieceThreat ?? null,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && data.feedback) {
        return {
          ...analysisForPrompt,
          Analysis: data.feedback,
        };
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Failed to fetch AI feedback from middleware, using default:', err);
  }
  return {
    ...analysisForPrompt,
    Analysis: GEMINI_FALLBACK_TEXT,
  };
};

const StockfishTutor: React.FC<Props> = ({ enabled, trigger, fenBefore, fenAfter, moveUci, uciHistory, onRequestGotoFen }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  // store the previous turn's matchPoints so we can compute decrement relative to that
  const [prevMatchPoints, setPrevMatchPoints] = useState<number | null>(null);
  // Keep a small stack of matchPoints so we can revert on undo (pop)
  const [matchPointsStack, setMatchPointsStack] = useState<number[]>([]);
  // Track last uciHistory to detect undo operations (uciHistory gets shorter)
  const [lastUciHistory, setLastUciHistory] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string | null>(null);
  // Keep a referenced no-op to avoid unused prop warnings for optional callbacks
  useEffect(() => {
    if (onRequestGotoFen) {
      // Intentionally no-op; parent components may pass this handler to request FEN navigation
      // We reference it here to avoid unused-variable/prop warnings from TypeScript or linters
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      void onRequestGotoFen;
    }
  }, [onRequestGotoFen]);

  // helper to push a new matchPoints onto the stack and update prevMatchPoints
  const pushMatchPoints = (pt?: number | null) => {
    if (typeof pt !== 'number') return;
    setMatchPointsStack((s) => {
      const next = [...s, pt];
      try { setPrevMatchPoints(next[next.length - 1]); } catch (e) {}
      return next;
    });
  };

  // helper to pop matchPoints (used on undo) and update prevMatchPoints
  const popMatchPoints = () => {
    setMatchPointsStack((s) => {
      const next = s.slice(0, -1);
      try { setPrevMatchPoints(next.length ? next[next.length - 1] : null); } catch (e) {}
      return next;
    });
  };

  // reference the stack in a no-op effect so linters/TS don't complain about unused variable
  useEffect(() => {
    // intentionally no-op; keeps matchPointsStack referenced
    void matchPointsStack;
  }, [matchPointsStack]);

  useEffect(() => {
    if (!enabled) {
      try { setDebugLog('tutor disabled (enabled=false)'); } catch (e) {}
      return;
    }
    // If the board was reset (no uciHistory or empty), also reset the tutor's internal state
    try {
      if (!uciHistory || (typeof uciHistory === 'string' && uciHistory.trim() === '')) {
        // Clear stack and analysis state
        setMatchPointsStack([]);
        setPrevMatchPoints(null);
        setAnalysis(null);
        setLastUciHistory(undefined);
        try { setDebugLog('Tutor state reset (board reset detected)'); } catch (e) {}
        return;
      }
    } catch (e) {
      // ignore
    }
  }, [trigger, enabled, fenBefore, moveUci]);

  // Separate effect specifically to detect undos without interrupting ongoing analysis
  useEffect(() => {
    try {
      if (lastUciHistory && uciHistory && typeof lastUciHistory === 'string' && typeof uciHistory === 'string') {
        const lastCount = lastUciHistory.trim() ? lastUciHistory.trim().split(/\s+/).length : 0;
        const curCount = uciHistory.trim() ? uciHistory.trim().split(/\s+/).length : 0;
        if (curCount < lastCount) {
          const undone = lastCount - curCount;
          for (let i = 0; i < undone; i++) popMatchPoints();
          setLastUciHistory(uciHistory);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [uciHistory, lastUciHistory, popMatchPoints]);

  useEffect(() => {
    if (!enabled) {
      setAnalysis(null);
      setIsAnalyzing(false);
      return;
    }

    // allow trigger to be optional — run whenever move context is provided
    if (!fenBefore || !fenAfter || !moveUci) {
      try { setDebugLog('waiting for move context (fenBefore/fenAfter/moveUci)'); } catch (e) {}
      return;
    }

    // Debounce/delay before starting analysis to allow the board & engine to settle to settle
    const analysisDelay = 50; // ms
    const minDisplayTime = 200; // ensure 'thinking' shows for at least this long
    let cancelled = false;
    let timer = 0 as any;

    const doAnalyze = async () => {
      if (cancelled) return;
      setIsAnalyzing(true);
      setError(null);
      setAnalysis(null);
      const startedAt = Date.now();

      try {
        // Debug: log the move context we're about to send for analysis
        // eslint-disable-next-line no-console
        console.debug('StockfishTutor: analyzing move', { fenBefore, fenAfter, moveUci, uciHistory });
        try { setDebugLog(`analyzing move ${moveUci} | fenBefore=${fenBefore.split(' ')[0]}...`); } catch (e) { /* ignore */ }
        // Safely read environment URL keys
        const urls = (environment && (environment as any).urls) || {};
        // Support multiple environment keys: prefer unified chessServerURL but
        // also accept stockfishServerURL (some deployments use that name).
        const rawBase = urls.chessServerURL || urls.stockfishServerURL || urls.chessServer || urls.stockfishServer || '';
        const baseUrl = typeof rawBase === 'string' ? rawBase.replace(/\/$/, '') : '';

                        if (!baseUrl) {
                          // Try in-browser Stockfish engine first (if installed). If unavailable or fails, fall back to localAnalyze.
                          try {
                            // eslint-disable-next-line no-console
                            console.debug('StockfishTutor: attempting in-browser Stockfish');
                            try { setDebugLog('attempting in-browser Stockfish analysis'); } catch (e) {}
                            const sfResult = await analyzeWithStockfish(fenBefore, fenAfter, moveUci || '', uciHistory || '', 12, cancelled);
                            if (sfResult) {
                              // Debug: dump the raw stockfish result so we can see what fields are present
                              // eslint-disable-next-line no-console
                              console.debug('StockfishTutor: in-browser Stockfish returned', sfResult);
                              try { setDebugLog(`in-browser SF returned: ${String(sfResult.bestMove ?? sfResult.score ?? '')}`); } catch (e) {}
                              // Build Analysis object and normalize labels
                              const explanation = {
                                moveIndicator: (normalizeIndicator(sfResult.moveIndicator) as Analysis['moveIndicator']) || (sfResult.moveIndicator as Analysis['moveIndicator']),
                                Analysis: sfResult.explanation ?? `Best move: ${sfResult.bestMove ?? 'n/a'}; score: ${sfResult.score ?? 'n/a'}`,
                                nextStepHint: sfResult.nextStepHint,
                                botPreference: computeBotPreferenceFromEngine(sfResult.bestMove, moveUci, sfResult.score),
                                favorsCenter: computeFavorsCenter(moveUci, fenBefore),
                                score: typeof sfResult.score === 'number' ? sfResult.score : null,
                              } as Analysis;

                              // compute how closely the player's move matches the engine's recommendation
                              try {
                                const moveScore = computeMoveScore(sfResult.bestMove, moveUci, typeof sfResult.score === 'number' ? sfResult.score : null, fenBefore);
                                    explanation.matchScore = moveScore.matchScore;
                                    explanation.matchPoints = moveScore.points;
                                    explanation.proximityType = moveScore.proximityType;
                                    explanation.centipawnLoss = moveScore.centipawnLoss;
                                    // prefer engine-based botPreference but fall back to moveScore suggestion
                                    explanation.botPreference = explanation.botPreference || moveScore.botPreference;
                                  } catch (e) {
                                    // ignore scoring errors
                                  }

                                      // Provide a human-friendly reason for the botPreference
                                      try {
                                        explanation.botPreferenceReason = buildBotPreferenceReason({ engineBest: sfResult.bestMove, moveUci, engineScore: typeof sfResult.score === 'number' ? sfResult.score : null, moveScore: typeof sfResult.score === 'number' ? { matchScore: explanation.matchScore ?? 0, points: explanation.matchPoints ?? 0, botPreference: explanation.botPreference } : undefined, indicator: explanation.moveIndicator });
                                      } catch (e) {}

                                      // Enforce early side-pawn blunder rule (e.g. f2f4, c2c4, f7f5, c7c5)
                                      enforceEarlySidePawnBlunder(explanation, moveUci, fenBefore);
                                      // apply user-defined botPreference rules (Less => Mistake/Blunder)
                                      let finalExplanation = applyBotPreferenceRulesV2(explanation, prevMatchPoints) || null;
                                      // Ensure early side-pawn rule overrides any engine labels
                                      finalExplanation = ensureEarlySidePawnEnforcement(finalExplanation, moveUci, fenBefore, fenAfter, prevMatchPoints) || finalExplanation;
                                      setAnalysis(finalExplanation);
                                      const hangingThreat = detectHangingPiece(fenBefore, fenAfter);
                                      const finalExplanationWithAi = finalExplanation ? await getAiFeedbackForMove(finalExplanation, fenBefore, fenAfter, moveUci || '', sfResult.bestMove, typeof sfResult.score === 'number' ? sfResult.score : null, hangingThreat) : null;

                                      if (cancelled) return;
                                      if (finalExplanationWithAi) enforceHangingPowerPieceBlunder(finalExplanationWithAi, fenBefore, fenAfter);
                                      setAnalysis(finalExplanationWithAi);
                                      // store current matchPoints for the next turn (push onto stack)
                                      if (finalExplanationWithAi && typeof finalExplanationWithAi.matchPoints === 'number') {
                                        pushMatchPoints(finalExplanationWithAi.matchPoints);
                                        try { setLastUciHistory(uciHistory); } catch (e) {}
                                      }
                                      
                              // extra debug showing the final explanation object
                              // eslint-disable-next-line no-console
                              console.debug('StockfishTutor: analysis (in-browser)', explanation);
                              try { setDebugLog(`stockfish result: ${sfResult.moveIndicator} | best=${sfResult.bestMove} score=${sfResult.score}`); } catch (e) {}
                              const elapsed = Date.now() - startedAt;
                              if (elapsed < minDisplayTime) await new Promise((r) => setTimeout(r, minDisplayTime - elapsed));
                              if (cancelled) return;
                              setIsAnalyzing(false);
                              return;
                            }
                          } catch (e) {
                            // eslint-disable-next-line no-console
                            console.warn('StockfishTutor: in-browser Stockfish failed, falling back to localAnalyze', e);
                            try { setDebugLog('in-browser Stockfish failed, using local fallback'); } catch (ee) {}
                          }

                          // Use local no-network heuristic analyzer as a fallback so the UI works without a server.
                          // Add a small delay to give the feel of real analysis and to let quick successive moves settle.
                          await new Promise((r) => setTimeout(r, 300));
                          if (cancelled) return;
                          const local = localAnalyze(fenBefore, fenAfter, moveUci || '');
                          // eslint-disable-next-line no-console
                          console.debug('StockfishTutor: local analyze result', local);
                          try { setDebugLog(`local result: ${local.explanation?.moveIndicator ?? '—'} | ${local.rawText}`); } catch (e) { /* ignore */ }
                          // normalize local result labels
                          if (local && local.explanation) {
                            const norm = { ...local.explanation } as Analysis;
                            norm.moveIndicator = normalizeIndicator(norm.moveIndicator as any) || norm.moveIndicator;
                            try {
                              const mv = computeMoveScore(undefined, moveUci, norm.score ?? null, fenBefore);
                              norm.matchScore = mv.matchScore;
                              norm.matchPoints = mv.points;
                              norm.proximityType = mv.proximityType;
                              norm.centipawnLoss = mv.centipawnLoss;
                              norm.botPreference = norm.botPreference || mv.botPreference;
                                // human readable reason
                                norm.botPreferenceReason = buildBotPreferenceReason({ engineBest: undefined, moveUci, engineScore: norm.score ?? null, moveScore: mv, indicator: norm.moveIndicator });
                            } catch (e) {}
                            // Enforce early side-pawn detection
                            enforceEarlySidePawnBlunder(norm, moveUci, fenBefore);
                            const finalNorm = ensureEarlySidePawnEnforcement(norm, moveUci, fenBefore, fenAfter, prevMatchPoints) || null;
                            const hangingThreat = detectHangingPiece(fenBefore, fenAfter);
                            const finalNormWithAi = finalNorm ? await getAiFeedbackForMove(finalNorm, fenBefore, fenAfter, moveUci || '', null, norm.score ?? null, hangingThreat) : null;
                            if (cancelled) return;
                            if (finalNormWithAi) enforceHangingPowerPieceBlunder(finalNormWithAi, fenBefore, fenAfter);
                            setAnalysis(finalNormWithAi);
                            try {
                              if (finalNormWithAi && typeof finalNormWithAi.matchPoints === 'number') pushMatchPoints(finalNormWithAi.matchPoints);
                            } catch (e) {}

                          } else {
                            setAnalysis({ Analysis: local.rawText });
                          }
                          const elapsed = Date.now() - startedAt;
                          if (elapsed < minDisplayTime) await new Promise((r) => setTimeout(r, minDisplayTime - elapsed));
                          if (cancelled) return;
                          setIsAnalyzing(false);
                          return;
                        }

        // Try a set of common endpoints in case the server route differs (e.g. /analyze vs /api/analyze)
        const endpoints = [
          `${baseUrl}/api/analyze`,
          `${baseUrl}/analyze`,
          `${baseUrl}/api/stockfish/analyze`,
          baseUrl,
        ];

        let rawText: string | null = null;
        let res: Response | null = null;
        let usedEndpoint: string | null = null;

        for (const endpoint of endpoints) {
          try {
            // eslint-disable-next-line no-console
            console.debug('StockfishTutor: attempting analyze endpoint', endpoint);
            res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'move',
                fen_before: fenBefore,
                fen_after: fenAfter,
                move: moveUci,
                uciHistory: uciHistory || '',
                depth: 15,
              }),
            });

            rawText = await res.text();
            // Debug: show raw server response to aid debugging
            // eslint-disable-next-line no-console
            console.debug('StockfishTutor: raw analyze response (truncated)', rawText.slice(0, 200));

            // If the server returned an HTML error page or a non-OK HTTP status, skip this endpoint and try the next.
            const looksLikeHtml = /^\s*<!doctype html>|^\s*<html/i.test(rawText || '');
            const bodySignalsError = rawText && (/Cannot POST/i.test(rawText) || /Cannot GET/i.test(rawText) || /Not Found/i.test(rawText));
            if (bodySignalsError || looksLikeHtml || (res && !res.ok)) {
              // eslint-disable-next-line no-console
              console.warn('StockfishTutor: endpoint returned non-JSON or error response, trying next', endpoint, { status: res?.status, bodySignalsError });
              rawText = null;
              res = null;
              continue; // try next endpoint
            }

            // If we got here, we have a non-error textual response (likely JSON) and can use this endpoint.
            usedEndpoint = endpoint;
            break;
          } catch (fetchErr) {
            // Network error or CORS — try next
            // eslint-disable-next-line no-console
            console.warn('StockfishTutor: fetch failed for endpoint, trying next', endpoint, fetchErr?.message || fetchErr);
            rawText = null;
            res = null;
          }
        }

          if (!rawText) {
          // No usable server response from any endpoint — fall back to local heuristic so the tutor still works offline
          // eslint-disable-next-line no-console
          console.warn('StockfishTutor: no usable server response, falling back to localAnalyze');
          try { setDebugLog('no server response, using localAnalyze fallback'); } catch (e) { /* ignore */ }
          const local = localAnalyze(fenBefore, fenAfter, moveUci || '');
                                        if (local && local.explanation) {
            const norm = { ...local.explanation } as Analysis;
            norm.moveIndicator = normalizeIndicator(norm.moveIndicator as any) || norm.moveIndicator;
            try {
              const mv = computeMoveScore(undefined, moveUci, norm.score ?? null, fenBefore);
              norm.matchScore = mv.matchScore;
              norm.matchPoints = mv.points;
              norm.proximityType = mv.proximityType;
              norm.centipawnLoss = mv.centipawnLoss;
              norm.botPreference = norm.botPreference || mv.botPreference;
            } catch (e) {}
            // Enforce early side-pawn detection
            enforceEarlySidePawnBlunder(norm, moveUci, fenBefore);
            const finalNorm = ensureEarlySidePawnEnforcement(norm, moveUci, fenBefore, fenAfter, prevMatchPoints) || null;
            const hangingThreat = detectHangingPiece(fenBefore, fenAfter);
            const finalNormWithAi = finalNorm ? await getAiFeedbackForMove(finalNorm, fenBefore, fenAfter, moveUci || '', null, norm.score ?? null, hangingThreat) : null;
            if (cancelled) return;
            if (finalNormWithAi) enforceHangingPowerPieceBlunder(finalNormWithAi, fenBefore, fenAfter);
            setAnalysis(finalNormWithAi);
            try {
              if (finalNormWithAi && typeof finalNormWithAi.matchPoints === 'number') setPrevMatchPoints(finalNormWithAi.matchPoints);
            } catch (e) {}

          } else {
            setAnalysis({ Analysis: local.rawText });
          }
          const elapsed = Date.now() - startedAt;
          if (elapsed < minDisplayTime) await new Promise((r) => setTimeout(r, minDisplayTime - elapsed));
          if (cancelled) return;
          setIsAnalyzing(false);
          return;
        }
        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch (parseErr) {
          // If the response isn't pure JSON, attempt to extract a JSON substring
          // This handles servers that wrap JSON in text or code fences.
          const firstBrace = rawText.indexOf('{');
          const lastBrace = rawText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const candidate = rawText.slice(firstBrace, lastBrace + 1);
            try {
              data = JSON.parse(candidate);
              // proceed with parsed `data`
            } catch (innerErr) {
              // Couldn't recover JSON — log and fallback to raw text display
              // eslint-disable-next-line no-console
              console.error('StockfishTutor: failed to parse extracted JSON candidate:', candidate, innerErr);
              setAnalysis({ Analysis: rawText });
              setIsAnalyzing(false);
              return;
            }
          } else {
          // No JSON-looking substring — log and show a placeholder instead of raw text
            // eslint-disable-next-line no-console
            console.error('StockfishTutor: non-JSON response from analyze endpoint:', rawText);
            // If the server returned an HTML error like "Cannot POST /api/analyze" inform the user with guidance
            if (/Cannot POST/i.test(rawText) || /Cannot GET/i.test(rawText) || /Not Found/i.test(rawText)) {
              setError(`Analysis endpoint not found at ${usedEndpoint}. Server returned: ${rawText.split('\n')[0]}. Check that the analysis server is running and that the URL in your environment is correct.`);
            } else {
            setAnalysis({ Analysis: GEMINI_FALLBACK_TEXT });
            }
            setIsAnalyzing(false);
            return;
          }
        }

        // Debug: show parsed server response for inspection (helps determine if bestMove/score are present)
        // eslint-disable-next-line no-console
        console.debug('StockfishTutor: parsed analyze response data=', data, 'usedEndpoint=', usedEndpoint);
        try { setDebugLog(`parsed server response: ${usedEndpoint} -> ${data && (data.bestMove || data.score || data.explanation)}`); } catch (e) {}

        if (!data || !data.success) {
          setError((data && (data.error || 'Analysis failed')) || 'Analysis failed');
          setIsAnalyzing(false);
          return;
        }

        let parsed: Analysis | undefined;
        const expl = data && data.explanation;
        if (typeof expl === 'string') {
          const cleaned = expl.replace(/```json/g, '').replace(/```/g, '').trim();
          // Only attempt JSON.parse if it looks like JSON
          const looksLikeJson = cleaned.startsWith('{') || cleaned.startsWith('[');
          if (looksLikeJson) {
            try {
              parsed = JSON.parse(cleaned);
            } catch (e) {
              // parsing failed, store raw text instead
              parsed = { Analysis: GEMINI_FALLBACK_TEXT };
            }
          } else {
            // not JSON — return a placeholder instead of raw explanation text
            parsed = { Analysis: GEMINI_FALLBACK_TEXT };
          }
        } else if (expl && typeof expl === 'object') {
          parsed = expl as Analysis;
        }

        // Normalize legacy/other labels: prefer 'Neutral' instead of 'Inaccuracy'
        if (parsed && parsed.moveIndicator === 'Inaccuracy') {
          parsed.moveIndicator = 'Neutral';
        }

        // If server returned engine metadata, compute botPreference and favorsCenter if not provided
        try {
          // data may contain bestMove/best_move or embedded strings. Attempt to find them.
          let engineBest: string | null | undefined = null;
          if (data) engineBest = data.bestMove || data.best_move || null;
          // If parsed explanation includes a bestMove field, prefer it
          if (!engineBest && parsed) engineBest = (parsed as any).bestMove || (parsed as any).best_move || null;
          const engineScore = data && (data.score || data.eval || (parsed && ((parsed as any).score || (parsed as any).eval)));

          // Extra diagnostics: if no engineBest was returned, try extracting a bestmove token from any textual explanation
          if (!engineBest) {
            const explText = typeof data?.explanation === 'string' ? data.explanation : (typeof parsed?.Analysis === 'string' ? parsed.Analysis : '');
            const bmMatch = explText && (explText.match(/bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/i) || explText.match(/"bestmove"\s*:\s*"([^"]+)"/i));
            if (bmMatch) {
              engineBest = bmMatch[1];
            } else {
              // no bestmove found — surface helpful debug info so developers can inspect the raw response
              try {
                const snippet = String(rawText || '').slice(0, 1000);
                // set a debug log visible in the UI so users can copy it when filing issues
                setDebugLog(`No engine bestMove returned from ${usedEndpoint}. Response snippet: ${snippet.replace(/\s+/g, ' ').trim()}`);
              } catch (e) {
                // ignore
              }
            }
          }
          if (parsed) {
            parsed.botPreference = (parsed.botPreference as any) || computeBotPreferenceFromEngine(engineBest, moveUci, typeof engineScore === 'number' ? engineScore : null) || inferBotPreferenceFromIndicator(parsed.moveIndicator as any);
            parsed.favorsCenter = (parsed.favorsCenter === undefined) ? computeFavorsCenter(moveUci, fenBefore) : parsed.favorsCenter;
            parsed.score = (parsed.score === undefined || parsed.score === null) ? (typeof engineScore === 'number' ? engineScore : parsed.score ?? null) : parsed.score;

            // compute matchScore/matchPoints using engine's bestMove if available
            try {
              const mv = computeMoveScore(engineBest, moveUci, typeof engineScore === 'number' ? engineScore : null, fenBefore);
              (parsed as any).matchScore = mv.matchScore;
              (parsed as any).matchPoints = mv.points;
              (parsed as any).proximityType = mv.proximityType;
              (parsed as any).centipawnLoss = mv.centipawnLoss;
              parsed.botPreference = parsed.botPreference || mv.botPreference;
              // human-friendly reason explaining the preference
              try {
                parsed.botPreferenceReason = buildBotPreferenceReason({ engineBest, moveUci, engineScore: typeof engineScore === 'number' ? engineScore : null, moveScore: mv, indicator: parsed.moveIndicator });
              } catch (e) {}
              // Debug: show what we computed from engineBest/engineScore
              // eslint-disable-next-line no-console
              console.debug('StockfishTutor: engineBest, engineScore, computed mv ->', { engineBest, engineScore, mv });
              try { setDebugLog(`engineBest=${engineBest} score=${engineScore} mv=${mv.points}`); } catch (e) {}
            } catch (e) {}

            // Enforce early side-pawn detection then apply user rule: botPreference 'Less' => Mistake; if (100 - matchPoints) > 10 => Blunder
            try {
              enforceEarlySidePawnBlunder(parsed, moveUci, fenBefore);
              parsed = applyBotPreferenceRulesV2(parsed, prevMatchPoints) || parsed;
            } catch (e) {}

            // Apply the final override before asking the chat model to explain the move
            try {
              parsed = ensureEarlySidePawnEnforcement(parsed || null, moveUci, fenBefore, fenAfter, prevMatchPoints) || parsed || null;
            } catch (e) {}

            // Fetch AI feedback for the server analysis path using the final rating
            const hangingThreat = detectHangingPiece(fenBefore, fenAfter);
            if (parsed) {
              parsed = await getAiFeedbackForMove(parsed, fenBefore, fenAfter, moveUci || '', engineBest, typeof engineScore === 'number' ? engineScore : null, hangingThreat);
              if (cancelled) return;
              enforceHangingPowerPieceBlunder(parsed, fenBefore, fenAfter);
            }

            try {
              if (parsed && typeof (parsed as any).matchPoints === 'number') {
                pushMatchPoints((parsed as any).matchPoints);
                try { setLastUciHistory(uciHistory); } catch (ee) {}
              }
            } catch (e) {}

          }
        } catch (e) {
          // ignore compute errors
        }

        // Respect minimum thinking display time for better UX
        const elapsed = Date.now() - startedAt;
        if (elapsed < minDisplayTime) await new Promise((r) => setTimeout(r, minDisplayTime - elapsed));
        if (cancelled) return;
        setAnalysis(parsed);
        setIsAnalyzing(false);
      } catch (err: any) {
        setError(err?.message || 'Network error');
        if (!cancelled) setIsAnalyzing(false);
      }
    };

    // Start analysis after debounce delay
    timer = setTimeout(() => doAnalyze(), analysisDelay);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [trigger, enabled, fenBefore, fenAfter, moveUci, uciHistory]);

  if (!enabled) return <div className={styles.tutorPlaceholder}>Tutor disabled</div>;

  const getCoachExpression = (): CoachExpression => {
    if (isAnalyzing) return 'thinking';
    if (error) return 'welcome';
    if (analysis) {
      const ind = analysis.moveIndicator;
      if (ind === 'Best') {
        return 'thumbsup';
      }
      if (ind === 'Good' || ind === 'Book') {
        return 'happy';
      }
      if (ind === 'Mistake' || ind === 'Blunder') {
        return 'thinking';
      }
      return 'speaking';
    }
    return 'welcome';
  };

  const expression = getCoachExpression();

  const renderBubbleContent = () => {
    if (isAnalyzing) {
      return (
        <div className={styles.bubbleLoading}>
          <div className={styles.typingLoader}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p className={styles.bubbleText}>Analyzing your move... Let me see if there is a better path! 🤔</p>
        </div>
      );
    }
    if (error) {
      return (
        <div>
          <p className={styles.bubbleTextError}>Oops, I ran into an issue: {error}</p>
        </div>
      );
    }
    if (analysis) {
      const ind = analysis.moveIndicator || '—';
      let indicatorClass = styles.indicatorNeutral;
      if (ind === 'Best') indicatorClass = styles.indicatorBest;
      else if (ind === 'Good' || ind === 'Book') indicatorClass = styles.indicatorGood;
      else if (ind === 'Mistake') indicatorClass = styles.indicatorMistake;
      else if (ind === 'Blunder') indicatorClass = styles.indicatorBlunder;

      // Helper to describe proximity type in human terms
      const getProximityLabel = (proximityType?: string): string => {
        switch (proximityType) {
          case 'exact': return '🎯 Exact Match';
          case 'sameDestination': return '📍 Same Square';
          case 'samePiece': return '♟️ Same Piece';
          case 'similar': return '≈ Similar';
          case 'distant': return '↔️ Different';
          default: return '';
        }
      };

      return (
        <div className={styles.bubbleAnalysis}>
          <div className={styles.bubbleHeaderRow}>
            <span className={`${styles.indicatorBadge} ${indicatorClass}`}>
              {ind === 'Book' ? '📖 Book Move' : ind === 'Best' ? '⭐ Best Move' : ind === 'Good' ? '✅ Good Move' : ind === 'Neutral' ? '⚪ Neutral' : ind === 'Mistake' ? '⚠️ Mistake' : ind === 'Blunder' ? '❌ Blunder' : ind}
            </span>
            {typeof analysis.matchPoints === 'number' && (
              <span className={styles.matchPointsBadge}>
                {analysis.matchPoints}/100 pts
              </span>
            )}
          </div>
          <p className={styles.bubbleText}>{analysis.Analysis ?? 'No explanation provided.'}</p>
          
          <div className={styles.detailsRow}>
            {analysis.proximityType && (
              <span className={styles.detailPill} title="How your move compares to the engine's choice">
                {getProximityLabel(analysis.proximityType)}
              </span>
            )}
            {typeof analysis.centipawnLoss === 'number' && analysis.centipawnLoss > 0 && (
              <span className={styles.detailPill} title="Evaluation loss in centipawns (1 pawn = 100 cp)">
                📉 Loss: {Math.round(analysis.centipawnLoss / 100 * 10) / 10}pt
              </span>
            )}
            {analysis.botPreference && (
              <span className={styles.detailPill}>Preference: {analysis.botPreference}</span>
            )}
            {analysis.botPreferenceReason && (
              <span className={styles.detailPill} title={analysis.botPreferenceReason}>Why: {analysis.botPreferenceReason}</span>
            )}
            {typeof analysis.favorsCenter === 'boolean' && (
              <span className={styles.detailPill}>
                {analysis.favorsCenter ? '🎯 Controls Center' : '↔️ Side Play'}
              </span>
            )}
            {analysis.nextStepHint && (
              <span className={styles.detailPillHint}>💡 Next: {analysis.nextStepHint}</span>
            )}
          </div>
        </div>
      );
    }
    return (
      <div>
        <p className={styles.bubbleText}>Make a move on the board and I'll give you instant tactical feedback! 🧠</p>
      </div>
    );
  };

  return (
    <div className={styles.tutorContainer}>
      <div className={styles.tutorHeader}>AI Tutor Feedback</div>
      
      <div className={styles.tutorMainArea}>
        <div className={styles.mascotWrapper}>
          <CoachMascot expression={expression} />
        </div>
        
        <div className={styles.speechBubble}>
          <div className={styles.bubbleArrow}></div>
          <div className={styles.bubbleContent}>
            {renderBubbleContent()}
          </div>
        </div>
      </div>

      {/* debugLog intentionally not rendered in UI anymore to avoid exposing raw engine output */}


    </div>
  );
};

export default StockfishTutor;
