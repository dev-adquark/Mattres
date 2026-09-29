'use client';
import { useEffect, useState } from 'react';
export default function MotionBedroomScene() {
 const [ready,setReady]=useState(false);
 useEffect(()=>{const id=requestAnimationFrame(()=>setReady(true));return()=>cancelAnimationFrame(id);},[]);
 return <div className={`motion-bedroom${ready?' is-ready':''}`} aria-hidden="true">
  <div className="mb-window"><span/><span/><span/></div><div className="mb-glow"/>
  <div className="mb-plant"><i/><i/><i/><i/><b/></div><div className="mb-nightstand"><span/><span/></div><div className="mb-lamp"><i/><b/></div>
  <div className="mb-bed"><div className="mb-headboard"/><div className="mb-pillow mb-pillow-one"/><div className="mb-pillow mb-pillow-two"/><div className="mb-mattress"><span/><i/></div><div className="mb-base"/><div className="mb-bed-leg mb-leg-one"/><div className="mb-bed-leg mb-leg-two"/></div>
  <div className="mb-match-card"><small>✦ YOUR SLEEP PROFILE</small><strong>Your perfect match <b>✓</b></strong><span>☁ Medium firm　 ❄ Cooling　 ↟ Back support</span><em>Personalized for you</em></div><div className="mb-spark mb-spark-one">✦</div><div className="mb-spark mb-spark-two">✧</div>
 </div>;
}
