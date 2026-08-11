import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

const GRID_COLS = 12;
const GRID_ROWS = 18;
const CELL = 38;
const START_TIME = 60;

type GameState = "menu" | "playing" | "paused" | "gameover";
type Tile = "grass" | "tree" | "rock" | "pond" | "flower" | "bush";
type PowerType = "time" | "freeze" | "double" | "shield" | "dash";

interface Pos { x: number; y: number; }
interface Mouse {
  id: number;
  pos: Pos;
  dir: Pos;
  type: "normal" | "fast" | "smart" | "gold";
  alive: boolean;
}
interface Power {
  id: number;
  pos: Pos;
  type: PowerType;
  active: boolean;
}

const DIRS: Pos[] = [
  { x: 0, y: -1 }, { x: 0, y: 1 },
  { x: -1, y: 0 }, { x: 1, y: 0 },
];

const TILE_EMOJI: Record<Tile, string> = {
  grass: "", tree: "🌳", rock: "🪨", pond: "💧", flower: "🌸", bush: "🌿",
};

const POWER_EMOJI: Record<PowerType, string> = {
  time: "⏱️", freeze: "❄️", double: "⚡", shield: "🛡️", dash: "🔥",
};

const MOUSE_EMOJI: Record<Mouse["type"], string> = {
  normal: "🐭", fast: "🐁", smart: "🐹", gold: "🐀",
};

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const k = (p: Pos) => `${p.x},${p.y}`;
const same = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;

function walkable(map: Tile[][], p: Pos) {
  return p.x >= 0 && p.x < GRID_COLS && p.y >= 0 && p.y < GRID_ROWS &&
    !["tree", "rock", "pond", "bush"].includes(map[p.y][p.x]);
}

function makeMap(level: number) {
  const map: Tile[][] = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill("grass")
  );

  let placed = 0;
  const obstacleCount = Math.min(13 + level * 2, 40);
  while (placed < obstacleCount) {
    const x = rand(0, GRID_COLS - 1), y = rand(2, GRID_ROWS - 1);
    if (map[y][x] === "grass") {
      map[y][x] = Math.random() < 0.5 ? "tree" : "rock";
      placed++;
    }
  }

  for (let i = 0; i < 12; i++) {
    const x = rand(0, GRID_COLS - 1), y = rand(0, GRID_ROWS - 1);
    if (map[y][x] === "grass") map[y][x] = "flower";
  }

  const px = rand(1, GRID_COLS - 3), py = rand(3, GRID_ROWS - 4);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) map[py + y][px + x] = "pond";

  if (level >= 3) {
    for (let i = 0; i < Math.min(3 + level, 9); i++) {
      const x = rand(0, GRID_COLS - 1), y = rand(2, GRID_ROWS - 1);
      if (map[y][x] === "grass") map[y][x] = "bush";
    }
  }
  return map;
}

function freeCell(map: Tile[][], occupied: Set<string>): Pos {
  for (let i = 0; i < 400; i++) {
    const p = { x: rand(0, GRID_COLS - 1), y: rand(1, GRID_ROWS - 1) };
    if (walkable(map, p) && !occupied.has(k(p))) return p;
  }
  return { x: 0, y: GRID_ROWS - 1 };
}

function spawnMice(map: Tile[][], cat: Pos, level: number): Mouse[] {
  const occupied = new Set([k(cat)]);
  const count = Math.min(4 + Math.floor((level - 1) * 0.8), 10);

  return Array.from({ length: count }, (_, id) => {
    const pos = freeCell(map, occupied);
    occupied.add(k(pos));
    const r = Math.random();
    const type: Mouse["type"] =
      level >= 4 && r < 0.10 ? "gold" :
      level >= 3 && r < 0.28 ? "smart" :
      level >= 2 && r < 0.48 ? "fast" : "normal";
    const dir = DIRS[rand(0, 3)];
    return { id, pos, dir, type, alive: true };
  });
}

function spawnPowers(map: Tile[][], cat: Pos, mice: Mouse[], level: number): Power[] {
  const occupied = new Set([k(cat), ...mice.map(m => k(m.pos))]);
  const types: PowerType[] = ["time", "freeze", "double", "shield", "dash"];
  const count = Math.min(1 + Math.floor(level / 4), 3);

  return Array.from({ length: count }, (_, i) => {
    const pos = freeCell(map, occupied);
    occupied.add(k(pos));
    return { id: Date.now() + i, pos, type: types[rand(0, types.length - 1)], active: true };
  });
}

function moveMouse(mouse: Mouse, map: Tile[][], occupied: Set<string>, cat: Pos, level: number) {
  const options = [...DIRS];
  if (mouse.type === "smart") {
    options.sort((a, b) => {
      const da = Math.abs(mouse.pos.x + a.x - cat.x) + Math.abs(mouse.pos.y + a.y - cat.y);
      const db = Math.abs(mouse.pos.x + b.x - cat.x) + Math.abs(mouse.pos.y + b.y - cat.y);
      return db - da;
    });
  } else options.sort(() => Math.random() - 0.5);

  let result = mouse;
  const steps = mouse.type === "fast" && level >= 4 && Math.random() < 0.35 ? 2 : 1;

  for (let i = 0; i < steps; i++) {
    const preferred = { x: result.pos.x + result.dir.x, y: result.pos.y + result.dir.y };
    let next: Pos | null = null;

    if (walkable(map, preferred) && !occupied.has(k(preferred))) next = preferred;
    else for (const d of options) {
      const p = { x: result.pos.x + d.x, y: result.pos.y + d.y };
      if (walkable(map, p) && !occupied.has(k(p))) {
        result = { ...result, dir: d };
        next = p;
        break;
      }
    }
    if (!next) break;
    result = { ...result, pos: next };
  }
  return result;
}

export default function Game() {
  const [state, setState] = useState<GameState>("menu");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("cat_best") || 0));
  const [time, setTime] = useState(START_TIME);
  const [lives, setLives] = useState(3);
  const [cat, setCat] = useState<Pos>({ x: 6, y: 9 });
  const [map, setMap] = useState<Tile[][]>([]);
  const [mice, setMice] = useState<Mouse[]>([]);
  const [powers, setPowers] = useState<Power[]>([]);
  const [combo, setCombo] = useState(0);
  const [powerLevel, setPowerLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const [double, setDouble] = useState(false);
  const [shield, setShield] = useState(false);
  const [dash, setDash] = useState(false);
  const [message, setMessage] = useState("");
  const [dir, setDir] = useState<"left" | "right">("right");

  const stateRef = useRef(state), catRef = useRef(cat), mapRef = useRef(map);
  const miceRef = useRef(mice), frozenRef = useRef(frozen), dashRef = useRef(dash);
  stateRef.current = state; catRef.current = cat; mapRef.current = map;
  miceRef.current = mice; frozenRef.current = frozen; dashRef.current = dash;

  const announce = useCallback((s: string) => {
    setMessage(s);
    window.setTimeout(() => setMessage(""), 900);
  }, []);

  const start = useCallback(() => {
    const lv = 1, m = makeMap(lv), c = { x: 6, y: 9 };
    const ms = spawnMice(m, c, lv);
    setLevel(lv); setScore(0); setTime(START_TIME); setLives(3);
    setPowerLevel(1); setXp(0); setCombo(0);
    setFrozen(false); setDouble(false); setShield(false); setDash(false);
    setMap(m); setCat(c); setMice(ms); setPowers(spawnPowers(m, c, ms, lv));
    setState("playing");
  }, []);

  const nextLevel = useCallback(() => {
    const lv = level + 1, m = makeMap(lv), c = catRef.current;
    const ms = spawnMice(m, c, lv);
    setLevel(lv); setMap(m); setMice(ms);
    setPowers(spawnPowers(m, c, ms, lv));
    setTime(t => Math.min(99, t + 18));
    setCombo(0);
    announce(`LEVEL ${lv}! 🚀`);
  }, [level, announce]);

  const collectPower = useCallback((p: Power) => {
    setPowers(prev => prev.map(x => x.id === p.id ? { ...x, active: false } : x));
    if (p.type === "time") { setTime(t => Math.min(99, t + 15)); announce("+15 SECONDS ⏱️"); }
    if (p.type === "freeze") {
      setFrozen(true); announce("FREEZE! ❄️");
      window.setTimeout(() => setFrozen(false), 5000);
    }
    if (p.type === "double") {
      setDouble(true); announce("DOUBLE SCORE! ⚡");
      window.setTimeout(() => setDouble(false), 8000);
    }
    if (p.type === "shield") { setShield(true); announce("SHIELD READY! 🛡️"); }
    if (p.type === "dash") { setDash(true); announce("POWER DASH! 🔥"); }
  }, [announce]);

  const moveCat = useCallback((dx: number, dy: number) => {
    if (stateRef.current !== "playing") return;

    let current = catRef.current;
    const steps = dashRef.current ? 2 : 1;

    for (let step = 0; step < steps; step++) {
      const next = { x: current.x + dx, y: current.y + dy };
      if (!walkable(mapRef.current, next)) break;
      current = next;

      if (dx < 0) setDir("left");
      if (dx > 0) setDir("right");

      const caught = miceRef.current.filter(m => m.alive && same(m.pos, current));
      if (caught.length) {
        const gold = caught.some(m => m.type === "gold");
        const gain = caught.reduce((n, m) => n + (m.type === "gold" ? 50 : 10), 0);
        const total = gain * (double ? 2 : 1) + Math.min(combo * 3, 30);

        setScore(s => s + total);
        setCombo(c => c + caught.length);
        setXp(x => x + (gold ? 30 : 10) * caught.length);
        setMice(prev => prev.map(m => caught.some(c => c.id === m.id) ? { ...m, alive: false } : m));
        announce(`+${total} ${gold ? "💰 GOLD!" : "✨"}`);
      }

      const power = powers.find(p => p.active && same(p.pos, current));
      if (power) collectPower(power);
    }

    setCat(current);
    if (dashRef.current) {
      setDash(false);
    }
  }, [combo, double, powers, collectPower, announce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "arrowup" || key === "w") moveCat(0, -1);
      if (key === "arrowdown" || key === "s") moveCat(0, 1);
      if (key === "arrowleft" || key === "a") moveCat(-1, 0);
      if (key === "arrowright" || key === "d") moveCat(1, 0);
      if (key === "escape") setState(s => s === "playing" ? "paused" : s === "paused" ? "playing" : s);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moveCat]);

  useEffect(() => {
    if (state !== "playing") return;
    const timer = window.setInterval(() => setTime(t => {
      if (t <= 1) { setState("gameover"); return 0; }
      return t - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => {
    if (state !== "playing" || frozen) return;
    const timer = window.setInterval(() => {
      const c = catRef.current;
      setMice(prev => {
        const occupied = new Set([k(c)]);
        return prev.map(m => {
          if (!m.alive) return m;
          const moved = moveMouse(m, mapRef.current, occupied, c, level);
          occupied.add(k(moved.pos));

          if (same(moved.pos, c)) {
            if (shield) {
              setShield(false);
              announce("SHIELD SAVED YOU! 🛡️");
              return { ...moved, alive: false };
            }
            setLives(l => {
              if (l <= 1) setState("gameover");
              return Math.max(0, l - 1);
            });
            announce("OUCH! ❤️");
            return { ...moved, alive: false };
          }
          return moved;
        });
      });
      setCombo(c => Math.max(0, c - 1));
    }, Math.max(90, 175 - level * 5));
    return () => window.clearInterval(timer);
  }, [state, frozen, level, shield, announce]);

  useEffect(() => {
    if (state === "playing" && mice.length && mice.every(m => !m.alive)) nextLevel();
  }, [mice, state, nextLevel]);

  useEffect(() => {
    if (xp >= powerLevel * 100) {
      setXp(x => x - powerLevel * 100);
      setPowerLevel(p => p + 1);
      setScore(s => s + 100);
      announce(`CAT POWER ${powerLevel + 1}! 🐱⚡`);
    }
  }, [xp, powerLevel, announce]);

  useEffect(() => {
    if (state === "gameover") {
      if (score > best) {
        setBest(score);
        localStorage.setItem("cat_best", String(score));
      }
    }
  }, [state, score, best]);

  const touch = useRef<Pos | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0], dx = t.clientX - touch.current.x, dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    Math.abs(dx) > Math.abs(dy) ? moveCat(dx > 0 ? 1 : -1, 0) : moveCat(0, dy > 0 ? 1 : -1);
  };

  const alive = useMemo(() => mice.filter(m => m.alive).length, [mice]);
  const boardW = GRID_COLS * CELL, boardH = GRID_ROWS * CELL;
  const xpMax = powerLevel * 100;

  if (state === "menu") return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center bg-background gap-5">
      <div className="text-8xl animate-bounce">🐱</div>
      <h1 className="text-4xl font-black tracking-tight text-primary">CAT HUNTER</h1>
      <p className="text-secondary max-w-sm">Hunt, level up, collect powers and become the ultimate cat hunter.</p>
      <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
        <div className="rounded-2xl bg-raised p-3 text-2xl">🐭<div className="text-xs">HUNT</div></div>
        <div className="rounded-2xl bg-raised p-3 text-2xl">⚡<div className="text-xs">POWER</div></div>
        <div className="rounded-2xl bg-raised p-3 text-2xl">🏆<div className="text-xs">RECORD</div></div>
      </div>
      <div className="font-bold text-accent">🏆 BEST {best}</div>
      <button onClick={start} className="px-12 py-4 rounded-2xl bg-accent text-accent-fg text-xl font-black active:scale-95 shadow-lg">PLAY NOW 🎮</button>
      <div className="text-xs text-secondary">Swipe or use the control pad • WASD / Arrows</div>
    </div>
  );

  if (state === "gameover") return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background text-center gap-5 px-6">
      <div className="text-8xl">😿</div>
      <h2 className="text-3xl font-black">GAME OVER</h2>
      <div className="text-6xl font-black text-accent">{score}</div>
      <div className="text-secondary">LEVEL {level} • CAT POWER {powerLevel}</div>
      <div className="text-lg">{score >= best ? "🏆 NEW RECORD!" : `BEST ${best}`}</div>
      <button onClick={start} className="px-10 py-3 rounded-2xl bg-accent text-accent-fg font-black text-lg">PLAY AGAIN 🔄</button>
      <button onClick={() => setState("menu")} className="underline text-secondary">MAIN MENU</button>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center overflow-hidden" style={{ userSelect: "none", touchAction: "none" }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="w-full flex items-center justify-between px-3 py-2 bg-raised border-b border-border" style={{ maxWidth: boardW + 8 }}>
        <div><div className="text-[10px] text-secondary">SCORE</div><div className="text-xl font-black">{score}</div></div>
        <div className="text-center"><div className="font-black">LV {level}</div><div className="text-[10px] text-secondary">🐭 {alive} • 🔥 x{combo}</div></div>
        <div className="flex items-center gap-2">
          <div className={`text-xl font-black ${time <= 10 ? "text-error" : ""}`}>{time}s</div>
          <button onClick={() => setState(s => s === "playing" ? "paused" : "playing")} className="w-10 h-10 rounded-full bg-inset">{state === "playing" ? "⏸️" : "▶️"}</button>
        </div>
      </div>

      <div className="w-full max-w-[464px] px-2 pt-2">
        <div className="flex items-center gap-2 text-xs">
          <span>🐱 PWR {powerLevel}</span>
          <div className="flex-1 h-2 rounded-full bg-inset overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, xp / xpMax * 100)}%` }} /></div>
          <span>{xp}/{xpMax}</span>
        </div>
        <div className="flex gap-2 mt-1 text-xs">
          <span>❤️ {lives}</span>
          {double && <span>⚡ 2X</span>}
          {shield && <span>🛡️ SHIELD</span>}
          {dash && <span>🔥 DASH</span>}
        </div>
      </div>

      <div className="relative border border-border overflow-hidden mt-2 rounded-xl shadow-xl" style={{ width: boardW, height: boardH }}>
        {map.map((row, y) => row.map((tile, x) => (
          <div key={`${x}-${y}`} className="absolute flex items-center justify-center" style={{
            left: x * CELL, top: y * CELL, width: CELL, height: CELL,
            fontSize: tile === "flower" ? 15 : 20,
            background: tile === "pond" ? "var(--color-info-weak)" : (x + y) % 2 ? "var(--color-inset)" : "var(--color-background)"
          }}>{TILE_EMOJI[tile]}</div>
        )))}

        {powers.map(p => p.active && <div key={p.id} className="absolute flex items-center justify-center animate-pulse" style={{ left: p.pos.x*CELL, top:p.pos.y*CELL, width:CELL, height:CELL, fontSize:22, zIndex:8 }}>{POWER_EMOJI[p.type]}</div>)}

        {mice.map(m => m.alive && <div key={m.id} className="absolute flex items-center justify-center transition-all" style={{
          left:m.pos.x*CELL, top:m.pos.y*CELL, width:CELL, height:CELL, fontSize:m.type==="gold"?24:22,
          transform:m.dir.x<0?"scaleX(-1)":"none", zIndex:10, transitionDuration:"120ms"
        }}>{MOUSE_EMOJI[m.type]}</div>)}

        <div className="absolute flex items-center justify-center transition-all" style={{
          left:cat.x*CELL, top:cat.y*CELL, width:CELL, height:CELL, fontSize:28,
          transform:dir==="left"?"scaleX(-1)":"none", zIndex:20, transitionDuration:"90ms"
        }}>🐱</div>

        {message && <div className="absolute inset-x-0 top-1/3 text-center pointer-events-none" style={{zIndex:40}}>
          <span className="inline-block px-4 py-2 rounded-2xl bg-black/70 text-white font-black text-xl animate-pulse">{message}</span>
        </div>}

        {state === "paused" && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{background:"rgba(0,0,0,.68)",zIndex:50}}>
          <div className="text-6xl">⏸️</div><div className="text-white text-2xl font-black">PAUSED</div>
          <button onClick={() => setState("playing")} className="px-8 py-3 rounded-xl bg-accent text-accent-fg font-black">RESUME ▶️</button>
        </div>}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div />
        <button onPointerDown={() => moveCat(0,-1)} className="w-14 h-12 rounded-xl bg-raised border border-border text-xl active:scale-90">▲</button>
        <div />
        <button onPointerDown={() => moveCat(-1,0)} className="w-14 h-12 rounded-xl bg-raised border border-border text-xl active:scale-90">◀</button>
        <button onPointerDown={() => moveCat(0,1)} className="w-14 h-12 rounded-xl bg-raised border border-border text-xl active:scale-90">▼</button>
        <button onPointerDown={() => moveCat(1,0)} className="w-14 h-12 rounded-xl bg-raised border border-border text-xl active:scale-90">▶</button>
      </div>

      <div className="mt-2 mb-3 text-[10px] text-secondary">SWIPE TO MOVE • CATCH ALL MICE • LEVEL UP</div>
    </div>
  );
}
