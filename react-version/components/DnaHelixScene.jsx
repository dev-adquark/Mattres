'use client';
export default function DnaHelixScene({scale=1}) {
 return <div className="dna-helix-visual" aria-hidden="true" style={{'--helix-scale':scale}}>{Array.from({length:12},(_,i)=><span key={i} style={{'--i':i}} />)}</div>;
}
