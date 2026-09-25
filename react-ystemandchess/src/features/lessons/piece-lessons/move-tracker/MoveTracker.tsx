import { useEffect, useRef } from "react"

export default function MoveTracker({ moves=[] }) {
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [moves]);

    let moveElements = []
    let count = 0
    for (let i = 0; i < moves.length; i += 2) {
        count += 1
        moveElements.push(
            <div key={i} className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-dark">
                <div className="font-bold text-primary">{`${count}.`}</div>
                <div className="font-mono font-semibold text-dark">{moves[i]}</div>
                {(i+1) <= moves.length - 1 ? <div className="font-mono font-semibold text-dark">{moves[i+1]}</div> : null}
            </div>
        )
    }

    return (
    <>
        <div ref={listRef} className="mt-6 max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">Moves</div>
            {moveElements.length === 0 ? <p className="text-sm text-slate-500">Make a move to see it here!</p> : moveElements}
        </div>
    </>
    )
}
