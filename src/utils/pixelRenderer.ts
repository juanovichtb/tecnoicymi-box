import { Fighter, Particle, Cloud, Spectator } from '../types';

// Pixel Art Constants & Palette
export const PALETTE = {
  bg: '#f7f7f7',
  ground: '#535353',
  groundAccent: '#777777',
  groundLight: '#dcdcdc',
  charcoal: '#535353', // Authentic Google Chrome Dino tone (#535353)
  grayDark: '#535353',
  grayMid: '#777777',
  grayLight: '#aaaaaa',
  grayFaint: '#e0e0e0',
  white: '#ffffff',
  playerRed: '#d93829', // Vivid Retro Red Boxing Gloves
  rivalBlue: '#3b6cb5', // Vivid Retro Blue Boxing Gloves
  skinTone: '#535353',
};

// Draw a single cloud in Dino pixel style
export function drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud) {
  ctx.fillStyle = PALETTE.grayLight;
  const x = Math.round(cloud.x);
  const y = Math.round(cloud.y);
  const s = 2; // pixel scale

  // Chrome Dino style blocky cloud
  ctx.fillRect(x + 12 * s, y, 24 * s, 6 * s);
  ctx.fillRect(x + 6 * s, y + 4 * s, 36 * s, 8 * s);
  ctx.fillRect(x, y + 8 * s, 48 * s, 6 * s);
  ctx.fillRect(x + 8 * s, y + 12 * s, 32 * s, 4 * s);
}

// Draw distant minimalist horizon mountains
export function drawHorizon(ctx: CanvasRenderingContext2D, width: number, groundY: number) {
  ctx.fillStyle = PALETTE.grayFaint;
  
  // Simple low-poly pixel horizon hills
  const peakSpacing = 160;
  for (let x = -40; x < width + 40; x += peakSpacing) {
    const peakHeight = 24 + ((x % 70) * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x + peakSpacing * 0.4, groundY - peakHeight);
    ctx.lineTo(x + peakSpacing * 0.8, groundY - (peakHeight * 0.6));
    ctx.lineTo(x + peakSpacing, groundY);
    ctx.fill();
  }
}

// Draw crowd of tiny pixel silhouettes
export function drawCrowd(
  ctx: CanvasRenderingContext2D,
  spectators: Spectator[],
  groundY: number,
  ringLeft: number,
  ringRight: number
) {
  const crowdY = groundY - 36;
  
  spectators.forEach((s) => {
    // Only draw crowd within and slightly around the ring
    if (s.x < ringLeft - 60 || s.x > ringRight + 60) return;

    const y = crowdY + (s.cheering ? -4 : s.offsetY);
    const x = Math.round(s.x);

    ctx.fillStyle = s.cheering ? PALETTE.charcoal : PALETTE.grayLight;

    // Head
    ctx.fillRect(x, y, 4, 4);

    // Body
    ctx.fillRect(x - 1, y + 5, 6, 8);

    // Arms
    if (s.cheering) {
      // Arms up in excitement
      ctx.fillRect(x - 3, y + 3, 2, 4);
      ctx.fillRect(x + 5, y + 3, 2, 4);
    } else {
      // Normal arms
      ctx.fillRect(x - 3, y + 6, 2, 5);
      ctx.fillRect(x + 5, y + 6, 2, 5);
    }

    // Legs
    ctx.fillRect(x, y + 13, 2, 6);
    ctx.fillRect(x + 3, y + 13, 2, 6);
  });
}

// Draw Referee
export function drawReferee(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  refState: { state: string; count: number; animFrame: number }
) {
  const y = groundY - 44;
  const rx = Math.round(x);
  const bob = refState.animFrame % 2 === 0 ? 0 : 1;

  // Head with ref cap/hair
  ctx.fillStyle = PALETTE.grayDark;
  ctx.fillRect(rx + 2, y + bob, 6, 6);
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(rx + 3, y + 2 + bob, 2, 2); // eye

  // Striped Referee Shirt
  for (let r = 0; r < 5; r++) {
    ctx.fillStyle = r % 2 === 0 ? PALETTE.charcoal : PALETTE.white;
    ctx.fillRect(rx, y + 7 + r * 2 + bob, 10, 2);
  }

  // Pants & Shoes
  ctx.fillStyle = PALETTE.charcoal;
  ctx.fillRect(rx + 1, y + 17 + bob, 3, 8);
  ctx.fillRect(rx + 6, y + 17 + bob, 3, 8);
  ctx.fillRect(rx, y + 25 + bob, 4, 3);
  ctx.fillRect(rx + 6, y + 25 + bob, 4, 3);

  // Arms and count gesture
  ctx.fillStyle = PALETTE.charcoal;
  if (refState.state === 'counting') {
    // Arm raised counting
    ctx.fillRect(rx + 10, y + 3 + bob, 3, 8);
    ctx.fillRect(rx + 10, y + 1 + bob, 4, 3);

    // Speech count bubble
    ctx.fillStyle = PALETTE.charcoal;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(`${refState.count}`, rx + 16, y + 6);
  } else if (refState.state === 'declare') {
    // Both arms raised
    ctx.fillRect(rx - 4, y + 3 + bob, 3, 7);
    ctx.fillRect(rx + 11, y + 3 + bob, 3, 7);
  } else {
    // Normal arms
    ctx.fillRect(rx - 2, y + 8 + bob, 2, 6);
    ctx.fillRect(rx + 10, y + 8 + bob, 2, 6);
  }
}

// Draw the minimalist Boxing Ring (integrated seamlessly onto the floor)
export function drawRing(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  ringLeft: number,
  ringRight: number
) {
  const postHeight = 62;
  const postY = groundY - postHeight;

  // Left Post
  ctx.fillStyle = PALETTE.charcoal;
  ctx.fillRect(ringLeft - 4, postY, 6, postHeight);
  // Post Cap
  ctx.fillStyle = PALETTE.playerRed;
  ctx.fillRect(ringLeft - 6, postY - 4, 10, 5);

  // Right Post
  ctx.fillStyle = PALETTE.charcoal;
  ctx.fillRect(ringRight - 2, postY, 6, postHeight);
  // Post Cap
  ctx.fillStyle = PALETTE.rivalBlue;
  ctx.fillRect(ringRight - 4, postY - 4, 10, 5);

  // Ring Floor Mat Border
  ctx.fillStyle = PALETTE.grayLight;
  ctx.fillRect(ringLeft, groundY - 2, ringRight - ringLeft, 2);

  // 3 Horizontal Ropes
  const ropeYs = [groundY - 50, groundY - 34, groundY - 18];
  ropeYs.forEach((ry) => {
    ctx.fillStyle = PALETTE.grayDark;
    ctx.fillRect(ringLeft, ry, ringRight - ringLeft, 2);

    // Small turnbuckles / rope clips
    ctx.fillStyle = PALETTE.grayMid;
    ctx.fillRect(ringLeft + 4, ry - 1, 3, 4);
    ctx.fillRect(ringRight - 7, ry - 1, 3, 4);
  });
}

// Draw continuous ground line with Dino-like texture dots
export function drawGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  groundY: number,
  scrollOffset: number
) {
  // Main ground baseline
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(0, groundY, width, 2);

  // Dotted texture pebbles underneath ground line (Dino signature style)
  ctx.fillStyle = PALETTE.grayMid;
  const dotSpacing = 16;
  const startX = -(scrollOffset % dotSpacing);

  for (let x = startX; x < width + dotSpacing; x += dotSpacing) {
    const seed = Math.abs(Math.sin((x + scrollOffset) * 999));
    if (seed > 0.6) {
      ctx.fillRect(Math.round(x), groundY + 4, 3, 1);
    }
    if (seed > 0.8) {
      ctx.fillRect(Math.round(x + 6), groundY + 8, 2, 1);
    }
    if (seed > 0.9) {
      ctx.fillRect(Math.round(x + 10), groundY + 12, 4, 2);
    }
  }
}

// ==========================================
// CHROME DINO T-REX PIXEL SPRITE RENDERER
// ==========================================

interface DinoRenderOptions {
  state: string;
  animFrame: number;
  stateTimer: number;
  hurtRecovery: number;
  gloveColor: string;
  dinoColor: string;
}

/**
 * Renders the authentic Google Chrome Dino T-Rex sprite in classic 2D monochrome
 * pixel-art construction, adapted for boxer stances and animated states.
 */
function renderChromeDinoSprite(ctx: CanvasRenderingContext2D, opt: DinoRenderOptions) {
  const { state, animFrame, stateTimer, gloveColor, dinoColor } = opt;

  ctx.fillStyle = dinoColor;

  switch (state) {
    // -------------------------------------------------------------
    // 1. KNOCKED DOWN (Down on canvas, dizzy stars floating)
    // -------------------------------------------------------------
    case 'down': {
      // Horizontal body flat on canvas
      ctx.fillRect(-18, 44, 34, 8);

      // Head tilted back on ground
      ctx.fillRect(-28, 40, 14, 12);
      // Snout pointing upward/left
      ctx.fillRect(-34, 38, 8, 8);

      // White cutout eye (knocked out X or closed square)
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(-26, 42, 2, 2);

      // Tail flat on ground
      ctx.fillStyle = dinoColor;
      ctx.fillRect(16, 48, 10, 4);
      ctx.fillRect(26, 50, 6, 2);

      // Limp Dino legs sticking up in air
      ctx.fillRect(-6, 34, 4, 10);
      ctx.fillRect(-8, 32, 6, 2); // Foot
      ctx.fillRect(4, 30, 4, 14);
      ctx.fillRect(2, 28, 6, 2); // Foot

      // Limp fallen boxing gloves
      ctx.fillStyle = gloveColor;
      ctx.fillRect(-12, 46, 8, 7);
      ctx.fillRect(10, 46, 8, 7);
      // Glove wrist bands
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(-12, 46, 2, 7);
      ctx.fillRect(10, 46, 2, 7);

      // Floating dizzy stars
      ctx.fillStyle = PALETTE.grayMid;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('★', -24 + Math.sin(stateTimer * 0.2) * 4, 28);
      ctx.fillText('★', -14 + Math.cos(stateTimer * 0.2) * 4, 22);
      break;
    }

    // -------------------------------------------------------------
    // 2. VICTORY (Roaring head up, gloves raised in triumph)
    // -------------------------------------------------------------
    case 'win': {
      const bob = animFrame % 2 === 0 ? 0 : 2;

      // Head angled upward in roar
      ctx.fillRect(2, -2 - bob, 18, 12);
      ctx.fillRect(16, -4 - bob, 6, 8); // Upper snout raised
      ctx.fillRect(16, 6 - bob, 8, 4);  // Lower open jaw

      // Eye
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(6, 0 - bob, 3, 3);
      ctx.fillStyle = dinoColor;
      ctx.fillRect(8, 0 - bob, 1, 1); // pupil

      // Neck & Back
      ctx.fillRect(-6, 10 - bob, 14, 12);
      // Torso
      ctx.fillRect(-10, 20 - bob, 18, 18);

      // Tail angled high
      ctx.fillRect(-16, 24 - bob, 8, 8);
      ctx.fillRect(-24, 20 - bob, 10, 6);
      ctx.fillRect(-30, 16 - bob, 8, 4);
      ctx.fillRect(-34, 12 - bob, 6, 3); // tip

      // Thigh & Standing Legs
      ctx.fillRect(-10, 36 - bob, 12, 6);
      // Left leg
      ctx.fillRect(-8, 42 - bob, 4, 10 + bob);
      ctx.fillRect(-10, 52, 8, 2); // 3-toe foot
      // Right leg
      ctx.fillRect(0, 42 - bob, 4, 10 + bob);
      ctx.fillRect(-2, 52, 8, 2); // 3-toe foot

      // Boxing gloves raised high in victory
      ctx.fillStyle = gloveColor;
      ctx.fillRect(-14, 2 - bob, 10, 9);
      ctx.fillRect(18, -12 - bob, 10, 10);
      // White wrist tape
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(-14, 9 - bob, 10, 2);
      ctx.fillRect(18, -4 - bob, 10, 2);
      break;
    }

    // -------------------------------------------------------------
    // 3. DODGE / CROUCH (Authentic Chrome Dino Duck Pose!)
    // -------------------------------------------------------------
    case 'dodge': {
      // Classic horizontal low-profile duck
      // Low head & snout stretching forward
      ctx.fillRect(10, 26, 22, 10);
      ctx.fillRect(30, 28, 6, 6); // snout tip

      // Eye
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(18, 28, 3, 3);
      ctx.fillStyle = dinoColor;
      ctx.fillRect(20, 28, 1, 1);

      // Low horizontal torso & neck
      ctx.fillRect(-12, 30, 26, 12);

      // Horizontal straight tail
      ctx.fillRect(-20, 32, 10, 6);
      ctx.fillRect(-28, 34, 10, 4);
      ctx.fillRect(-34, 36, 6, 2);

      // Bent crouching legs
      ctx.fillRect(-10, 42, 8, 8);
      ctx.fillRect(-14, 50, 12, 4); // Rear crouched foot
      ctx.fillRect(4, 42, 8, 8);
      ctx.fillRect(0, 50, 12, 4);  // Front crouched foot

      // Boxing gloves tucked in tight crouch
      ctx.fillStyle = gloveColor;
      ctx.fillRect(4, 30, 8, 8);
      ctx.fillRect(20, 34, 8, 8);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(4, 36, 8, 2);
      ctx.fillRect(20, 40, 8, 2);
      break;
    }

    // -------------------------------------------------------------
    // 4. BLOCK (Defensive Double Glove Shield on Snout)
    // -------------------------------------------------------------
    case 'block': {
      // Head tucked back behind guard
      ctx.fillRect(-4, 10, 16, 12);
      ctx.fillRect(10, 12, 8, 8); // Snout
      // Eye peeking over gloves
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(2, 12, 3, 3);
      ctx.fillStyle = dinoColor;
      ctx.fillRect(4, 12, 1, 1);

      // Neck & Torso
      ctx.fillRect(-10, 20, 16, 18);

      // Tail
      ctx.fillRect(-16, 26, 8, 8);
      ctx.fillRect(-24, 28, 10, 6);
      ctx.fillRect(-30, 30, 8, 4);

      // Braced Legs
      ctx.fillRect(-8, 36, 10, 6);
      ctx.fillRect(-8, 42, 4, 10);
      ctx.fillRect(-10, 52, 8, 2);
      ctx.fillRect(0, 42, 4, 10);
      ctx.fillRect(-2, 52, 8, 2);

      // High Dual Glove Guard Shield
      ctx.fillStyle = gloveColor;
      ctx.fillRect(12, 8, 10, 11);  // High lead glove
      ctx.fillRect(10, 20, 10, 10); // Low support glove

      // Glove wrist details
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(12, 17, 10, 2);
      ctx.fillRect(10, 28, 10, 2);

      // Block spark line
      ctx.fillStyle = PALETTE.grayMid;
      ctx.fillRect(24, 10, 2, 18);
      ctx.fillRect(26, 14, 2, 10);
      break;
    }

    // -------------------------------------------------------------
    // 5. HURT (Recoiling backward, mouth open, eye widened)
    // -------------------------------------------------------------
    case 'hurt': {
      // Head thrown back
      ctx.fillRect(-12, 4, 16, 12);
      ctx.fillRect(2, 6, 10, 6); // Snout lifted
      ctx.fillRect(6, 14, 6, 3); // Dropped jaw

      // Shocked Eye (wide white cutout)
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(-6, 6, 4, 4);
      ctx.fillStyle = dinoColor;
      ctx.fillRect(-4, 7, 1, 1);

      // Neck & Torso tilted
      ctx.fillRect(-12, 16, 14, 20);

      // Drooping tail
      ctx.fillRect(-18, 30, 8, 8);
      ctx.fillRect(-24, 36, 8, 6);
      ctx.fillRect(-30, 40, 8, 4);

      // Off-balance legs
      ctx.fillRect(-10, 36, 10, 6);
      ctx.fillRect(-12, 42, 4, 10);
      ctx.fillRect(-14, 52, 8, 2);
      ctx.fillRect(0, 40, 4, 12);
      ctx.fillRect(-2, 52, 8, 2);

      // Flailing gloves
      ctx.fillStyle = gloveColor;
      ctx.fillRect(-18, 20, 8, 8);
      ctx.fillRect(8, 20, 8, 8);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(-18, 26, 8, 2);
      ctx.fillRect(8, 26, 8, 2);
      break;
    }

    // -------------------------------------------------------------
    // 6. JAB (Quick Left Punch with tiny Dino arm extension)
    // -------------------------------------------------------------
    case 'jab': {
      const jabProg = animFrame;
      const punchExt = jabProg === 1 ? 24 : jabProg === 2 ? 14 : 4;

      // Head & Snout
      ctx.fillRect(-2, 4, 18, 12);
      ctx.fillRect(14, 6, 10, 8); // Flat square snout
      ctx.fillRect(14, 12, 4, 2); // Jaw notch

      // Eye
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(4, 6, 3, 3);
      ctx.fillStyle = dinoColor;
      ctx.fillRect(6, 6, 1, 1);

      // Neck & Torso
      ctx.fillRect(-6, 16, 16, 20);

      // Tail
      ctx.fillRect(-14, 24, 8, 8);
      ctx.fillRect(-22, 26, 10, 6);
      ctx.fillRect(-28, 28, 8, 4);
      ctx.fillRect(-32, 30, 4, 2);

      // Stepping Legs
      ctx.fillRect(-8, 36, 12, 6);
      ctx.fillRect(-8, 42, 4, 10);
      ctx.fillRect(-10, 52, 8, 2);
      ctx.fillRect(2, 42, 4, 10);
      ctx.fillRect(0, 52, 8, 2);

      // Rear guard glove
      ctx.fillStyle = gloveColor;
      ctx.fillRect(2, 18, 8, 8);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(2, 24, 8, 2);

      // Tiny Dino Arm extending
      ctx.fillStyle = dinoColor;
      ctx.fillRect(10, 16, punchExt, 3);

      // Extended Punching Glove
      ctx.fillStyle = gloveColor;
      ctx.fillRect(10 + punchExt, 13, 11, 10);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(10 + punchExt, 21, 11, 2);
      break;
    }

    // -------------------------------------------------------------
    // 7. CROSS (Heavy Power Punch with forward body drive)
    // -------------------------------------------------------------
    case 'cross': {
      const crossProg = animFrame;
      const punchExt = crossProg === 1 ? 28 : crossProg === 2 ? 16 : 6;

      // Head & Snout leaned in aggressively
      ctx.fillRect(0, 4, 18, 12);
      ctx.fillRect(16, 6, 12, 8); // Long snout
      ctx.fillRect(16, 12, 4, 2);

      // Eye
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(6, 6, 3, 3);
      ctx.fillStyle = dinoColor;
      ctx.fillRect(8, 6, 1, 1);

      // Torso thrust forward
      ctx.fillRect(-4, 16, 18, 20);

      // Tail counter-balance
      ctx.fillRect(-12, 24, 8, 8);
      ctx.fillRect(-20, 26, 10, 6);
      ctx.fillRect(-28, 28, 10, 4);

      // Power stance legs
      ctx.fillRect(-8, 36, 12, 6);
      ctx.fillRect(-10, 42, 4, 10);
      ctx.fillRect(-12, 52, 8, 2);
      ctx.fillRect(4, 42, 4, 10);
      ctx.fillRect(4, 52, 8, 2);

      // Lead guard glove
      ctx.fillStyle = gloveColor;
      ctx.fillRect(4, 20, 8, 8);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(4, 26, 8, 2);

      // Heavy Cross Arm & Big Power Glove
      ctx.fillStyle = dinoColor;
      ctx.fillRect(12, 16, punchExt, 4);
      ctx.fillStyle = gloveColor;
      ctx.fillRect(12 + punchExt, 12, 13, 12);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(12 + punchExt, 22, 13, 2);
      break;
    }

    // -------------------------------------------------------------
    // 8. IDLE & WALK (Authentic Chrome Dino Stride & Guard)
    // -------------------------------------------------------------
    case 'walk_fwd':
    case 'walk_bwd':
    case 'idle':
    default: {
      const bob = animFrame % 2 === 0 ? 0 : 2;
      const isWalking = state !== 'idle';
      const legStrideFrame = isWalking && animFrame % 2 === 1;

      // Flat Top Head
      ctx.fillRect(-4, 4 + bob, 18, 12);
      // Flat Snout with nostril/jaw notch
      ctx.fillRect(12, 6 + bob, 10, 8);
      ctx.fillRect(12, 12 + bob, 4, 2); // mouth line notch

      // Cutout Eye (Classic Chrome Dino white square with dark pupil)
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(2, 6 + bob, 3, 3);
      ctx.fillStyle = dinoColor;
      ctx.fillRect(4, 6 + bob, 1, 1);

      // Neck & Torso
      ctx.fillRect(-8, 16 + bob, 16, 20);

      // Iconic Stepped Dino Tail (curves up slightly at tip)
      ctx.fillRect(-14, 24 + bob, 8, 8);
      ctx.fillRect(-22, 26 + bob, 10, 6);
      ctx.fillRect(-28, 28 + bob, 8, 4);
      ctx.fillRect(-32, 30 + bob, 4, 2); // tip

      // Thigh base
      ctx.fillRect(-8, 36 + bob, 12, 6);

      // Legs with authentic Chrome Dino 2-frame run cycle
      if (legStrideFrame) {
        // Frame B: Rear leg lifted/bent back, Front leg stepping forward
        // Rear leg (bent high)
        ctx.fillRect(-12, 40 + bob, 6, 4);
        ctx.fillRect(-12, 44 + bob, 4, 4);
        ctx.fillRect(-14, 48 + bob, 6, 2); // lifted foot

        // Front leg (stepping forward)
        ctx.fillRect(2, 40 + bob, 4, 12);
        ctx.fillRect(0, 52, 8, 2); // grounded foot
      } else {
        // Frame A: Standing / neutral stride
        // Rear leg
        ctx.fillRect(-6, 40 + bob, 4, 12);
        ctx.fillRect(-8, 52, 8, 2); // 3-toe foot base

        // Front leg
        ctx.fillRect(2, 40 + bob, 4, 12);
        ctx.fillRect(0, 52, 8, 2);  // 3-toe foot base
      }

      // Boxing Gloves in Front Boxer Guard Stance
      ctx.fillStyle = gloveColor;
      ctx.fillRect(10, 16 + bob, 9, 9); // Lead glove held high near snout
      ctx.fillRect(2, 18 + bob, 8, 8);  // Rear glove tucked near chest

      // White wrist tape lines on gloves
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(10, 23 + bob, 9, 2);
      ctx.fillRect(2, 24 + bob, 8, 2);
      break;
    }
  }
}

// Visual scale factor for the Dino Boxers (~22% larger for enhanced ring presence)
export const DINO_SCALE = 1.22;

// Draw Fighter (Iconic Chrome Dino Boxer Silhouette)
export function drawFighter(ctx: CanvasRenderingContext2D, fighter: Fighter, groundY: number) {
  const fx = Math.round(fighter.x);
  const dir = fighter.facing;

  ctx.save();
  // Translate to ground level at fighter x position
  ctx.translate(fx, Math.round(groundY));
  // Scale uniformly with horizontal direction flip
  ctx.scale(dir * DINO_SCALE, DINO_SCALE);
  // Align sprite baseline (y = 54 is the grounded foot level)
  ctx.translate(0, -54);

  const { state, animFrame, stateTimer } = fighter;
  const isPlayer = !fighter.isAI;
  const gloveColor = isPlayer ? PALETTE.playerRed : PALETTE.rivalBlue;
  let dinoColor = PALETTE.charcoal;

  // Hurt blink effect (solid monochrome flicker)
  if (state === 'hurt' && fighter.hurtRecovery % 2 === 0) {
    dinoColor = PALETTE.grayLight;
  }

  renderChromeDinoSprite(ctx, {
    state,
    animFrame,
    stateTimer,
    hurtRecovery: fighter.hurtRecovery,
    gloveColor,
    dinoColor,
  });

  ctx.restore();
}

// Draw impact particles, sparks & floating score text
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach((p) => {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (p.text) {
      // Floating combat text (e.g. "+100", "BLOCK!", "CRITICAL!")
      ctx.fillStyle = p.color;
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
    } else {
      // Pixel spark/star
      ctx.fillStyle = p.color;
      const sz = p.size || 3;
      ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
    }

    ctx.restore();
  });
}
