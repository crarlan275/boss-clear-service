// Pure CSS sparkles — positions/delays are hardcoded for determinism (no hydration mismatch)

const SPARKLES = [
  { x: 5,  y: 8,  s: 2.5, d: 0    },
  { x: 12, y: 22, s: 1.5, d: 0.8  },
  { x: 20, y: 5,  s: 2,   d: 1.6  },
  { x: 28, y: 35, s: 1,   d: 2.4  },
  { x: 35, y: 15, s: 3,   d: 0.4  },
  { x: 42, y: 60, s: 1.5, d: 3.2  },
  { x: 50, y: 10, s: 2,   d: 1.2  },
  { x: 58, y: 42, s: 1,   d: 4.0  },
  { x: 65, y: 20, s: 2.5, d: 0.6  },
  { x: 72, y: 55, s: 1.5, d: 2.0  },
  { x: 80, y: 8,  s: 2,   d: 3.6  },
  { x: 88, y: 30, s: 1,   d: 1.0  },
  { x: 93, y: 70, s: 2.5, d: 4.4  },
  { x: 96, y: 15, s: 1.5, d: 2.8  },
  { x: 8,  y: 75, s: 2,   d: 0.2  },
  { x: 18, y: 88, s: 1,   d: 3.0  },
  { x: 30, y: 65, s: 3,   d: 1.4  },
  { x: 45, y: 80, s: 1.5, d: 4.2  },
  { x: 55, y: 90, s: 2,   d: 0.9  },
  { x: 70, y: 78, s: 1,   d: 2.5  },
  { x: 82, y: 92, s: 2.5, d: 1.8  },
  { x: 91, y: 50, s: 1.5, d: 3.8  },
  { x: 3,  y: 50, s: 2,   d: 2.2  },
  { x: 25, y: 48, s: 1,   d: 4.6  },
  { x: 48, y: 28, s: 2.5, d: 0.7  },
  { x: 60, y: 68, s: 1.5, d: 3.4  },
  { x: 75, y: 38, s: 2,   d: 1.1  },
  { x: 15, y: 55, s: 1,   d: 2.9  },
  { x: 38, y: 82, s: 2.5, d: 0.3  },
  { x: 85, y: 62, s: 1.5, d: 4.8  },
  // cross-shaped sparkles (4-point star)
  { x: 22, y: 18, s: 4,   d: 1.7, star: true },
  { x: 52, y: 45, s: 3.5, d: 3.1, star: true },
  { x: 78, y: 25, s: 4,   d: 0.5, star: true },
  { x: 10, y: 92, s: 3.5, d: 2.6, star: true },
  { x: 90, y: 85, s: 4,   d: 1.3, star: true },
]

export function SparkleBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Background base — smooth gradient, no pixelation */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,58,180,0.10) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 90% 100%, rgba(180,140,30,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 50% 35% at 5% 60%, rgba(30,80,160,0.05) 0%, transparent 60%)
          `,
        }}
      />

      {/* Sparkle dots */}
      {SPARKLES.map((sp, i) =>
        sp.star ? (
          <div
            key={i}
            className="sparkle-star"
            style={{
              left: `${sp.x}%`,
              top: `${sp.y}%`,
              animationDelay: `${sp.d}s`,
              width: sp.s * 2,
              height: sp.s * 2,
            }}
          />
        ) : (
          <div
            key={i}
            className="sparkle-dot"
            style={{
              left: `${sp.x}%`,
              top: `${sp.y}%`,
              animationDelay: `${sp.d}s`,
              width: sp.s,
              height: sp.s,
            }}
          />
        )
      )}
    </div>
  )
}
