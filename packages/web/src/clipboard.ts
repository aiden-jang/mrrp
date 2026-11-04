export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const previous = document.activeElement as HTMLElement | null;
    const input = document.createElement("textarea");
    try {
      input.value = text;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      input.remove();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    }
  }
}
