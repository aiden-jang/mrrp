export type KeepsakeDetails = {
  catName: string;
  doing: string;
  together: boolean;
  capturedAt?: Date;
};

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

/** Turns the room capture into a shareable little print without uploading it anywhere. */
export async function makeKeepsake(room: Blob, details: KeepsakeDetails): Promise<Blob | null> {
  const image = await loadImage(room);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1420;
  const g = canvas.getContext("2d");
  if (!g) return null;

  g.fillStyle = "#fffaf1";
  g.fillRect(0, 0, canvas.width, canvas.height);

  g.save();
  roundedRect(g, 72, 72, 1056, 1056, 44);
  g.clip();
  g.imageSmoothingEnabled = false;
  g.drawImage(image, 72, 72, 1056, 1056);
  g.restore();

  g.fillStyle = "#4a3520";
  g.font = "600 42px ui-rounded, system-ui, sans-serif";
  wrappedLines(g, keepsakeCaption(details), 1028).forEach((line, index) => {
    g.fillText(line, 86, 1212 + index * 52);
  });

  g.fillStyle = "#907961";
  g.font = "28px ui-rounded, system-ui, sans-serif";
  g.fillText(keepsakeDate(details.capturedAt), 86, 1338);

  g.textAlign = "right";
  g.fillStyle = "#c58c43";
  g.font = "700 32px ui-rounded, system-ui, sans-serif";
  g.fillText("mrrp  ·  ฅ", 1114, 1350);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
