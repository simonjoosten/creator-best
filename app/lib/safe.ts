// Eenvoudige veiligheidscheck: houdt duidelijk ongepaste opdrachten tegen,
// zodat de AI geen rare/foute dingen maakt. (Aangevuld door de "safe"-modus
// van de AI zelf.)

const VERBODEN = [
  "naakt", "naaktheid", "bloot", "blote", "naked", "nude", "nudity",
  "seks", "sex", "sexy", "porn", "porno", "nsfw", "expliciet", "explicit", "erotisch", "erotic", "hentai",
  "penis", "vagina", "borsten", "tieten", "boob", "blowjob", "masturb", "orgasm", "neuk", "fuck",
  "verkracht", "rape", "kinderporno", "pedo",
  "onthoofd", "beheading", "gore", "lijk", "zelfmoord", "suicide",
  "drugs", "cocaine", "heroine", "wiet", "meth",
];

export function isPromptOk(text: string): boolean {
  const t = text.toLowerCase();
  // Op hele woorden checken (zodat "vrolijke" niet op "lijk" struikelt)
  return !VERBODEN.some((w) => new RegExp(`\\b${w}\\b`, "i").test(t));
}
