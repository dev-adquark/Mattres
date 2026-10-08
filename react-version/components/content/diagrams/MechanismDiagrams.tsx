import styles from '../Diagrams.module.css';
import { Arrow, Frame, Slab, captionText, type DiagramCaption } from './DiagramPrimitives';

/**
 * Original conceptual diagrams for the guides. Line-art cross-sections
 * that explain a mechanism (load, airflow, motion, edge collapse). They
 * are labelled as conceptual and not to scale; none depicts a product or a
 * person. Colours come from the section tokens via the CSS module, so the
 * same diagram works on light and dark moods.
 */

export function PressureDiagram({ caption = true }: { caption?: DiagramCaption }) {
  return (
    <Frame
      label="Conceptual cross-section: on a firm surface, load concentrates at two narrow contact zones; on a surface with more give, the same load spreads across a wider area."
      caption={captionText(caption, 'Conceptual diagram, not to scale: the same load on a firm surface (left) and a surface with more give (right).')}
    >
      <text className={styles.kicker} x="20" y="34">Firm surface</text>
      <text className={styles.kicker} x="240" y="34">More give</text>
      {/* Left: firm - shallow dents, tall concentrated arrows */}
      <Slab x={20} y={150} w={180} />
      <path className={styles.surfaceLine} d="M20 150 L60 150 Q70 156 80 150 L130 150 Q142 157 154 150 L200 150" />
      <Arrow x1={70} y1={70} x2={70} y2={146} className={styles.arrowStrong} />
      <Arrow x1={142} y1={70} x2={142} y2={146} className={styles.arrowStrong} />
      <text className={styles.label} x="70" y="60" textAnchor="middle">shoulder</text>
      <text className={styles.label} x="142" y="60" textAnchor="middle">hip</text>
      {/* Right: give - deeper, wider dents, spread arrows */}
      <Slab x={240} y={150} w={180} />
      <path className={styles.surfaceLine} d="M240 150 L262 150 Q290 176 318 152 Q326 150 334 152 Q362 178 392 150 L420 150" />
      {[268, 290, 312].map((x) => (
        <Arrow key={x} x1={x} y1={96} x2={x} y2={150 + (x === 290 ? 18 : 10)} className={styles.arrowSoft} />
      ))}
      {[346, 368, 390].map((x) => (
        <Arrow key={x} x1={x} y1={96} x2={x} y2={150 + (x === 368 ? 20 : 10)} className={styles.arrowSoft} />
      ))}
      <text className={styles.label} x="290" y="86" textAnchor="middle">shoulder</text>
      <text className={styles.label} x="368" y="86" textAnchor="middle">hip</text>
      <text className={styles.note} x="110" y="250" textAnchor="middle">load concentrated</text>
      <text className={styles.note} x="330" y="250" textAnchor="middle">load spread wider</text>
    </Frame>
  );
}

export function HeatDiagram({ caption = true }: { caption?: DiagramCaption }) {
  return (
    <Frame
      label="Conceptual cross-section: heat rising from a sleeper into dense foam has little room to escape; in an open coil core, air can move through the support layer."
      caption={captionText(caption, 'Conceptual diagram, not to scale: dense foam (left) holds more heat at the surface than an open coil core (right).')}
    >
      <text className={styles.kicker} x="20" y="34">Dense foam core</text>
      <text className={styles.kicker} x="240" y="34">Open coil core</text>
      <Slab x={20} y={120} w={180} h={90} comfort={0.34} dense />
      <Slab x={240} y={120} w={180} h={90} comfort={0.34} coils />
      {/* Left: heat curls back at the surface */}
      {[60, 110, 160].map((x) => (
        <path key={x} className={styles.heatWarm} d={`M${x} 112 q -10 -18 0 -36 q 10 -16 -2 -30`} />
      ))}
      <path className={styles.heatTrapped} d="M44 132 q 30 -10 60 0 t 60 0 t 30 0" />
      <text className={styles.note} x="110" y="246" textAnchor="middle">heat builds at the surface</text>
      {/* Right: airflow through coils */}
      {[268, 330, 392].map((x) => (
        <Arrow key={x} x1={x} y1={222} x2={x} y2={60} className={styles.arrowAir} />
      ))}
      <text className={styles.note} x="330" y="246" textAnchor="middle">air moves through the core</text>
    </Frame>
  );
}

export function MotionDiagram({ caption = true }: { caption?: DiagramCaption }) {
  const damped = 'M240 160 Q250 150 260 160 T280 160 Q287 156 294 160 T308 160 L420 160';
  const spread = 'M20 160 Q32 140 44 160 T68 160 Q80 144 92 160 T116 160 Q128 147 140 160 T164 160 Q176 150 188 160 T200 160';
  return (
    <Frame
      label="Conceptual diagram: a movement on one side of the bed sends a wave across a springy surface but dies out quickly in a slow, absorbent surface."
      caption={captionText(caption, 'Conceptual diagram, not to scale: a movement on the left carries across a springy surface (left) and fades in an absorbent one (right).')}
    >
      <text className={styles.kicker} x="20" y="34">Transfers motion</text>
      <text className={styles.kicker} x="240" y="34">Absorbs motion</text>
      <Slab x={20} y={160} w={180} h={64} coils />
      <Slab x={240} y={160} w={180} h={64} />
      <path className={styles.wave} d={spread} />
      <path className={styles.wave} d={damped} />
      <Arrow x1={32} y1={84} x2={32} y2={136} className={styles.arrowStrong} />
      <Arrow x1={252} y1={84} x2={252} y2={136} className={styles.arrowStrong} />
      <text className={styles.label} x="32" y="74" textAnchor="start">movement</text>
      <text className={styles.label} x="252" y="74" textAnchor="start">movement</text>
      <circle className={styles.partner} cx="176" cy="132" r="7" />
      <circle className={styles.partnerCalm} cx="396" cy="132" r="7" />
      <text className={styles.label} x="176" y="114" textAnchor="middle">felt here</text>
      <text className={styles.label} x="396" y="114" textAnchor="middle">barely felt</text>
    </Frame>
  );
}

export function EdgeDiagram({ caption = true }: { caption?: DiagramCaption }) {
  return (
    <Frame
      label="Conceptual cross-section of a mattress edge under a seated load: an unreinforced foam edge rolls down, while a reinforced perimeter stays close to level."
      caption={captionText(caption, 'Conceptual diagram, not to scale: a seated load at the edge of an unreinforced mattress (left) and one with a reinforced perimeter (right).')}
    >
      <text className={styles.kicker} x="20" y="34">Unreinforced edge</text>
      <text className={styles.kicker} x="240" y="34">Reinforced perimeter</text>
      {/* Left: edge rolls down */}
      <path className={styles.layerCoreFill} d="M20 140 L160 140 Q186 140 196 176 L200 212 L20 212 Z" />
      <path className={styles.surfaceLine} d="M20 140 L150 140 Q180 141 196 176" />
      <rect className={styles.outline} x="20" y="130" width="180" height="82" rx="3" />
      <Arrow x1={182} y1={70} x2={182} y2={150} className={styles.arrowStrong} />
      <text className={styles.label} x="182" y="60" textAnchor="middle">sitting</text>
      <text className={styles.note} x="110" y="246" textAnchor="middle">edge rolls under load</text>
      {/* Right: reinforced, stays level */}
      <rect className={styles.layerCore} x="240" y="134" width="180" height="78" />
      <rect className={styles.layerEdge} x="392" y="134" width="28" height="78" />
      <path className={styles.surfaceLine} d="M240 134 L392 134 Q402 138 420 138" />
      <rect className={styles.outline} x="240" y="130" width="180" height="82" rx="3" />
      <Arrow x1={402} y1={70} x2={402} y2={130} className={styles.arrowStrong} />
      <text className={styles.label} x="402" y="60" textAnchor="middle">sitting</text>
      <text className={styles.label} x="380" y="226" textAnchor="middle">firmer perimeter</text>
      <text className={styles.note} x="330" y="254" textAnchor="middle">edge stays close to level</text>
    </Frame>
  );
}

/** One pocketed coil as a vertical zig-zag from `top` down to `bottom`. */
function coilPath(x: number, top: number, bottom: number): string {
  const turns = 5;
  const step = (bottom - top) / turns;
  let d = `M${x} ${top}`;
  for (let i = 0; i < turns; i += 1) d += ` l ${i % 2 ? -5 : 5} ${step / 2} l ${i % 2 ? 5 : -5} ${step / 2}`;
  return d;
}

/** How far each of the seven coils in the materials diagram is pressed down (centre coils most). */
const COIL_PRESS = [0, 0, 6, 14, 6, 0, 0];

export function MaterialsDiagram({ caption = true }: { caption?: DiagramCaption }) {
  const coilXs = COIL_PRESS.map((_, i) => 312 + i * 16);
  return (
    <Frame
      label="Conceptual cross-sections of three materials under the same round load: memory foam lets it sink deep and recovers slowly, latex gives less and pushes back, and in pocketed coils only the coils directly under the load compress."
      caption={captionText(caption, 'Conceptual diagram, not to scale: the same load on memory foam (left), latex (centre) and pocketed coils (right).')}
    >
      <text className={styles.kicker} x="20" y="34">Memory foam</text>
      <text className={styles.kicker} x="160" y="34">Latex</text>
      <text className={styles.kicker} x="300" y="34">Pocketed coils</text>

      {/* Memory foam: deep, wide contour */}
      <rect className={styles.layerComfort} x="20" y="140" width="120" height="34" />
      <rect className={styles.layerDense} x="20" y="174" width="120" height="36" />
      <rect className={styles.outline} x="20" y="140" width="120" height="70" rx="3" />
      <path className={styles.surfaceLine} d="M20 140 L40 140 Q80 176 120 140 L140 140" />
      <circle className={styles.load} cx="80" cy="141" r="15" />
      <Arrow x1={80} y1={66} x2={80} y2={118} className={styles.arrowStrong} />
      <text className={styles.label} x="80" y="236" textAnchor="middle">sinks in deep,</text>
      <text className={styles.label} x="80" y="252" textAnchor="middle">recovers slowly</text>

      {/* Latex: shallower, springs back */}
      <rect className={styles.layerComfort} x="160" y="140" width="120" height="34" />
      <rect className={styles.layerCore} x="160" y="174" width="120" height="36" />
      <rect className={styles.outline} x="160" y="140" width="120" height="70" rx="3" />
      <path className={styles.surfaceLine} d="M160 140 L188 140 Q220 160 252 140 L280 140" />
      <circle className={styles.load} cx="220" cy="135" r="15" />
      <Arrow x1={220} y1={66} x2={220} y2={112} className={styles.arrowStrong} />
      <Arrow x1={180} y1={136} x2={180} y2={104} className={styles.arrowSoft} />
      <Arrow x1={260} y1={136} x2={260} y2={104} className={styles.arrowSoft} />
      <text className={styles.label} x="220" y="236" textAnchor="middle">gives less,</text>
      <text className={styles.label} x="220" y="252" textAnchor="middle">springs back fast</text>

      {/* Pocketed coils: only the coils under the load compress */}
      <rect className={styles.layerComfort} x="300" y="140" width="120" height="14" />
      {coilXs.map((x, i) => (
        <path key={x} className={styles.coil} d={coilPath(x, 158 + (COIL_PRESS[i] ?? 0), 206)} />
      ))}
      <rect className={styles.outline} x="300" y="140" width="120" height="70" rx="3" />
      <path className={styles.surfaceLine} d="M300 140 L338 140 Q360 156 382 140 L420 140" />
      <circle className={styles.load} cx="360" cy="133" r="15" />
      <Arrow x1={360} y1={66} x2={360} y2={110} className={styles.arrowStrong} />
      <text className={styles.label} x="360" y="236" textAnchor="middle">coils compress only</text>
      <text className={styles.label} x="360" y="252" textAnchor="middle">under the load</text>
    </Frame>
  );
}

export function NightTemperatureDiagram({ caption = true }: { caption?: DiagramCaption }) {
  // A smooth conceptual curve: level in the evening, falling before and after
  // lights out, then rising again toward waking. No values, no scale.
  const curve = 'M40 86 C 90 84, 110 96, 150 124 S 250 192, 300 194 S 380 160, 420 112';
  return (
    <Frame
      label="Conceptual curve of core body temperature through the night: it starts to fall in the evening before sleep, keeps falling after sleep onset, and rises again toward waking. A warm, humid room works against that fall."
      caption={captionText(caption, 'Conceptual diagram, not measured data: core body temperature falls into the night and rises toward waking.')}
    >
      <text className={styles.kicker} x="20" y="34">Core body temperature</text>
      <text className={styles.label} x="20" y="52">conceptual, no scale</text>
      {/* Baseline and phase markers */}
      <line className={styles.axis} x1="40" y1="222" x2="420" y2="222" />
      <line className={styles.marker} x1="150" y1="88" x2="150" y2="222" />
      <line className={styles.marker} x1="400" y1="88" x2="400" y2="222" />
      <text className={styles.label} x="150" y="80" textAnchor="middle">lights out</text>
      <text className={styles.label} x="400" y="80" textAnchor="middle">waking</text>
      <path className={styles.tempCurve} d={curve} />
      <text className={styles.note} x="96" y="142" textAnchor="middle">falls before</text>
      <text className={styles.note} x="96" y="158" textAnchor="middle">bed</text>
      <text className={styles.note} x="300" y="146" textAnchor="middle">asleep:</text>
      <text className={styles.note} x="300" y="164" textAnchor="middle">keeps falling</text>
      <text className={styles.note} x="356" y="208" textAnchor="middle">rises to wake</text>
      <text className={styles.label} x="40" y="242">evening</text>
      <text className={styles.label} x="262" y="242" textAnchor="middle">night</text>
      <text className={styles.label} x="420" y="242" textAnchor="end">morning</text>
    </Frame>
  );
}
