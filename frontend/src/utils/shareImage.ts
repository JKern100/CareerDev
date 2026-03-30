import { PathwayResult } from "@/lib/api";

// ── Logo SVG as data URI (inlined for canvas rendering) ──
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="darkPetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1565C0"/>
      <stop offset="100%" stop-color="#0D47A1"/>
    </linearGradient>
    <linearGradient id="lightPetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4FC3F7"/>
      <stop offset="100%" stop-color="#29B6F6"/>
    </linearGradient>
    <radialGradient id="centerGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFD54F"/>
      <stop offset="100%" stop-color="#FFC107"/>
    </radialGradient>
  </defs>
  <g transform="translate(100,100)">
    <ellipse rx="18" ry="48" transform="rotate(0) translate(0,-42)" fill="url(#darkPetal)"/>
    <ellipse rx="18" ry="48" transform="rotate(72) translate(0,-42)" fill="url(#darkPetal)"/>
    <ellipse rx="18" ry="48" transform="rotate(144) translate(0,-42)" fill="url(#darkPetal)"/>
    <ellipse rx="18" ry="48" transform="rotate(216) translate(0,-42)" fill="url(#darkPetal)"/>
    <ellipse rx="18" ry="48" transform="rotate(288) translate(0,-42)" fill="url(#darkPetal)"/>
    <ellipse rx="14" ry="40" transform="rotate(36) translate(0,-38)" fill="url(#lightPetal)"/>
    <ellipse rx="14" ry="40" transform="rotate(108) translate(0,-38)" fill="url(#lightPetal)"/>
    <ellipse rx="14" ry="40" transform="rotate(180) translate(0,-38)" fill="url(#lightPetal)"/>
    <ellipse rx="14" ry="40" transform="rotate(252) translate(0,-38)" fill="url(#lightPetal)"/>
    <ellipse rx="14" ry="40" transform="rotate(324) translate(0,-38)" fill="url(#lightPetal)"/>
    <circle r="18" fill="url(#centerGrad)"/>
    <circle r="3" cx="0" cy="-23" fill="#F9A825"/>
    <circle r="3" cx="21.9" cy="-7.1" fill="#F9A825"/>
    <circle r="3" cx="13.5" cy="18.6" fill="#F9A825"/>
    <circle r="3" cx="-13.5" cy="18.6" fill="#F9A825"/>
    <circle r="3" cx="-21.9" cy="-7.1" fill="#F9A825"/>
    <circle r="2.5" cx="11" cy="-20.2" fill="#F9A825"/>
    <circle r="2.5" cx="22.1" cy="5.8" fill="#F9A825"/>
    <circle r="2.5" cx="0" cy="23" fill="#F9A825"/>
    <circle r="2.5" cx="-22.1" cy="5.8" fill="#F9A825"/>
    <circle r="2.5" cx="-11" cy="-20.2" fill="#F9A825"/>
  </g>
</svg>`;

function loadLogoImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(LOGO_SVG);
  });
}

/** Format score: if <=1 treat as 0-1 fraction, otherwise as percentage */
function formatScore(score: number): number {
  return score <= 1 ? Math.round(score * 100) : Math.round(score);
}

// ── Colors ──
const BG_DARK = "#0b1120";
const BG_CARD = "rgba(255,255,255,0.05)";
const BG_CARD_TOP = "rgba(37,99,235,0.1)";
const BORDER_CARD = "rgba(255,255,255,0.08)";
const BORDER_TOP = "rgba(37,99,235,0.35)";
const TEXT_PRIMARY = "#f1f5f9";
const TEXT_SECONDARY = "#94a3b8";
const TEXT_DIM = "#64748b";
const ACCENT = "#2563eb";
const ACCENT_LIGHT = "#60a5fa";
const BAR_BG = "rgba(255,255,255,0.08)";
const RANK_COLORS = ["#facc15", "#cbd5e1", "#d97706"]; // gold, silver, bronze

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export interface RenderOptions {
  format: "story" | "post";
  pathways: PathwayResult[];
}

export async function renderShareCard(
  canvas: HTMLCanvasElement,
  options: RenderOptions
): Promise<void> {
  const { format, pathways } = options;
  const W = 1080;
  const H = format === "story" ? 1920 : 1080;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d")!;
  const top3 = pathways.slice(0, 3);
  const maxScore = Math.max(...top3.map((p) => formatScore(p.adjusted_score)), 1);
  const isStory = format === "story";

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bgGrad.addColorStop(0, "#0b1120");
  bgGrad.addColorStop(0.5, "#111832");
  bgGrad.addColorStop(1, "#0b1120");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle glow top-right
  const glow1 = ctx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, 400);
  glow1.addColorStop(0, "rgba(37,99,235,0.08)");
  glow1.addColorStop(1, "transparent");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  // Subtle glow bottom-left
  const glow2 = ctx.createRadialGradient(W * 0.15, H * 0.85, 0, W * 0.15, H * 0.85, 350);
  glow2.addColorStop(0, "rgba(99,102,241,0.06)");
  glow2.addColorStop(1, "transparent");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  const PAD = 80;
  let y = isStory ? 180 : 80;

  // ── Logo ──
  try {
    const logo = await loadLogoImage();
    const logoSize = isStory ? 80 : 64;
    ctx.drawImage(logo, W / 2 - logoSize / 2, y, logoSize, logoSize);
    y += logoSize + 20;
  } catch {
    y += 20;
  }

  // ── Brand name ──
  ctx.textAlign = "center";
  ctx.fillStyle = ACCENT_LIGHT;
  ctx.font = `700 ${isStory ? 48 : 40}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText("CrewTransition", W / 2, y + 40);
  y += isStory ? 56 : 48;

  // ── Tagline ──
  ctx.fillStyle = TEXT_DIM;
  ctx.font = `500 ${isStory ? 22 : 18}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.letterSpacing = "3px";
  ctx.fillText("CAREER TRANSITION ADVISOR", W / 2, y + 24);
  ctx.letterSpacing = "0px";
  y += isStory ? 44 : 32;

  // ── "Created by Crew for Crew" badge ──
  const crewText = "Created by Crew for Crew";
  ctx.font = `600 ${isStory ? 20 : 17}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const crewW = ctx.measureText(crewText).width + 48;
  const crewH = isStory ? 40 : 34;
  const crewX = W / 2 - crewW / 2;

  // Badge background with warm accent
  const crewGrad = ctx.createLinearGradient(crewX, y, crewX + crewW, y);
  crewGrad.addColorStop(0, "rgba(251,191,36,0.15)");
  crewGrad.addColorStop(1, "rgba(245,158,11,0.15)");
  ctx.fillStyle = crewGrad;
  roundRect(ctx, crewX, y, crewW, crewH, crewH / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(251,191,36,0.35)";
  ctx.lineWidth = 1;
  roundRect(ctx, crewX, y, crewW, crewH, crewH / 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#fbbf24";
  ctx.fillText(crewText, W / 2, y + crewH / 2 + (isStory ? 7 : 6));
  y += crewH + (isStory ? 56 : 40);

  // ── Divider line ──
  const divGrad = ctx.createLinearGradient(PAD + 100, 0, W - PAD - 100, 0);
  divGrad.addColorStop(0, "transparent");
  divGrad.addColorStop(0.3, "rgba(37,99,235,0.3)");
  divGrad.addColorStop(0.7, "rgba(37,99,235,0.3)");
  divGrad.addColorStop(1, "transparent");
  ctx.fillStyle = divGrad;
  ctx.fillRect(PAD + 100, y, W - 2 * PAD - 200, 1);
  y += isStory ? 56 : 40;

  // ── Heading ──
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = `700 ${isStory ? 48 : 40}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText("My Next Chapter After the Galley", W / 2, y + 44);
  y += isStory ? 80 : 64;

  // ── Pathway cards ──
  const cardX = PAD;
  const cardW = W - 2 * PAD;
  const cardH = isStory ? 180 : 150;
  const cardGap = isStory ? 28 : 20;
  const barH = isStory ? 10 : 8;

  for (let i = 0; i < top3.length; i++) {
    const p = top3[i];
    const score = formatScore(p.adjusted_score);
    const isFirst = i === 0;
    const cy = y;

    // Card background
    ctx.fillStyle = isFirst ? BG_CARD_TOP : BG_CARD;
    roundRect(ctx, cardX, cy, cardW, cardH, 20);
    ctx.fill();

    // Card border
    ctx.strokeStyle = isFirst ? BORDER_TOP : BORDER_CARD;
    ctx.lineWidth = isFirst ? 1.5 : 1;
    roundRect(ctx, cardX, cy, cardW, cardH, 20);
    ctx.stroke();

    // Rank badge
    const badgeSize = isStory ? 52 : 44;
    const badgeX = cardX + 28;
    const badgeY = cy + cardH / 2 - badgeSize / 2;
    ctx.fillStyle = RANK_COLORS[i];
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 14);
    ctx.fill();
    ctx.fillStyle = "#0b1120";
    ctx.textAlign = "center";
    ctx.font = `800 ${isStory ? 28 : 24}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(`${i + 1}`, badgeX + badgeSize / 2, badgeY + badgeSize / 2 + (isStory ? 10 : 8));

    // Pathway name
    const textX = badgeX + badgeSize + 24;
    const textMaxW = cardW - badgeSize - 180;
    ctx.textAlign = "left";
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = `600 ${isStory ? 30 : 26}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    // Truncate pathway name if needed
    let name = p.pathway_name;
    while (ctx.measureText(name).width > textMaxW && name.length > 0) {
      name = name.slice(0, -1);
    }
    if (name !== p.pathway_name) name = name.trim() + "...";
    ctx.fillText(name, textX, cy + (isStory ? 52 : 44));

    // Typical roles subtitle
    const rolesText = p.typical_roles?.slice(0, 2).join("  ·  ") || "";
    if (rolesText) {
      ctx.fillStyle = TEXT_SECONDARY;
      ctx.font = `400 ${isStory ? 20 : 17}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      let roles = rolesText;
      while (ctx.measureText(roles).width > textMaxW && roles.length > 0) {
        roles = roles.slice(0, -1);
      }
      if (roles !== rolesText) roles = roles.trim() + "...";
      ctx.fillText(roles, textX, cy + (isStory ? 82 : 70));
    }

    // Score bar
    const barY = cy + cardH - (isStory ? 48 : 42);
    const barW = textMaxW;
    const barFillW = (score / maxScore) * barW;

    ctx.fillStyle = BAR_BG;
    roundRect(ctx, textX, barY, barW, barH, barH / 2);
    ctx.fill();

    const barGrad = ctx.createLinearGradient(textX, 0, textX + barFillW, 0);
    barGrad.addColorStop(0, ACCENT);
    barGrad.addColorStop(1, "#6366f1");
    ctx.fillStyle = barGrad;
    roundRect(ctx, textX, barY, Math.max(barFillW, barH), barH, barH / 2);
    ctx.fill();

    // Score percentage
    ctx.textAlign = "right";
    ctx.fillStyle = isFirst ? "#ffffff" : ACCENT_LIGHT;
    ctx.font = `700 ${isStory ? 44 : 38}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(`${score}%`, cardX + cardW - 28, cy + cardH / 2 + (isStory ? 16 : 14));

    y += cardH + cardGap;
  }

  y += isStory ? 40 : 20;

  // ── Motivational quote ──
  ctx.textAlign = "center";
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = `italic 400 ${isStory ? 28 : 24}px Georgia, "Times New Roman", serif`;
  ctx.fillText("\u201CYour skills go far beyond 35,000 feet.\u201D", W / 2, y + 28);
  y += isStory ? 56 : 44;

  // ── CTA pill ──
  const ctaText = "Find your path  \u2192  career-dev.vercel.app";
  ctx.font = `500 ${isStory ? 22 : 19}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const ctaW = ctx.measureText(ctaText).width + 60;
  const ctaH = isStory ? 52 : 44;
  const ctaX = W / 2 - ctaW / 2;
  const ctaY = y;

  ctx.fillStyle = "rgba(37,99,235,0.15)";
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(37,99,235,0.3)";
  ctx.lineWidth = 1;
  roundRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = ACCENT_LIGHT;
  ctx.fillText(ctaText, W / 2, ctaY + ctaH / 2 + (isStory ? 8 : 7));
}

export async function generateShareImage(
  pathways: PathwayResult[],
  format: "story" | "post"
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await renderShareCard(canvas, { format, pathways });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to generate image"))),
      "image/png"
    );
  });
}

export async function downloadShareImage(
  pathways: PathwayResult[],
  format: "story" | "post",
  filename = "careerdev-results.png"
) {
  const blob = await generateShareImage(pathways, format);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function shareToInstagram(pathways: PathwayResult[], format: "story" | "post") {
  const blob = await generateShareImage(pathways, format);
  const file = new File([blob], "careerdev-results.png", { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "My CrewTransition Results",
      text: "Just discovered my top career paths beyond flying! Created by crew for crew \u2708\uFE0F Check yours at career-dev.vercel.app",
    });
    return true;
  }

  // Fallback: download
  downloadShareImage(pathways, format);
  return false;
}

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
