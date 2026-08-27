export function catCallCode(name: string): string | null {
  const code = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return code.length >= 2 ? code : null;
}
