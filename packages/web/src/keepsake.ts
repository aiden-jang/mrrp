export type KeepsakeDetails = {
  catName: string;
  doing: string;
  together: boolean;
  capturedAt?: Date;
  /** True when the room in the capture is dark. The card is printed to match. */
  night?: boolean;
};

/*
 * The card takes the room's light, like every other surface in the app.
 *
 * A cream card around a photograph of a dark lavender room reads as a picture pasted onto the wrong
 * stationery. This is the one thing anybody keeps or sends on, so it should look like the room it
 * came from rather than like the app's daytime palette.
 */
const CARD = {
  day: { paper: "#fffaf1", caption: "#4a3520", date: "#907961", mark: "#c58c43" },
  night: { paper: "#2b2439", caption: "#f6f1e6", date: "#c9bccb", mark: "#e8ad55" },
} as const;

export function keepsakeCaption({ catName, doing, together }: KeepsakeDetails): string {
  if (together) return `for a little while, you were both here with ${catName}.`;
  return `${catName} was ${doing}.`;
}

export function keepsakeDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function wrappedLines(g: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function roundedRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + width, y, x + width, y + height, r);
  g.arcTo(x + width, y + height, x, y + height, r);
  g.arcTo(x, y + height, x, y, r);
  g.arcTo(x, y, x + width, y, r);
  g.closePath();
}

async function loadImage(blob: Blob): Promise<CanvasImageSource> {
  if (typeof createImageBitmap === "function") return createImageBitmap(blob);

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not open room capture"));
    };
    image.src = url;
  });
}

/*
 * The postcard's type, matching the app's.
 *
 * Canvas takes a font string and draws immediately; it will not wait for a webfont the way the DOM
 * does, so an unloaded Quicksand silently falls back and the keepsake comes out in a different face
 * from the room it was captured from. Waiting for the two weights it uses costs nothing after the
 * first paint, since the page has already loaded them.
 */
const KEEPSAKE_FONT = 'Quicksand, ui-rounded, "SF Pro Rounded", system-ui, sans-serif';

async function keepsakeFontReady(): Promise<void> {
  try {
    await Promise.all([document.fonts.load("600 42px Quicksand"), document.fonts.load("700 32px Quicksand")]);
  } catch {
    // An unavailable font is not a reason to refuse somebody their postcard.
  }
}

/** A small paw: four toes over a pad, on a 22-unit box with its top-left at (x, y). */
function paw(g: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  g.save();
  g.fillStyle = color;
  const toe = (cx: number, cy: number, r: number) => {
    g.beginPath();
    g.ellipse(x + cx, y + cy, r, r * 1.15, 0, 0, Math.PI * 2);
    g.fill();
  };
  toe(4, 5, 2.6);
  toe(10, 3, 2.8);
  toe(16, 5, 2.6);
  toe(20.5, 10, 2.2);
  g.beginPath();
  g.ellipse(x + 11, y + 15, 7.5, 5.8, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** Turns the room capture into a shareable little print without uploading it anywhere. */
export async function makeKeepsake(room: Blob, details: KeepsakeDetails): Promise<Blob | null> {
  const [image] = await Promise.all([loadImage(room), keepsakeFontReady()]);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1420;
  const g = canvas.getContext("2d");
  if (!g) return null;

  const card = details.night ? CARD.night : CARD.day;
  g.fillStyle = card.paper;
  g.fillRect(0, 0, canvas.width, canvas.height);

  g.save();
  roundedRect(g, 72, 72, 1056, 1056, 44);
  g.clip();
  g.imageSmoothingEnabled = false;
  g.drawImage(image, 72, 72, 1056, 1056);
  g.restore();

  g.fillStyle = card.caption;
  g.font = `600 42px ${KEEPSAKE_FONT}`;
  wrappedLines(g, keepsakeCaption(details), 1028).forEach((line, index) => {
    g.fillText(line, 86, 1212 + index * 52);
  });

  g.fillStyle = card.date;
  g.font = `28px ${KEEPSAKE_FONT}`;
  g.fillText(keepsakeDate(details.capturedAt), 86, 1338);

  g.textAlign = "right";
  g.fillStyle = card.mark;
  g.font = `700 32px ${KEEPSAKE_FONT}`;
  /*
   * The sign-off, with a drawn paw rather than a borrowed glyph.
   *
   * This was a Thai character standing in for a paw. Canvas text has no fallback chain the way the
   * DOM does, so on a device whose resolved font lacks Thai it renders as a tofu box, on the one
   * thing in this app made to be kept and shown to somebody.
   */
  g.fillText("mrrp", 1076, 1350);
  paw(g, 1092, 1337, card.mark);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
