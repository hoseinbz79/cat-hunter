, zIndex: 20,  
              animation: "popfade 0.5s ease-out forwards",  
            }}  
          >✨</div>  
        )}  

        {gameState === "paused" && (  
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4"  
            style={{ background: "rgba(0,0,0,0.5)", zIndex: 30 }}  
          >  
            <span className="text-4xl">⏸️</span>  
            <span className="text-accent-fg font-bold text-xl">مکث</span>  
            <button onClick={() => setGameState("playing")}  
              className="px-6 py-2 rounded-lg bg-accent text-accent-fg font-semibold cursor-pointer"  
            >ادامه</button>  
          </div>  
        )}  
      </div>  

      <div className="mt-4 flex flex-col items-center gap-1">  
        <button onPointerDown={() => moveCat(0, -1)}  
          className="w-14 h-14 rounded-lg bg-raised border border-border text-2xl flex items-center justify-center cursor-pointer active:bg-inset"  
        >▲</button>  
        <div className="flex gap-1">  
          <button onPointerDown={() => moveCat(-1, 0)}  
            className="w-14 h-14 rounded-lg bg-raised border border-border text-2xl flex items-center justify-center cursor-pointer active:bg-inset"  
          >◀</button>  
          <button onPointerDown={() => moveCat(0, 1)}  
            className="w-14 h-14 rounded-lg bg-raised border border-border text-2xl flex items-center justify-center cursor-pointer active:bg-inset"  
          >▼</button>  
          <button onPointerDown={() => moveCat(1, 0)}  
            className="w-14 h-14 rounded-lg bg-raised border border-border text-2xl flex items-center justify-center cursor-pointer active:bg-inset"  
          >▶</button>  
        </div>  
      </div>  

      <button  
        onClick={() => setGameState((s) => (s === "playing" ? "paused" : "playing"))}  
        className="mt-3 mb-4 text-sm text-secondary cursor-pointer underline"  
      >  
        {gameState === "playing" ? "مکث ⏸" : "ادامه ▶"}  
      </button>  
    </div>  
  )}  

  {gameState === "gameover" && (  
    <div className="flex flex-col items-center justify-center min-h-dvh gap-5 px-6 text-center">  
      <div className="text-6xl">😿</div>  
      <h2 className="text-2xl font-bold text-primary">بازی تموم شد!</h2>  
      <div className="flex flex-col gap-2">  
        <div className="text-4xl font-bold text-accent">{score}</div>  
        <div className="text-secondary text-sm">امتیاز</div>  
      </div>  
      {score >= highScore && score > 0 && (  
        <div className="flex items-center gap-2 text-warning font-semibold">🏆 رکورد جدید!</div>  
      )}  
      <div className="text-secondary text-sm">بهترین: {highScore}</div>  
      <div className="text-secondary text-sm">سطح رسیدی به: {level}</div>  
      <button onClick={startGame}  
        className="mt-2 px-8 py-3 rounded-lg bg-accent text-accent-fg font-semibold text-lg cursor-pointer hover:bg-accent-hover transition-colors"  
      >دوباره بازی کن 🔄</button>  
      <button onClick={() => setGameState("menu")}  
        className="text-secondary text-sm underline cursor-pointer"  
      >منو اصلی</button>  
    </div>  
  )}  

  <style>{`  
    @keyframes popfade {  
      0% { transform: scale(0.5); opacity: 1; }  
      60% { transform: scale(1.5); opacity: 1; }  
      100% { transform: scale(1.8); opacity: 0; }  
    }  
  `}</style>  
</div>

);
}
