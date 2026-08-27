export type FighterAction =
  | 'idle'
  | 'walk_fwd'
  | 'walk_bwd'
  | 'jab'
  | 'cross'
  | 'block'
  | 'dodge'
  | 'hurt'
  | 'down'
  | 'win';

export interface Fighter {
  x: number;
  y: number;
  width: number;
  height: number;
  facing: 1 | -1; // 1 = facing right, -1 = facing left
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  state: FighterAction;
  stateTimer: number;
  animFrame: number;
  animTimer: number;
  isAI: boolean;
  score: number;
  roundsWon: number;
  // Hitboxes & interaction flags
  hitRegistered: boolean;
  velocity: number;
  hurtRecovery: number;
  name: string;
  colorTheme: {
    primary: string;
    secondary: string;
    gloves: string;
    skin: string;
    shorts: string;
  };
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  text?: string;
}

export interface Cloud {
  x: number;
  y: number;
  speed: number;
  width: number;
  height: number;
}

export interface Spectator {
  x: number;
  offsetY: number;
  cheering: boolean;
  type: number;
}

export type MatchStatus =
  | 'ready'
  | 'round_intro'
  | 'fighting'
  | 'round_break'
  | 'knockdown'
  | 'ko_win'
  | 'ko_loss'
  | 'match_win'
  | 'match_loss'
  | 'match_draw';

export interface ServiceItem {
  id: string;
  title: string;
  icon: string;
  actionText: string;
  description: string;
  details: {
    name: string;
    price?: string;
    description: string;
    badge?: string;
  }[];
}
