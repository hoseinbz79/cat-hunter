import React, { useState, useEffect, useRef, useCallback } from "react";

const GRID_COLS = 12;
const GRID_ROWS = 18;
const CELL_SIZE = 38;
const TICK_INTERVAL = 160;
const MOUSE_COUNT = 4;
const OBSTACLE_COUNT = 14;

const TILE = {
  GRASS: 0,
  TREE: 1,
  ROCK: 2,
  FLOWER: 3,
  POND: 4,
} as const;

type TileType = (typeof TILE)[keyof typeof TILE];

interface Pos {
  x: number;
  y: number;
}

interface Mouse {
  id: number;
  pos: Pos;
  alive: boolean;
  dx: number;
  dy: number;
}

type GameState = "menu" | "playing" | "paused" | "gameover";

const TILE_EMOJI: Record<TileType, string> = {
  [TILE.GRASS]: "ًںŒ؟",
  [TILE.TREE]: "ًںŒ³",
  [TILE.ROCK]: "ًںھ¨",
  [TILE.FLOWER]: "ًںŒ¸",
  [TILE.POND]: "ًں’§",
};

const DIRS: Pos[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function posKey(p: Pos) {
  return `${p.x},${p.y}`;
}

function generateMap(): TileType[][] {
  const map: TileType[][] = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(TILE.GRASS)
  );

  let placed = 0;
  while (placed < OBSTACLE_COUNT) {
    const x = randInt(0, GRID_COLS - 1);
    const y = randInt(2, GRID_ROWS - 1);

    if (map[y][x] === TILE.GRASS) {
      map[y][x] = Math.random() < 0.5 ? TILE.TREE : TILE.ROCK;
      placed++;
    }
  }

  for (let i = 0; i < 8; i++) {
    const x = randInt(0, GRID_COLS - 1);
    const y = randInt(0, GRID_ROWS - 1);
    if (map[y][x] === TILE.GRASS) {
      map[y][x] = TILE.FLOWER;
    }
  }

  const px = randInt(1, GRID_COLS - 3);
  const py = randInt(2, GRID_ROWS - 3);
  map[py][px] = TILE.POND;
  map[py][px + 1] = TILE.POND;
  map[py + 1][px] = TILE.POND;

  return map;
}

function isWalkable(map: TileType[][], pos: Pos): boolean {
  if (
    pos.x < 0 ||
    pos.x >= GRID_COLS ||
    pos.y < 0 ||
    pos.y >= GRID_ROWS
  ) {
    return false;
  }

  const t = map[pos.y][pos.x];
  return t !== TILE.TREE && t !== TILE.ROCK && t !== TILE.POND;
}

function findFreeCell(map: TileType[][], occupied: Set<string>): Pos {
  let pos: Pos;
  let tries = 0;

  do {
    pos = {
      x: randInt(0, GRID_COLS - 1),
      y: randInt(0, GRID_ROWS - 1),
    };
    tries++;
  } while (
    (!isWalkable(map, pos) || occupied.has(posKey(pos))) &&
    tries < 200
  );

  return pos;
}

function spawnMice(map: TileType[][], catPos: Pos): Mouse[] {
  const occ = new Set([posKey(catPos)]);

  return Array.from({ length: MOUSE_COUNT }, (_, i) => {
    const pos = findFreeCell(map, occ);
    occ.add(posKey(pos));

    const dir = DIRS[randInt(0, 3)];

    return {
      id: i,
      pos,
      alive: true,
      dx: dir.x,
      dy: dir.y,
    };
  });
}

function moveMouseRandom(
  mouse: Mouse,
  map: TileType[][],
  occupied: Set<string>
): Mouse {
  const preferred = {
    x: mouse.pos.x + mouse.dx,
    y: mouse.pos.y + mouse.dy,
  };

  if (isWalkable(map, preferred) && !occupied.has(posKey(preferred))) {
    return { ...mouse, pos: preferred };
  }

  const dirs = [...DIRS].sort(() => Math.random() - 0.5);

  for (const d of dirs) {
    const np = {
      x: mouse.pos.x + d.x,
      y: mouse.pos.y + d.y,
    };

    if (isWalkable(map, np) && !occupied.has(posKey(np))) {
      return {
        ...mouse,
        pos: np,
        dx: d.x,
        dy: d.y,
      };
    }
  }

  return mouse;
}

export default function Game() {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [score, setScore] = useState(0);

  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem("cat_highscore") || "0");
    } catch {
      return 0;
    }
  });

  const [timeLeft, setTimeLeft] = useState(60);
  const [map, setMap] = useState<TileType[][]>([]);
  const [catPos, setCatPos] = useState<Pos>({ x: 5, y: 8 });
  const [catDir, setCatDir] = useState<"left" | "right">("right");
  const [mice, setMice] = useState<Mouse[]>([]);
  const [catAnim, setCatAnim] = useState(false);
  const [catchEffect, setCatchEffect] = useState<Pos | null>(null);
  const [level, setLevel] = useState(1);

  const gameStateRef = useRef(gameState);
  const catPosRef = useRef(catPos);
  const miceRef = useRef(mice);
  const scoreRef = useRef(score);
  const mapRef = useRef(map);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  gameStateRef.current = gameState;
  catPosRef.current = catPos;
  miceRef.current = mice;
  scoreRef.current = score;
  mapRef.current = map;

  const startGame = useCallback(() => {
    const newMap = generateMap();

    const startCat: Pos = {
      x: Math.floor(GRID_COLS / 2),
      y: Math.floor(GRID_ROWS / 2),
    };

    const newMice = spawnMice(newMap, startCat);

    setMap(newMap);
    setCatPos(startCat);
    setCatDir("right");
    setMice(newMice);
    setScore(0);
    setTimeLeft(60);
    setLevel(1);
    setGameState("playing");
  }, []);

  const moveCat = useCallback((dx: number, dy: number) => {
    if (gameStateRef.current !== "playing") return;

    const pos = catPosRef.current;
    const np = {
      x: pos.x + dx,
      y: pos.y + dy,
    };

    if (!isWalkable(mapRef.current, np)) return;

    if (dx > 0) setCatDir("right");
    if (dx < 0) setCatDir("left");

    setCatAnim(true);
    setTimeout(() => setCatAnim(false), 120);

    setCatPos(np);

    const caught = miceRef.current.filter(
      (m) => m.alive && m.pos.x === np.x && m.pos.y === np.y
    );

    if (caught.length > 0) {
      setCatchEffect(np);
      setTimeout(() => setCatchEffect(null), 500);

      const newScore = scoreRef.current + caught.length * 10;
      setScore(newScore);

      setMice((prev) =>
        prev.map((m) =>
          caught.find((c) => c.id === m.id)
            ? { ...m, alive: false }
            : m
        )
      );
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") moveCat(0, -1);
      if (e.key === "ArrowDown" || e.key === "s") moveCat(0, 1);
      if (e.key === "ArrowLeft" || e.key === "a") moveCat(-1, 0);
      if (e.key === "ArrowRight" || e.key === "d") moveCat(1, 0);

      if (e.key === "Escape") {
        setGameState((s) =>
          s === "playing"
            ? "paused"
            : s === "paused"
            ? "playing"
            : s
        );
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [moveCat]);

  useEffect(() => {
    if (gameState !== "playing") {
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
      return;
    }

    tickRef.current = setInterval(() => {
      setMice((prevMice) => {
        const occupied = new Set<string>();
        const catKey = posKey(catPosRef.current);

        occupied.add(catKey);

        return prevMice.map((m) => {
          if (!m.alive) return m;

          const moved = moveMouseRandom(
            m,
            mapRef.current,
            occupied
          );

          occupied.add(posKey(moved.pos));

          if (posKey(moved.pos) === catKey) {
            setCatchEffect(moved.pos);
            setTimeout(() => setCatchEffect(null), 500);
            setScore((s) => s + 10);

            return {
              ...moved,
              alive: false,
            };
          }

          return moved;
        });
      });

      setTimeLeft((t) => {
        if (t <= 1) {
          setGameState("gameover");
          return 0;
        }

        return t - 1;
      });
    }, TICK_INTERVAL);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "playing") return;

    const alive = mice.filter((m) => m.alive);

    if (mice.length > 0 && alive.length === 0) {
      setLevel((l) => l + 1);
      setTimeLeft((t) => Math.min(t + 15, 90));
      setMice(spawnMice(map, catPos));
    }
  }, [mice, gameState, map, catPos]);

  useEffect(() => {
    if (gameState === "gameover" && score > highScore) {
      setHighScore(score);

      try {
        localStorage.setItem(
          "cat_highscore",
          String(score)
        );
      } catch {}
    }
  }, [gameState, score, highScore]);

  const touchStart = useRef<{ x: number; y: number } | null>(
    null
  );

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];

    touchStart.current = {
      x: t.clientX,
      y: t.clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const t = e.changedTouches[0];

    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;

    touchStart.current = null;

    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (adx < 10 && ady < 10) return;

    if (adx > ady) {
      moveCat(dx > 0 ? 1 : -1, 0);
    } else {
      moveCat(0, dy > 0 ? 1 : -1);
    }
  };

  const cellW = CELL_SIZE;
  const cellH = CELL_SIZE;
  const boardW = GRID_COLS * cellW;
  const boardH = GRID_ROWS * cellH;

  return (
    <div
      className="min-h-dvh bg-background flex flex-col items-center justify-start overflow-hidden"
      style={{ userSelect: "none" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {gameState === "menu" && (
        <div className="flex flex-col items-center justify-center min-h-dvh gap-6 px-6 text-center">
          <div className="text-7xl animate-bounce">ًںگ±</div>

          <h1 className="text-3xl font-bold text-primary tracking-tight">
            ع¯ط±ط¨ظ‡ ط´ع©ط§ط±ع†غŒ
          </h1>

          <p className="text-secondary text-sm leading-relaxed max-w-xs">
            ع¯ط±ط¨ظ‡ ط±ط§ ط­ط±ع©طھ ط¨ط¯ظ‡ ظˆ ظ…ظˆط´â€Œظ‡ط§ ط±ط§ ظ‚ط¨ظ„ ط§ط² ط§طھظ…ط§ظ… ظˆظ‚طھ ط¨ع¯غŒط±!
            ظ‡ط± ظ…ظˆط´ = غ±غ° ط§ظ…طھغŒط§ط²
          </p>

          <div className="flex flex-col gap-2 text-sm text-secondary">
            <div className="flex items-center gap-2">
              <span>ًںگ­</span>
              <span>ظ…ظˆط´: ط¨ط±ظˆ ط¨ع¯غŒط±ط´!</span>
            </div>

            <div className="flex items-center gap-2">
              <span>ًںŒ³</span>
              <span>ط¯ط±ط®طھ ظˆ ط³ظ†ع¯: ظ…ط§ظ†ط¹</span>
            </div>

            <div className="flex items-center gap-2">
              <span>ًں’§</span>
              <span>ط¢ط¨: ط±ط¯ ظ†ظ…غŒâ€Œط´ظˆغŒ</span>
            </div>
          </div>

          {highScore > 0 && (
            <div className="text-accent font-semibold text-sm">
              ًںڈ† ط¨ظ‡طھط±غŒظ† ط§ظ…طھغŒط§ط²: {highScore}
            </div>
          )}

          <button
            onClick={startGame}
            className="mt-2 px-8 py-3 rounded-lg bg-accent text-accent-fg font-semibold text-lg cursor-pointer hover:bg-accent-hover transition-colors"
          >
            ط´ط±ظˆط¹ ط¨ط§ط²غŒ ًںژ®
          </button>

          <p className="text-secondary text-xs mt-2">
            ع©غŒط¨ظˆط±ط¯: ظپظ„ط´â€Œظ‡ط§ غŒط§ WASD | ظ…ظˆط¨ط§غŒظ„: ط³ظˆط§غŒظ¾
          </p>
        </div>
      )}

      {(gameState === "playing" || gameState === "paused") && (
        <div className="flex flex-col items-center w-full">
          <div
            className="w-full flex items-center justify-between px-3 py-2 bg-raised border-b border-border"
            style={{ maxWidth: boardW + 8 }}
          >
            <div className="flex flex-col items-start">
              <span className="text-xs text-secondary">ط§ظ…طھغŒط§ط²</span>
              <span className="text-xl font-bold text-primary">
                {score}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-xs text-secondary">
                ط³ط·ط­ {level}
              </span>
              <span className="text-2xl">ًںگ±</span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-xs text-secondary">ط²ظ…ط§ظ†</span>
              <span
                className={`text-xl font-bold tabular-nums ${
                  timeLeft <= 10
                    ? "text-error"
                    : "text-primary"
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          </div>

          <div
            className="relative overflow-hidden border border-border"
            style={{
              width: boardW,
              height: boardH,
            }}
          >
            {map.map((row, ry) =>
              row.map((tile, rx) => (
                <div
                  key={`${rx},${ry}`}
                  className="absolute flex items-center justify-center text-base"
                  style={{
                    left: rx * cellW,
                    top: ry * cellH,
                    width: cellW,
                    height: cellH,
                    background:
                      tile === TILE.POND
                        ? "var(--color-info-weak)"
                        : (rx + ry) % 2 === 0
                        ? "var(--color-background)"
                        : "var(--color-inset)",
                    fontSize:
                      tile === TILE.GRASS ||
                      tile === TILE.FLOWER
                        ? 16
                        : 20,
                  }}
                >
                  {tile !== TILE.GRASS
                    ? TILE_EMOJI[tile]
                    : ""}
                </div>
              ))
            )}

            {mice.map((m) =>
              m.alive ? (
                <div
                  key={m.id}
                  className="absolute flex items-center justify-center transition-all"
                  style={{
                    left: m.pos.x * cellW,
                    top: m.pos.y * cellH,
                    width: cellW,
                    height: cellH,
                    fontSize: 22,
                    transitionDuration: "120ms",
                    transform:
                      m.dx < 0 ? "scaleX(-1)" : "none",
                    zIndex: 5,
                  }}
                >
                  ًںگ­
                </div>
              ) : null
            )}

            <div
              className="absolute flex items-center justify-center transition-all"
              style={{
                left: catPos.x * cellW,
                top: catPos.y * cellH,
                width: cellW,
                height: cellH,
                fontSize: 26,
                transitionDuration: "120ms",
                transform:
                  catDir === "left"
                    ? "scaleX(-1)"
                    : "none",
                zIndex: 10,
                filter: catAnim
                  ? "brightness(1.3)"
                  : "none",
              }}
            >
              ًںگ±
            </div>

            {catchEffect && (
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  left: catchEffect.x * cellW,
                  top: catchEffect.y * cellH,
                  width: cellW,
                  height: cellH,
                  fontSize: 22,
                  zIndex: 20,
                  animation:
                    "popfade 0.5s ease-out forwards",
                }}
              >
                âœ¨
              </div>
            )}

            {gameState === "paused" && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-4"
                style={{
                  background: "rgba(0,0,0,0.5)",
                  zIndex: 30,
                }}
              >
                <span className="text-4xl">âڈ¸ï¸ڈ</span>

                <span className="text-accent-fg font-bold text-xl">
                  ظ…ع©ط«
                </span>

                <button
                  onClick={() =>
                    setGameState("playing")
                  }
                  className="px-6 py-2 rounded-lg bg-accent text-accent-fg font-semibold cursor-pointer"
                >
                  ط§ط¯ط§ظ…ظ‡
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col items-center gap-1">
            <button
              onPointerDown={() => moveCat(0, -1)}
              className="w-14 h-14 rounded-lg bg-raised border border-border text-2xl flex items-center justify-center cursor-pointer active:bg-inset"
            >
              â–²
            </button>

            <div className="flex gap-1">
              <button
                onPointerDown={() => moveCat(-1, 0)}
                className="w-14 h-14 rounded-lg bg-raised border border-border text-2xl flex items-center justify-center cursor-pointer active:bg-inset"
              >
                â—€
              </button>

              <button
                onPointerDown={() => moveCat(0, 1)}
                className="w-14 h-14 rounded-lg bg-raised border border-border text-2xl flex items-center justify-center cursor-pointer active:bg-inset"
              >
                â–¼
              </button>

              <button
                onPointerDown={() => moveCat(1, 0)}
                className="w-14 h-14 rounded-lg bg-raised border border-border text-2xl flex items-center justify-center cursor-pointer active:bg-inset"
              >
                â–¶
              </button>
            </div>
          </div>

          <button
            onClick={() =>
              setGameState((s) =>
                s === "playing" ? "paused" : "playing"
              )
            }
            className="mt-3 mb-4 text-sm text-secondary cursor-pointer underline"
          >
            {gameState === "playing"
              ? "ظ…ع©ط« âڈ¸ï¸ڈ"
              : "ط§ط¯ط§ظ…ظ‡ â–¶"}
          </button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="flex flex-col items-center justify-center min-h-dvh gap-5 px-6 text-center">
          <div className="text-6xl">ًںک؟</div>

          <h2 className="text-2xl font-bold text-primary">
            ط¨ط§ط²غŒ طھظ…ط§ظ… ط´ط¯!
          </h2>

          <div className="flex flex-col gap-2">
            <div className="text-4xl font-bold text-accent">
              {score}
            </div>

            <div className="text-secondary text-sm">
              ط§ظ…طھغŒط§ط²
            </div>
          </div>

          {score >= highScore && score > 0 && (
            <div className="flex items-center gap-2 text-warning font-semibold">
              ًںڈ† ط±ع©ظˆط±ط¯ ط¬ط¯غŒط¯!
            </div>
          )}

          <div className="text-secondary text-sm">
            ط¨ظ‡طھط±غŒظ†: {highScore}
          </div>

          <div className="text-secondary text-sm">
            ط³ط·ط­ ط±ط³غŒط¯غŒ ط¨ظ‡: {level}
          </div>

          <button
            onClick={startGame}
            className="mt-2 px-8 py-3 rounded-lg bg-accent text-accent-fg font-semibold text-lg cursor-pointer hover:bg-accent-hover transition-colors"
          >
            ط¯ظˆط¨ط§ط±ظ‡ ط¨ط§ط²غŒ ع©ظ† ًں”„
          </button>

          <button
            onClick={() => setGameState("menu")}
            className="text-secondary text-sm underline cursor-pointer"
          >
            ظ…ظ†ظˆغŒ ط§طµظ„غŒ
          </button>
        </div>
      )}

      <style>{`
        @keyframes popfade {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }

          60% {
            transform: scale(1.5);
            opacity: 1;
          }

          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
