'use client';

import { useEffect, useState } from 'react';

/**
 * Decorative, original sleep-world illustration. It is intentionally an
 * inline SVG (no image request or WebGL dependency) so the hero remains
 * fast, responsive, and readable if motion or graphics are unavailable.
 */
export default function DreamscapeScene() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return (
    <div className={`dreamscape-scene${reducedMotion ? ' is-static' : ''}`} aria-hidden="true">
      <div className="dreamscape-glow" />
      <svg className="dreamscape-art" viewBox="0 0 900 620" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
        <defs>
          <linearGradient id="dream-sky" x1="450" y1="0" x2="450" y2="620" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9AA9CE" stopOpacity=".38" />
            <stop offset=".54" stopColor="#C3A6B9" stopOpacity=".22" />
            <stop offset="1" stopColor="#D5DDBB" stopOpacity=".04" />
          </linearGradient>
          <linearGradient id="dream-mountain" x1="450" y1="220" x2="450" y2="540" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8C91B5" />
            <stop offset="1" stopColor="#354D57" />
          </linearGradient>
          <linearGradient id="dream-bed" x1="450" y1="390" x2="450" y2="550" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5F0E4" />
            <stop offset="1" stopColor="#B8C6B4" />
          </linearGradient>
          <radialGradient id="dream-moon" cx="0" cy="0" r="1" gradientTransform="translate(640 132) rotate(90) scale(68)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF7D9" stopOpacity=".95" />
            <stop offset="1" stopColor="#E7DDB9" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="640" cy="132" rx="115" ry="115" fill="url(#dream-moon)" />
        <circle cx="640" cy="132" r="39" fill="#F5EBD0" fillOpacity=".82" />
        <g className="dreamscape-stars" fill="#F8F0D9">
          <circle cx="178" cy="104" r="2.5"/><circle cx="314" cy="72" r="1.8"/><circle cx="488" cy="128" r="2"/>
          <circle cx="760" cy="226" r="2.2"/><circle cx="572" cy="56" r="1.5"/><circle cx="250" cy="205" r="1.7"/>
          <path d="M386 142v10m-5-5h10M780 91v8m-4-4h8M120 240v8m-4-4h8" stroke="#F8F0D9" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
        <path d="M0 375 120 286 206 340 337 228 468 355 576 270 716 351 814 278 900 338V620H0V375Z" fill="url(#dream-mountain)" fillOpacity=".62"/>
        <path d="M0 426 140 354 244 402 370 300 494 420 620 335 758 418 850 355 900 385V620H0V426Z" fill="#405B61" fillOpacity=".76"/>
        <g className="dreamscape-city" fill="#1C3437" fillOpacity=".86">
          <path d="M38 420h55v-78h22v78h30v-112h26v112h34v-56h25v56h34v-94h28v94h38v-62h24v62h32v-124h25v124h32v-80h27v80h40v-104h24v104h30v-70h25v70h36v-120h27v120h34v-55h25v55h33v-93h27v93h36v-68h28v68h40v200H38V420Z"/>
          <path d="M70 361h6v10h-6zm28 22h6v10h-6zm57-44h6v10h-6zm40 50h6v10h-6zm66-32h6v10h-6zm62 18h6v10h-6zm79-53h6v10h-6zm56 48h6v10h-6zm71-33h6v10h-6zm58 44h6v10h-6zm80-55h6v10h-6zm50 37h6v10h-6zm62-25h6v10h-6z" fill="#D7CDA9" fillOpacity=".55"/>
        </g>
        <path d="M0 487c155-48 254-27 370-7 133 24 265 18 530-12v152H0V487Z" fill="#243F43"/>
        <ellipse cx="464" cy="524" rx="320" ry="60" fill="#D5DDBB" fillOpacity=".12"/>
        <g className="dreamscape-bed">
          <path d="m236 433 208-66 232 71-211 75-229-80Z" fill="#9EAD9E"/>
          <path d="m236 433 229 80v49l-229-81v-48Z" fill="#738C84"/>
          <path d="m465 513 211-75v48l-211 76v-49Z" fill="#536F69"/>
          <path d="m278 421 167-52 187 57-170 61-184-66Z" fill="url(#dream-bed)"/>
          <path d="m278 421 184 66v20l-184-66v-20Z" fill="#B5C4B2"/>
          <path d="m462 487 170-61v20l-170 61v-20Z" fill="#8FA698"/>
          <path d="m304 415 87-27 81 29-86 29-82-31Z" fill="#F8F4E8"/>
          <path d="m407 385 73-23 89 29-75 27-87-33Z" fill="#E8E6D9"/>
          <path d="M235 432c70-19 142-28 229-7 85-24 151-26 212 9" stroke="#F4EAD0" strokeOpacity=".42" strokeWidth="2"/>
        </g>
        <path d="M90 585c160-32 251-22 372-2 135 22 246 12 350-12" stroke="#D7DDBD" strokeOpacity=".28" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div className="dreamscape-label"><span /> A better night's sleep, mapped to you</div>
    </div>
  );
}
