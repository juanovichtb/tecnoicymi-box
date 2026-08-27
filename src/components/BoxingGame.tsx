import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, RotateCcw, Play } from 'lucide-react';
import { Fighter, Particle, Cloud, Spectator, MatchStatus } from '../types';
import { audio } from '../utils/audio';
import {
  PALETTE,
  drawCloud,
  drawHorizon,
  drawCrowd,
  drawReferee,
  drawRing,
  drawGround,
  drawFighter,
  drawParticles,
} from '../utils/pixelRenderer';

const HIGH_SCORE_KEY = 'tecnoicymi_dino_boxing_hi';
const DEFAULT_ROUND_TIME = 60; // 60 seconds per round
const ROUND_OPTIONS = [3, 5, 7, 10] as const;
const COUNT_FRAME_INTERVAL = 16; // ~0.26s per count tick (total 10-count = ~2.6 seconds)

export const BoxingGame: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Match configuration & state
  const [totalRounds, setTotalRounds] = useState<number>(3);

  // UI state for score and status
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) : 1500;
    } catch {
      return 1500;
    }
  });
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('ready');
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_ROUND_TIME);
  const [playerHp, setPlayerHp] = useState(100);
  const [rivalHp, setRivalHp] = useState(100);
  const [commentary, setCommentary] = useState('¡PULSA ESPACIO O ENTRA AL RING!');
  const [playerScoreRounds, setPlayerScoreRounds] = useState(0);
  const [rivalScoreRounds, setRivalScoreRounds] = useState(0);

  // Mutable Game Loop State (refs to avoid React closure lag in 60fps loop)
  const gameStateRef = useRef({
    status: 'ready' as MatchStatus,
    round: 1,
    totalRounds: 3,
    timeRemaining: DEFAULT_ROUND_TIME,
    score: 0,
    highScore: 1500,
    roundIntroStage: 'none' as 'none' | 'round' | 'fight',
    roundIntroTimer: 0,
    roundBreakTimer: 0,
    commentaryText: '¡PULSA ESPACIO O ENTRA AL RING!',
    commentaryTimer: 0,
    groundScroll: 0,
    spectatorCheerTimer: 0,
    particles: [] as Particle[],
    clouds: [] as Cloud[],
    spectators: [] as Spectator[],
    referee: {
      x: 0,
      count: 0,
      countTimer: 0,
      state: 'idle' as 'idle' | 'counting' | 'break' | 'declare',
      animFrame: 0,
    },
    player: {
      x: 0,
      y: 0,
      width: 24,
      height: 36,
      facing: 1 as 1 | -1,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      state: 'idle',
      stateTimer: 0,
      animFrame: 0,
      animTimer: 0,
      isAI: false,
      score: 0,
      roundsWon: 0,
      hitRegistered: false,
      velocity: 0,
      hurtRecovery: 0,
      name: 'TÚ',
      colorTheme: {
        primary: PALETTE.charcoal,
        secondary: PALETTE.white,
        gloves: PALETTE.playerRed,
        skin: PALETTE.grayDark,
        shorts: PALETTE.charcoal,
      },
    } as Fighter,
    rival: {
      x: 0,
      y: 0,
      width: 24,
      height: 36,
      facing: -1 as 1 | -1,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      state: 'idle',
      stateTimer: 0,
      animFrame: 0,
      animTimer: 0,
      isAI: true,
      score: 0,
      roundsWon: 0,
      hitRegistered: false,
      velocity: 0,
      hurtRecovery: 0,
      name: 'RIVAL',
      colorTheme: {
        primary: PALETTE.grayDark,
        secondary: PALETTE.white,
        gloves: PALETTE.rivalBlue,
        skin: PALETTE.grayDark,
        shorts: PALETTE.grayDark,
      },
    } as Fighter,
    aiCooldown: 0,
    keys: {
      left: false,
      right: false,
      jab: false,
      cross: false,
      block: false,
      dodge: false,
    },
    ringBounds: {
      left: 100,
      right: 700,
    },
  });

  // Toggle Sound
  const toggleSound = () => {
    const next = audio.toggleSound();
    setSoundEnabled(next);
  };

  // Add Commentator text popup
  const setGameCommentary = useCallback((text: string) => {
    gameStateRef.current.commentaryText = text;
    gameStateRef.current.commentaryTimer = 140;
    setCommentary(text);
  }, []);

  // Spawn visual impact sparks / text
  const spawnHitParticles = useCallback(
    (x: number, y: number, text?: string, color: string = PALETTE.charcoal) => {
      const g = gameStateRef.current;
      if (text) {
        g.particles.push({
          x,
          y: y - 10,
          vx: 0,
          vy: -0.8,
          life: 45,
          maxLife: 45,
          color,
          size: 0,
          text,
        });
      }

      // Spark particles
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2.5;
        g.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 20 + Math.random() * 10,
          maxLife: 30,
          color: Math.random() > 0.5 ? PALETTE.charcoal : PALETTE.grayMid,
          size: 2 + Math.floor(Math.random() * 2),
        });
      }
    },
    []
  );

  // Initialize Clouds, Crowd and Positions
  const initEnvironment = useCallback((width: number) => {
    const g = gameStateRef.current;
    const ringW = Math.min(width * 0.75, 540);
    const ringLeft = Math.max(20, (width - ringW) / 2);
    const ringRight = ringLeft + ringW;

    g.ringBounds = { left: ringLeft, right: ringRight };

    // Initial Fighter positions
    g.player.x = ringLeft + ringW * 0.32;
    g.rival.x = ringLeft + ringW * 0.68;
    g.referee.x = ringLeft + ringW * 0.5;

    // Clouds
    g.clouds = [
      { x: width * 0.15, y: 22, speed: 0.15, width: 48, height: 16 },
      { x: width * 0.55, y: 38, speed: 0.22, width: 48, height: 16 },
      { x: width * 0.85, y: 18, speed: 0.18, width: 48, height: 16 },
    ];

    // Crowd Spectators
    const spectators: Spectator[] = [];
    const crowdSpacing = 22;
    for (let cx = ringLeft - 40; cx <= ringRight + 40; cx += crowdSpacing) {
      spectators.push({
        x: cx + (Math.random() * 6 - 3),
        offsetY: Math.floor(Math.random() * 4),
        cheering: false,
        type: Math.floor(Math.random() * 3),
      });
    }
    g.spectators = spectators;
  }, []);

  // Start new game or match
  const startMatch = useCallback((overrideRounds?: number) => {
    const g = gameStateRef.current;
    const numRounds = overrideRounds ?? totalRounds;
    g.totalRounds = numRounds;
    g.status = 'round_intro';
    g.round = 1;
    g.timeRemaining = DEFAULT_ROUND_TIME;
    g.score = 0;
    g.roundIntroStage = 'round';
    g.roundIntroTimer = 65; // ~1.1s banner duration
    g.roundBreakTimer = 0;
    g.player.health = 100;
    g.player.stamina = 100;
    g.player.state = 'idle';
    g.player.roundsWon = 0;
    g.rival.health = 100;
    g.rival.stamina = 100;
    g.rival.state = 'idle';
    g.rival.roundsWon = 0;
    g.referee.state = 'idle';
    g.referee.count = 0;

    const ringW = g.ringBounds.right - g.ringBounds.left;
    g.player.x = g.ringBounds.left + ringW * 0.32;
    g.rival.x = g.ringBounds.left + ringW * 0.68;

    setMatchStatus('round_intro');
    setRound(1);
    setTimeLeft(DEFAULT_ROUND_TIME);
    setScore(0);
    setPlayerHp(100);
    setRivalHp(100);
    setPlayerScoreRounds(0);
    setRivalScoreRounds(0);

    const isFinalRound = 1 === numRounds;
    setGameCommentary(isFinalRound ? '¡FINAL ROUND!' : `¡ROUND 1 / ${numRounds}!`);
  }, [totalRounds, setGameCommentary]);

  // Start next round (with health & stamina fully restored!)
  const startNextRound = useCallback(() => {
    const g = gameStateRef.current;
    const nextRound = g.round + 1;
    g.round = nextRound;
    g.timeRemaining = DEFAULT_ROUND_TIME;
    g.status = 'round_intro';
    g.roundIntroStage = 'round';
    g.roundIntroTimer = 65;
    g.roundBreakTimer = 0;
    g.player.health = 100;
    g.player.stamina = 100;
    g.player.state = 'idle';
    g.rival.health = 100;
    g.rival.stamina = 100;
    g.rival.state = 'idle';
    g.referee.state = 'idle';
    g.referee.count = 0;

    const ringW = g.ringBounds.right - g.ringBounds.left;
    g.player.x = g.ringBounds.left + ringW * 0.32;
    g.rival.x = g.ringBounds.left + ringW * 0.68;

    setMatchStatus('round_intro');
    setRound(nextRound);
    setTimeLeft(DEFAULT_ROUND_TIME);
    setPlayerHp(100);
    setRivalHp(100);

    const isFinalRound = nextRound === g.totalRounds;
    setGameCommentary(isFinalRound ? '¡FINAL ROUND!' : `¡ROUND ${nextRound} / ${g.totalRounds}!`);
  }, [setGameCommentary]);

  // Handle Player Action Input
  const triggerPlayerAction = useCallback(
    (action: 'left_down' | 'left_up' | 'right_down' | 'right_up' | 'jab' | 'cross' | 'block_down' | 'block_up' | 'dodge') => {
      const g = gameStateRef.current;
      if (
        g.status === 'ready' ||
        g.status === 'match_win' ||
        g.status === 'match_loss' ||
        g.status === 'match_draw' ||
        g.status === 'ko_win' ||
        g.status === 'ko_loss'
      ) {
        if (action === 'jab' || action === 'cross' || action === 'dodge') {
          startMatch();
          return;
        }
      }

      if (g.status !== 'fighting') return;
      const p = g.player;
      if (p.state === 'hurt' || p.state === 'down' || p.state === 'win') return;

      switch (action) {
        case 'left_down':
          g.keys.left = true;
          break;
        case 'left_up':
          g.keys.left = false;
          break;
        case 'right_down':
          g.keys.right = true;
          break;
        case 'right_up':
          g.keys.right = false;
          break;
        case 'block_down':
          g.keys.block = true;
          p.state = 'block';
          p.animFrame = 0;
          break;
        case 'block_up':
          g.keys.block = false;
          if (p.state === 'block') p.state = 'idle';
          break;
        case 'jab':
          if (p.state !== 'jab' && p.state !== 'cross' && p.stamina >= 10) {
            p.state = 'jab';
            p.stateTimer = 0;
            p.animFrame = 0;
            p.animTimer = 0;
            p.hitRegistered = false;
            p.stamina = Math.max(0, p.stamina - 10);
            audio.playJab();
          }
          break;
        case 'cross':
          if (p.state !== 'jab' && p.state !== 'cross' && p.stamina >= 18) {
            p.state = 'cross';
            p.stateTimer = 0;
            p.animFrame = 0;
            p.animTimer = 0;
            p.hitRegistered = false;
            p.stamina = Math.max(0, p.stamina - 18);
            audio.playCross();
          }
          break;
        case 'dodge':
          if (p.state !== 'dodge' && p.stamina >= 12) {
            p.state = 'dodge';
            p.stateTimer = 0;
            p.animFrame = 0;
            p.animTimer = 0;
            p.stamina = Math.max(0, p.stamina - 12);
            audio.playDodge();
            setGameCommentary('¡ESQUIVA VELOZ!');
          }
          break;
      }
    },
    [startMatch, setGameCommentary]
  );

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling on arrow keys & space during game
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code) || e.key === ' ') {
        e.preventDefault();
      }

      if (e.repeat) return;
      const key = e.key ? e.key.toLowerCase() : '';

      if (e.code === 'ArrowLeft') {
        triggerPlayerAction('left_down');
      } else if (e.code === 'ArrowRight') {
        triggerPlayerAction('right_down');
      } else if (e.code === 'KeyA' || key === 'a') {
        // A -> Left Jab
        triggerPlayerAction('jab');
      } else if (e.code === 'KeyD' || key === 'd') {
        // D -> Right Jab (Cross)
        triggerPlayerAction('cross');
      } else if (e.code === 'KeyS' || key === 's' || e.code === 'ArrowDown') {
        // S / Down -> Block Guard
        triggerPlayerAction('block_down');
      } else if (e.code === 'Space' || key === ' ' || e.code === 'ArrowUp' || e.code === 'KeyW' || key === 'w') {
        // Space / Up / W -> Dodge / Duck
        triggerPlayerAction('dodge');
      } else if (e.code === 'KeyJ' || key === 'j') {
        triggerPlayerAction('jab');
      } else if (e.code === 'KeyK' || key === 'k') {
        triggerPlayerAction('cross');
      } else if (e.code === 'Enter' || key === 'enter') {
        if (gameStateRef.current.status !== 'fighting') {
          startMatch();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key ? e.key.toLowerCase() : '';
      if (e.code === 'ArrowLeft') {
        triggerPlayerAction('left_up');
      } else if (e.code === 'ArrowRight') {
        triggerPlayerAction('right_up');
      } else if (e.code === 'KeyS' || key === 's' || e.code === 'ArrowDown') {
        triggerPlayerAction('block_up');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerPlayerAction, startMatch]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastSecondTime = Date.now();

    // Canvas Resize Observer
    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(rect.width);
      canvas.height = 240; // Fixed crisp 240px stage height

      initEnvironment(canvas.width);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // AI Logic Tick
    const updateAI = (ai: Fighter, player: Fighter, roundNum: number) => {
      const g = gameStateRef.current;
      if (ai.state === 'hurt' || ai.state === 'down' || ai.state === 'win') return;

      const dist = Math.abs(ai.x - player.x);
      g.aiCooldown--;

      // Regenerate stamina
      if (ai.stamina < ai.maxStamina) {
        ai.stamina += 0.3;
      }

      // AI distance management
      const idealDist = 58;
      if (g.aiCooldown <= 0) {
        const rand = Math.random();

        // Counter-block if player is punching
        if ((player.state === 'jab' || player.state === 'cross') && dist < 70 && rand < 0.45) {
          ai.state = 'block';
          ai.stateTimer = 18;
          g.aiCooldown = 22;
          return;
        }

        // Dodge if player throws heavy cross
        if (player.state === 'cross' && dist < 65 && rand < 0.35 + roundNum * 0.1) {
          ai.state = 'dodge';
          ai.stateTimer = 18;
          ai.animFrame = 0;
          g.aiCooldown = 25;
          audio.playDodge();
          return;
        }

        // Close in if too far
        if (dist > idealDist + 20) {
          ai.state = 'walk_fwd';
          ai.x = Math.max(g.ringBounds.left + 20, ai.x - (1.2 + roundNum * 0.2));
        } else if (dist < idealDist - 15) {
          // Back up if crowded
          ai.state = 'walk_bwd';
          ai.x = Math.min(g.ringBounds.right - 20, ai.x + (1.1 + roundNum * 0.1));
        } else {
          // In range -> Attack!
          if (rand < 0.38 && ai.stamina >= 15) {
            // Throw Jab
            ai.state = 'jab';
            ai.stateTimer = 0;
            ai.animFrame = 0;
            ai.animTimer = 0;
            ai.hitRegistered = false;
            ai.stamina -= 12;
            g.aiCooldown = 28 - roundNum * 4;
            audio.playJab();
          } else if (rand < 0.65 && ai.stamina >= 22) {
            // Throw Cross
            ai.state = 'cross';
            ai.stateTimer = 0;
            ai.animFrame = 0;
            ai.animTimer = 0;
            ai.hitRegistered = false;
            ai.stamina -= 20;
            g.aiCooldown = 36 - roundNum * 4;
            audio.playJab();
          } else {
            ai.state = 'idle';
          }
        }
      }
    };

    // Update Single Fighter Animation and Collision
    const updateFighter = (f: Fighter, opponent: Fighter, isAI: boolean) => {
      const g = gameStateRef.current;
      f.animTimer++;

      // Velocity knockback physics
      if (Math.abs(f.velocity) > 0.1) {
        f.x += f.velocity;
        f.velocity *= 0.82;
        // Clamp to ring
        f.x = Math.max(g.ringBounds.left + 16, Math.min(g.ringBounds.right - 16, f.x));
      }

      // Stamina regeneration
      if (!isAI && f.stamina < f.maxStamina) {
        f.stamina += 0.35;
      }

      // State timer & animation progression
      f.stateTimer++;

      switch (f.state) {
        case 'walk_fwd':
        case 'walk_bwd':
          if (f.animTimer % 8 === 0) {
            f.animFrame = (f.animFrame + 1) % 2;
          }
          break;

        case 'idle':
          if (f.animTimer % 14 === 0) {
            f.animFrame = (f.animFrame + 1) % 2;
          }
          break;

        case 'jab':
          // Frame 0: Windup (0-4), Frame 1: Extended Punch (5-10), Frame 2: Retract (11-16)
          if (f.stateTimer < 5) f.animFrame = 0;
          else if (f.stateTimer < 11) f.animFrame = 1;
          else if (f.stateTimer < 17) f.animFrame = 2;
          else {
            f.state = 'idle';
            f.animFrame = 0;
          }

          // Check hit registration during frame 1
          if (f.animFrame === 1 && !f.hitRegistered) {
            checkHit(f, opponent, 14, false);
            f.hitRegistered = true;
          }
          break;

        case 'cross':
          // Frame 0: Windup (0-6), Frame 1: Power Blast (7-15), Frame 2: Retract (16-22)
          if (f.stateTimer < 6) f.animFrame = 0;
          else if (f.stateTimer < 15) f.animFrame = 1;
          else if (f.stateTimer < 23) f.animFrame = 2;
          else {
            f.state = 'idle';
            f.animFrame = 0;
          }

          // Check hit registration during frame 1
          if (f.animFrame === 1 && !f.hitRegistered) {
            checkHit(f, opponent, 26, true);
            f.hitRegistered = true;
          }
          break;

        case 'dodge':
          if (f.stateTimer < 18) {
            f.animFrame = 0;
          } else {
            f.state = 'idle';
            f.animFrame = 0;
          }
          break;

        case 'block':
          f.animFrame = 0;
          if (isAI && f.stateTimer > 20) {
            f.state = 'idle';
          }
          break;

        case 'hurt':
          f.hurtRecovery++;
          if (f.stateTimer > 18) {
            f.state = 'idle';
            f.animFrame = 0;
            f.hurtRecovery = 0;
          }
          break;

        case 'down':
          // Stay down until count
          f.animFrame = 0;
          break;

        case 'win':
          if (f.animTimer % 12 === 0) {
            f.animFrame = (f.animFrame + 1) % 2;
          }
          break;
      }
    };

    // Hit Registration & Damage Evaluation
    const checkHit = (attacker: Fighter, defender: Fighter, baseDmg: number, isHeavy: boolean) => {
      const g = gameStateRef.current;
      const dist = Math.abs(attacker.x - defender.x);
      const reach = isHeavy ? 68 : 60;

      if (dist > reach) return; // Whiff / miss

      const hitX = defender.x;
      const hitY = canvas.height - 76;

      // 1. Check if defender is dodging
      if (defender.state === 'dodge') {
        audio.playDodge();
        spawnHitParticles(hitX, hitY, 'DODGE!', PALETTE.grayMid);
        setGameCommentary('¡ESQUIVA PERFECTA!');
        return;
      }

      // 2. Check if defender is blocking
      if (defender.state === 'block') {
        const chipDmg = Math.floor(baseDmg * 0.2);
        defender.health = Math.max(0, defender.health - chipDmg);
        defender.stamina = Math.max(0, defender.stamina - 15);
        defender.velocity = attacker.facing * 1.5;

        audio.playBlock();
        spawnHitParticles(hitX, hitY, 'BLOCK!', PALETTE.grayDark);
        setGameCommentary('¡GOLPE BLOQUEADO!');

        if (!attacker.isAI) {
          g.score += 25;
          setScore(g.score);
        }
        return;
      }

      // 3. Clean hit landed!
      const isCritical = isHeavy && Math.random() < 0.35;
      const finalDmg = isCritical ? Math.floor(baseDmg * 1.5) : baseDmg;
      defender.health = Math.max(0, defender.health - finalDmg);

      // Knockback and hurt state
      defender.state = 'hurt';
      defender.stateTimer = 0;
      defender.hurtRecovery = 0;
      defender.velocity = attacker.facing * (isHeavy ? 4.5 : 2.5);

      // Spectator cheering
      g.spectators.forEach((s) => (s.cheering = true));
      g.spectatorCheerTimer = 35;

      audio.playHit(isHeavy);

      const hitLabel = isCritical ? '+250 CRÍTICO!' : isHeavy ? '+150 DERECHA!' : '+75 JAB!';
      spawnHitParticles(hitX, hitY, hitLabel, isCritical ? PALETTE.playerRed : PALETTE.charcoal);

      if (!attacker.isAI) {
        const gainedScore = isCritical ? 250 : isHeavy ? 150 : 75;
        g.score += gainedScore;
        setScore(g.score);

        // High score record check
        if (g.score > g.highScore) {
          g.highScore = g.score;
          setHighScore(g.score);
          try {
            localStorage.setItem(HIGH_SCORE_KEY, g.score.toString());
          } catch {}
        }
      }

      // Commentary variety
      if (isHeavy) {
        setGameCommentary(isCritical ? '¡TREMENDO IMPACTO CRÍTICO!' : '¡DERECHAZO DIRECTO!');
      } else {
        setGameCommentary('¡JAB RÁPIDO Y EFECTIVO!');
      }

      // Check Knockdown
      if (defender.health <= 0) {
        handleKnockdown(defender, attacker);
      }
    };

    // Knockdown Sequence
    const handleKnockdown = (downFighter: Fighter, winnerFighter: Fighter) => {
      const g = gameStateRef.current;
      g.status = 'knockdown';
      setMatchStatus('knockdown');
      downFighter.state = 'down';
      downFighter.stateTimer = 0;
      winnerFighter.state = 'win';

      g.referee.state = 'counting';
      g.referee.count = 0;
      g.referee.countTimer = 0;
      g.referee.x = downFighter.x - downFighter.facing * 35;

      audio.playHit(true);
      setGameCommentary(`¡${downFighter.name} ESTÁ EN LA LONA!`);
    };

    // Evaluate Round End by Decision
    const endRoundByDecision = () => {
      const g = gameStateRef.current;
      audio.playBell();

      const pWon = g.player.health >= g.rival.health;
      if (pWon) {
        g.player.roundsWon++;
        setPlayerScoreRounds(g.player.roundsWon);
        setGameCommentary(`¡ROUND ${g.round} GANADO POR DECISIÓN!`);
      } else {
        g.rival.roundsWon++;
        setRivalScoreRounds(g.rival.roundsWon);
        setGameCommentary(`¡ROUND ${g.round} PARA EL RIVAL!`);
      }

      const winsRequired = Math.floor(g.totalRounds / 2) + 1;
      const playerReachedTarget = g.player.roundsWon >= winsRequired;
      const rivalReachedTarget = g.rival.roundsWon >= winsRequired;
      const allRoundsCompleted = g.round >= g.totalRounds;

      if (playerReachedTarget || rivalReachedTarget || allRoundsCompleted) {
        // Match Finished!
        if (g.player.roundsWon > g.rival.roundsWon) {
          g.status = 'match_win';
          setMatchStatus('match_win');
          g.player.state = 'win';
          g.rival.state = 'idle';
          g.referee.state = 'declare';
          audio.playKnockout(true);
          setGameCommentary('¡CAMPEÓN TECNOICYMI! ¡VICTORIA TOTAL!');
        } else if (g.rival.roundsWon > g.player.roundsWon) {
          g.status = 'match_loss';
          setMatchStatus('match_loss');
          g.player.state = 'idle';
          g.rival.state = 'win';
          g.referee.state = 'declare';
          audio.playKnockout(false);
          setGameCommentary('¡DERROTA POR PUNTOS! ¡PULSA REVANCHA!');
        } else {
          // DRAW (e.g. 5-5 in 10 rounds or equal round wins)
          g.status = 'match_draw';
          setMatchStatus('match_draw');
          g.player.state = 'idle';
          g.rival.state = 'idle';
          g.referee.state = 'declare';
          audio.playBell();
          setGameCommentary('¡EMPATE! ¡COMBATE MUY IGUALADO!');
        }
      } else {
        // Short round break transition (~2.5 seconds)
        g.status = 'round_break';
        g.roundBreakTimer = 150;
        setMatchStatus('round_break');
      }
    };

    // Draw In-Canvas Retro Pixel Round Banne
    const drawBanner = (mainText: string, subText?: string) => {
      ctx.save();
      const bannerW = Math.min(canvas.width * 0.8, 300);
      const bannerH = subText ? 48 : 38;
      const bx = (canvas.width - bannerW) / 2;
      const by = 44;

      // Chrome Dino style blocky banner
      ctx.fillStyle = PALETTE.charcoal;
      ctx.fillRect(bx, by, bannerW, bannerH);
      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(bx + 2, by + 2, bannerW - 4, bannerH - 4);
      ctx.fillStyle = PALETTE.charcoal;
      ctx.fillRect(bx + 4, by + 4, bannerW - 8, bannerH - 8);

      ctx.fillStyle = PALETTE.white;
      ctx.font = 'bold 13px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mainText, canvas.width / 2, subText ? by + 18 : by + bannerH / 2);

      if (subText) {
        ctx.fillStyle = PALETTE.grayLight;
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText(subText, canvas.width / 2, by + 34);
      }
      ctx.restore();
    };

    // Main Animation Render Loop
    const loop = () => {
      const g = gameStateRef.current;
      const width = canvas.width;
      const height = canvas.height;
      const groundY = height - 42;

      // 1. Clear Canvas with clean Dino off-white
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(0, 0, width, height);

      // 2. Update Ground Drift & Clouds
      g.groundScroll += 0.25;
      g.clouds.forEach((c) => {
        c.x -= c.speed;
        if (c.x + c.width < 0) {
          c.x = width + Math.random() * 80;
        }
        drawCloud(ctx, c);
      });

      // 3. Draw Distant Minimalist Horizon
      drawHorizon(ctx, width, groundY);

      // 4. Update & Draw Crowd
      if (g.spectatorCheerTimer > 0) {
        g.spectatorCheerTimer--;
        if (g.spectatorCheerTimer === 0) {
          g.spectators.forEach((s) => (s.cheering = false));
        }
      }
      drawCrowd(ctx, g.spectators, groundY, g.ringBounds.left, g.ringBounds.right);

      // 5. Draw Referee
      drawReferee(ctx, g.referee.x, groundY, g.referee);

      // 6. Draw Boxing Ring
      drawRing(ctx, groundY, g.ringBounds.left, g.ringBounds.right);

      // 7. Process Game Logic by Status
      if (g.status === 'round_intro') {
        // Intro countdown: "ROUND X" (1s) -> "FIGHT!" (0.8s) -> active combat
        g.roundIntroTimer--;
        if (g.roundIntroTimer <= 0) {
          if (g.roundIntroStage === 'round') {
            g.roundIntroStage = 'fight';
            g.roundIntroTimer = 45; // ~0.75s
            audio.playBell();
            setGameCommentary('¡FIGHT! ¡A PELEAR!');
          } else if (g.roundIntroStage === 'fight') {
            g.roundIntroStage = 'none';
            g.status = 'fighting';
            setMatchStatus('fighting');
            lastSecondTime = Date.now();
          }
        }
      } else if (g.status === 'round_break') {
        // Transition between rounds (~2.5 seconds)
        g.roundBreakTimer--;
        if (g.roundBreakTimer <= 0) {
          startNextRound();
        }
      } else if (g.status === 'fighting') {
        // Player keyboard horizontal movement
        if (g.player.state === 'idle' || g.player.state === 'walk_fwd' || g.player.state === 'walk_bwd') {
          if (g.keys.left) {
            g.player.state = 'walk_bwd';
            g.player.x = Math.max(g.ringBounds.left + 16, g.player.x - 1.8);
          } else if (g.keys.right) {
            g.player.state = 'walk_fwd';
            // Don't walk through opponent
            if (g.player.x + 28 < g.rival.x) {
              g.player.x += 1.8;
            }
          } else {
            g.player.state = 'idle';
          }
        }

        // Update AI
        updateAI(g.rival, g.player, g.round);

        // Update Fighters
        updateFighter(g.player, g.rival, false);
        updateFighter(g.rival, g.player, true);

        // 1-second interval timer for 60 seconds
        const now = Date.now();
        if (now - lastSecondTime >= 1000) {
          lastSecondTime = now;
          if (g.timeRemaining > 0) {
            g.timeRemaining--;
            setTimeLeft(g.timeRemaining);

            // Small score tick for surviving active combat
            g.score += 2;
            setScore(g.score);

            if (g.timeRemaining === 0) {
              endRoundByDecision();
            }
          }
        }
      } else if (g.status === 'knockdown') {
        // Referee fast arcade 10-count progression (~0.26s per count, total ~2.6s)
        g.referee.countTimer++;
        if (g.referee.countTimer % COUNT_FRAME_INTERVAL === 0) {
          g.referee.count++;
          audio.playCount(g.referee.count);

          if (g.referee.count >= 10) {
            // KO Round Decided Immediately at 10!
            const playerWonRound = g.rival.health <= 0;
            if (playerWonRound) {
              g.player.roundsWon++;
              g.score += 1000;
              setScore(g.score);
              setPlayerScoreRounds(g.player.roundsWon);
            } else {
              g.rival.roundsWon++;
              setRivalScoreRounds(g.rival.roundsWon);
            }

            // Check if full match won
            const winsRequired = Math.floor(g.totalRounds / 2) + 1;
            const playerReachedTarget = g.player.roundsWon >= winsRequired;
            const rivalReachedTarget = g.rival.roundsWon >= winsRequired;
            const allRoundsCompleted = g.round >= g.totalRounds;

            if (playerReachedTarget || rivalReachedTarget || allRoundsCompleted) {
              if (g.player.roundsWon > g.rival.roundsWon) {
                g.status = 'match_win';
                setMatchStatus('match_win');
                g.player.state = 'win';
                g.rival.state = 'down';
                g.referee.state = 'declare';
                audio.playKnockout(true);
                setGameCommentary('¡VICTORIA TOTAL POR K.O.! ¡CAMPEÓN!');
              } else if (g.rival.roundsWon > g.player.roundsWon) {
                g.status = 'match_loss';
                setMatchStatus('match_loss');
                g.player.state = 'down';
                g.rival.state = 'win';
                g.referee.state = 'declare';
                audio.playKnockout(false);
                setGameCommentary('¡DERROTA POR K.O.! ¡PULSA REVANCHA!');
              } else {
                g.status = 'match_draw';
                setMatchStatus('match_draw');
                g.player.state = 'idle';
                g.rival.state = 'idle';
                g.referee.state = 'declare';
                audio.playBell();
                setGameCommentary('¡EMPATE!');
              }
            } else {
              // Still more rounds to fight! Short break (~2.5s)
              g.status = 'round_break';
              g.roundBreakTimer = 150;
              setMatchStatus('round_break');
              audio.playBell();
              setGameCommentary(
                playerWonRound ? `¡K.O.! ROUND ${g.round} PARA TÚ` : `¡K.O.! ROUND ${g.round} PARA EL RIVAL`
              );
            }
          }
        }
      }

      // Sync React health states
      setPlayerHp(Math.round(g.player.health));
      setRivalHp(Math.round(g.rival.health));

      // 8. Draw Fighters
      drawFighter(ctx, g.player, groundY);
      drawFighter(ctx, g.rival, groundY);

      // 9. Draw Floor line & Dino dots
      drawGround(ctx, width, groundY, g.groundScroll);

      // 10. Update & Draw Particles
      g.particles = g.particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        return p.life > 0;
      });
      drawParticles(ctx, g.particles);

      // 11. Draw Round Intro / Break In-Canvas Banners
      if (g.status === 'round_intro') {
        if (g.roundIntroStage === 'round') {
          const isFinal = g.round === g.totalRounds;
          const mainTitle = isFinal ? 'FINAL ROUND' : `ROUND ${g.round} / ${g.totalRounds}`;
          const subTitle = isFinal && g.player.roundsWon === g.rival.roundsWon
            ? `${g.player.roundsWon} - ${g.rival.roundsWon} EMPATE`
            : `MARCADOR: ${g.player.roundsWon} - ${g.rival.roundsWon}`;
          drawBanner(mainTitle, subTitle);
        } else if (g.roundIntroStage === 'fight') {
          drawBanner('FIGHT!');
        }
      } else if (g.status === 'round_break') {
        const pWonRound = g.player.health >= g.rival.health;
        const mainTitle = pWonRound ? `ROUND ${g.round}: TÚ` : `ROUND ${g.round}: RIVAL`;
        const subTitle = `MARCADOR: ${g.player.roundsWon} - ${g.rival.roundsWon}`;
        drawBanner(mainTitle, subTitle);
      }

      // Commentator timer countdown
      if (g.commentaryTimer > 0) {
        g.commentaryTimer--;
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [initEnvironment, spawnHitParticles, setGameCommentary, startNextRound]);

  // Format Dino-style scores (e.g. 000540)
  const formatDinoScore = (val: number) => {
    return val.toString().padStart(6, '0');
  };

  // Format timer (e.g. 1:00, 0:59, 0:00)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* 1. Ultra-Minimal Dino Top Bar (Score + Round + Timer + Audio) */}
      <div className="w-full max-w-4xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-pixel text-[#535353] border-b border-[#e0e0e0]">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#222222] tracking-wider">TECNOICYMI</span>
          <span className="text-[10px] text-[#777777] hidden sm:inline">BOXEO</span>
        </div>

        {/* Round & Timer */}
        <div className="flex items-center gap-3">
          <span className="bg-[#535353] text-[#f7f7f7] px-1.5 py-0.5 text-[10px] font-bold">
            {round === totalRounds ? `FINAL ROUND (${round}/${totalRounds})` : `ROUND ${round}/${totalRounds}`}
          </span>
          <span className="font-bold text-[#222222]">{formatTimer(timeLeft)}</span>
        </div>

        {/* Chrome Dino Score Counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[#888888] text-[10px]">HI {formatDinoScore(highScore)}</span>
            <span className="font-bold text-[#222222]">{formatDinoScore(score)}</span>
          </div>

          <button
            onClick={toggleSound}
            className="p-1 hover:text-[#222222] transition-colors cursor-pointer"
            title={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
            aria-label="Sonido"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>
        </div>
      </div>

      {/* 2. Fighter Health Segmented Indicators (Minimalist Dino Style) */}
      <div className="w-full max-w-4xl px-4 pt-2 flex items-center justify-between text-[11px] font-pixel">
        {/* Player Stats */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#222222]">TÚ</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-3 border border-[#535353] ${
                  i < Math.ceil(playerHp / 10) ? 'bg-[#222222]' : 'bg-[#e0e0e0]'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-[#777777]">{playerHp}%</span>
        </div>

        {/* Rounds won dots */}
        <div className="flex items-center gap-2 text-xs font-bold text-[#222222] bg-[#e0e0e0] px-2 py-0.5 border border-[#cccccc]">
          <span>{playerScoreRounds}</span>
          <span className="text-[#888888]">-</span>
          <span>{rivalScoreRounds}</span>
        </div>

        {/* Rival Stats */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#777777]">{rivalHp}%</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-3 border border-[#535353] ${
                  i < Math.ceil(rivalHp / 10) ? 'bg-[#535353]' : 'bg-[#e0e0e0]'
                }`}
              />
            ))}
          </div>
          <span className="font-bold text-[#535353]">RIVAL</span>
        </div>
      </div>

      {/* 3. Live 1-Line Commentator Ticker */}
      <div className="w-full max-w-4xl px-4 py-1 text-center">
        <div className="inline-block px-3 py-1 bg-[#eeeeee] text-[#333333] text-[10px] font-pixel tracking-wide border-b border-[#cccccc]">
          {commentary}
        </div>
      </div>

      {/* 4. The Canvas Arena */}
      <div
        ref={containerRef}
        className="w-full max-w-4xl relative overflow-hidden my-1 bg-[#f7f7f7] cursor-crosshair"
      >
        <canvas ref={canvasRef} className="w-full block pixelated" />

        {/* Overlay for Ready / Game Over / Rematch / Draw */}
        {(matchStatus === 'ready' ||
          matchStatus === 'match_win' ||
          matchStatus === 'match_loss' ||
          matchStatus === 'match_draw' ||
          matchStatus === 'ko_win' ||
          matchStatus === 'ko_loss') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-2xs p-4 text-center">
            {matchStatus === 'ready' && (
              <div className="space-y-3 animate-in fade-in zoom-in-95 max-w-md">
                <div className="text-sm sm:text-base font-pixel font-bold text-[#222222]">
                  TECNOICYMI BOXEO 🥊
                </div>

                {/* Round selection buttons */}
                <div className="flex flex-col items-center gap-1.5 py-1">
                  <div className="text-[10px] font-pixel text-[#535353] font-bold tracking-wider">
                    ROUNDS
                  </div>
                  <div className="flex items-center gap-2">
                    {ROUND_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setTotalRounds(opt);
                          gameStateRef.current.totalRounds = opt;
                        }}
                        className={`px-3 py-1.5 font-pixel text-xs border-2 transition-all cursor-pointer ${
                          totalRounds === opt
                            ? 'bg-[#222222] text-[#f7f7f7] border-[#222222] shadow-[2px_2px_0px_0px_#535353]'
                            : 'bg-[#e8e8e8] text-[#555555] border-[#888888] hover:bg-[#d8d8d8] active:translate-x-0.5 active:translate-y-0.5'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs font-pixel text-[#535353] max-w-sm mx-auto">
                  Combate a {totalRounds} rounds de 60s. ¡Gana {Math.floor(totalRounds / 2) + 1} rounds para la victoria!
                </p>

                <button
                  onClick={() => startMatch()}
                  className="px-5 py-2.5 bg-[#222222] text-[#f7f7f7] font-pixel text-xs hover:bg-[#444444] transition-colors inline-flex items-center gap-2 border-2 border-[#222222] shadow-[3px_3px_0px_0px_#535353] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>ENTRAR AL RING (ESPACIO)</span>
                </button>
              </div>
            )}

            {(matchStatus === 'ko_win' || matchStatus === 'match_win') && (
              <div className="space-y-3 animate-in fade-in zoom-in-95">
                <div className="text-lg sm:text-xl font-pixel font-bold text-[#222222] tracking-wider">
                  VICTORY! 🏆
                </div>
                <div className="text-base font-pixel font-bold text-[#222222] py-1">
                  {playerScoreRounds} - {rivalScoreRounds}
                </div>
                <div className="text-xs font-pixel text-[#535353]">
                  PUNTUACIÓN FINAL: <span className="font-bold text-[#222]">{score}</span>
                </div>

                {/* Round selection for rematch */}
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <span className="text-[9px] font-pixel text-[#777]">ROUNDS:</span>
                  {ROUND_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setTotalRounds(opt);
                        gameStateRef.current.totalRounds = opt;
                      }}
                      className={`px-2 py-0.5 font-pixel text-[10px] border transition-all cursor-pointer ${
                        totalRounds === opt
                          ? 'bg-[#222222] text-[#f7f7f7] border-[#222222]'
                          : 'bg-[#e8e8e8] text-[#555555] border-[#888888]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => startMatch()}
                  className="px-5 py-2.5 bg-[#222222] text-[#f7f7f7] font-pixel text-xs hover:bg-[#444444] transition-colors inline-flex items-center gap-2 border-2 border-[#222222] shadow-[3px_3px_0px_0px_#535353] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>JUGAR DE NUEVO (ESPACIO)</span>
                </button>
              </div>
            )}

            {(matchStatus === 'ko_loss' || matchStatus === 'match_loss') && (
              <div className="space-y-3 animate-in fade-in zoom-in-95">
                <div className="text-lg sm:text-xl font-pixel font-bold text-[#535353] tracking-wider">
                  DEFEAT
                </div>
                <div className="text-base font-pixel font-bold text-[#535353] py-1">
                  {playerScoreRounds} - {rivalScoreRounds}
                </div>
                <div className="text-xs font-pixel text-[#777777]">
                  PUNTUACIÓN: <span className="font-bold text-[#222]">{score}</span>
                </div>

                {/* Round selection for rematch */}
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <span className="text-[9px] font-pixel text-[#777]">ROUNDS:</span>
                  {ROUND_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setTotalRounds(opt);
                        gameStateRef.current.totalRounds = opt;
                      }}
                      className={`px-2 py-0.5 font-pixel text-[10px] border transition-all cursor-pointer ${
                        totalRounds === opt
                          ? 'bg-[#222222] text-[#f7f7f7] border-[#222222]'
                          : 'bg-[#e8e8e8] text-[#555555] border-[#888888]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => startMatch()}
                  className="px-5 py-2.5 bg-[#222222] text-[#f7f7f7] font-pixel text-xs hover:bg-[#444444] transition-colors inline-flex items-center gap-2 border-2 border-[#222222] shadow-[3px_3px_0px_0px_#535353] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>REVANCHA (ESPACIO)</span>
                </button>
              </div>
            )}

            {matchStatus === 'match_draw' && (
              <div className="space-y-3 animate-in fade-in zoom-in-95">
                <div className="text-lg sm:text-xl font-pixel font-bold text-[#535353] tracking-wider">
                  DRAW
                </div>
                <div className="text-base font-pixel font-bold text-[#535353] py-1">
                  {playerScoreRounds} - {rivalScoreRounds}
                </div>
                <div className="text-xs font-pixel text-[#777777]">
                  PUNTUACIÓN: <span className="font-bold text-[#222]">{score}</span>
                </div>

                {/* Round selection for rematch */}
                <div className="flex items-center justify-center gap-1.5 py-1">
                  <span className="text-[9px] font-pixel text-[#777]">ROUNDS:</span>
                  {ROUND_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setTotalRounds(opt);
                        gameStateRef.current.totalRounds = opt;
                      }}
                      className={`px-2 py-0.5 font-pixel text-[10px] border transition-all cursor-pointer ${
                        totalRounds === opt
                          ? 'bg-[#222222] text-[#f7f7f7] border-[#222222]'
                          : 'bg-[#e8e8e8] text-[#555555] border-[#888888]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => startMatch()}
                  className="px-5 py-2.5 bg-[#222222] text-[#f7f7f7] font-pixel text-xs hover:bg-[#444444] transition-colors inline-flex items-center gap-2 border-2 border-[#222222] shadow-[3px_3px_0px_0px_#535353] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>NUEVO COMBATE (ESPACIO)</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. PC Keyboard Controls Display */}
      <div className="w-full max-w-4xl px-4 py-2.5 hidden sm:flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-pixel text-[#535353]">
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-[#e0e0e0] border border-[#999] text-[#222] text-[10px]">
            ← →
          </kbd>
          <span>MOVER</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-[#e0e0e0] border border-[#999] text-[#222] text-[10px]">
            A
          </kbd>
          <span>JAB IZQUIERDO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-[#e0e0e0] border border-[#999] text-[#222] text-[10px]">
            D
          </kbd>
          <span>JAB DERECHO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 bg-[#e0e0e0] border border-[#999] text-[#222] text-[10px]">
            S
          </kbd>
          <span>BLOQUEO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 bg-[#e0e0e0] border border-[#999] text-[#222] text-[10px]">
            ESPACIO
          </kbd>
          <span>ESQUIVAR</span>
        </div>
      </div>

      {/* 6. Mobile & Touch Screen On-Screen Controls */}
      <div className="w-full max-w-4xl px-3 py-2 flex flex-col gap-2 select-none touch-manipulation sm:hidden">
        {/* Main Punch Attack Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              triggerPlayerAction('jab');
            }}
            className="w-full py-3.5 px-3 bg-[#222222] hover:bg-[#333333] active:bg-[#555555] active:scale-95 text-[#f7f7f7] font-pixel text-xs border-2 border-[#222222] shadow-[2px_2px_0px_0px_#535353] flex items-center justify-center gap-2 cursor-pointer transition-transform select-none touch-none"
            style={{ touchAction: 'manipulation' }}
          >
            <span>🥊</span>
            <span>LEFT JAB</span>
          </button>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              triggerPlayerAction('cross');
            }}
            className="w-full py-3.5 px-3 bg-[#c93b2b] hover:bg-[#b03022] active:bg-[#852317] active:scale-95 text-[#f7f7f7] font-pixel text-xs border-2 border-[#222222] shadow-[2px_2px_0px_0px_#535353] flex items-center justify-center gap-2 cursor-pointer transition-transform select-none touch-none"
            style={{ touchAction: 'manipulation' }}
          >
            <span>RIGHT JAB</span>
            <span>🥊</span>
          </button>
        </div>

        {/* Movement & Defence Row */}
        <div className="flex items-center justify-between gap-2 w-full pt-1">
          {/* Movement D-Pad */}
          <div className="flex items-center gap-1.5">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                triggerPlayerAction('left_down');
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                triggerPlayerAction('left_up');
              }}
              onPointerLeave={() => triggerPlayerAction('left_up')}
              className="w-11 h-11 bg-[#e0e0e0] active:bg-[#535353] active:text-[#fff] text-[#222] font-pixel text-sm border-2 border-[#535353] flex items-center justify-center select-none cursor-pointer"
              style={{ touchAction: 'manipulation' }}
            >
              ◀
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                triggerPlayerAction('right_down');
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                triggerPlayerAction('right_up');
              }}
              onPointerLeave={() => triggerPlayerAction('right_up')}
              className="w-11 h-11 bg-[#e0e0e0] active:bg-[#535353] active:text-[#fff] text-[#222] font-pixel text-sm border-2 border-[#535353] flex items-center justify-center select-none cursor-pointer"
              style={{ touchAction: 'manipulation' }}
            >
              ▶
            </button>
          </div>

          {/* Dodge & Block Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                triggerPlayerAction('dodge');
              }}
              className="px-3 h-11 bg-[#e0e0e0] active:bg-[#535353] active:text-[#fff] text-[#222] font-pixel text-[10px] border-2 border-[#535353] flex items-center justify-center select-none cursor-pointer"
              style={{ touchAction: 'manipulation' }}
            >
              💨 ESQUIVAR
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                triggerPlayerAction('block_down');
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                triggerPlayerAction('block_up');
              }}
              onPointerLeave={() => triggerPlayerAction('block_up')}
              className="px-3 h-11 bg-[#e0e0e0] active:bg-[#535353] active:text-[#fff] text-[#222] font-pixel text-[10px] border-2 border-[#535353] flex items-center justify-center select-none cursor-pointer"
              style={{ touchAction: 'manipulation' }}
            >
              🛡️ BLOQUEO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
