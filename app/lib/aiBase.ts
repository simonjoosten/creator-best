// Het adres van de AI-server. Standaard leeg = "dezelfde computer" (localhost).
// Via het admin-paneel kun je een ander adres instellen, zodat de AI ook
// op de openbare https-site werkt (bijv. naar je eigen Mac).
export function aiBase(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem("cb_ai_server") || "").replace(/\/$/, "");
  } catch {
    return "";
  }
}
