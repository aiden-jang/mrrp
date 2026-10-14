const INK = "#332a23";
const PAPER = "#fff2df";

export function iconMark(fur = "#e6ab72", maskable = false): string {
  const coat = /^#[\da-f]{6}$/i.test(fur) ? fur : "#e6ab72";
  const face = `<path fill="${coat}" d="M112 236V130q0-28 24-12l68 48q52-18 104 0l68-48q24-16 24 12v106q20 32 20 72 0 104-164 104T92 308q0-40 20-72Z"/>
    <path fill="${PAPER}" d="M152 296q0-36 36-36h136q36 0 36 36v24q0 64-104 64t-104-64Z"/>
    <path stroke="${INK}" stroke-width="18" stroke-linecap="round" d="M176 282h32m96 0h32"/>
    <path fill="${INK}" d="M244 312q12-8 24 0l-12 14Z"/>
    <path fill="#d98386" d="m134 166 32 25h-32Zm244 0-32 25h32Z"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${maskable ? 0 : 120}" fill="${INK}"/><g${maskable ? ' transform="translate(64 64) scale(.75)"' : ""}>${face}</g></svg>`;
}
