import React from 'react';

export default function PromotionPopup({ position=null, promoteToPiece = (position: any, piece) => {console.log(piece)}, }) {
    function handlePromotion(position: any, piece) {
        promoteToPiece(position, piece);
    }

    return (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/50 text-lg text-white">
            <div className="rounded-xl border border-slate-400 bg-slate-100 p-6 text-center text-slate-800 shadow-xl">
                <h2 className="text-2xl font-bold">Pawn Promotion</h2>
                <p className="mt-2">Select a piece to promote your pawn:</p>
                <div className="mt-4 flex justify-around gap-3 rounded-lg border border-slate-400 bg-slate-200 p-4">
                    <button className="rounded-md bg-[#7fcc26] px-3 py-2 font-semibold text-black transition hover:bg-[#5d971b]" onClick={() => handlePromotion(position, "Q")}>Queen</button>
                    <button className="rounded-md bg-[#7fcc26] px-3 py-2 font-semibold text-black transition hover:bg-[#5d971b]" onClick={() => handlePromotion(position, "R")}>Rook</button>
                    <button className="rounded-md bg-[#7fcc26] px-3 py-2 font-semibold text-black transition hover:bg-[#5d971b]" onClick={() => handlePromotion(position, "B")}>Bishop</button>
                    <button className="rounded-md bg-[#7fcc26] px-3 py-2 font-semibold text-black transition hover:bg-[#5d971b]" onClick={() => handlePromotion(position, "N")}>Knight</button>
                </div>
            </div>
        </div>
    );
}