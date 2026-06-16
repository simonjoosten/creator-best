import AiMaker from "../components/AiMaker";

export default function Page() {
  return (
    <AiMaker
      cfg={{
        titel: "Kleurplaat maker",
        icoon: "🖍️",
        uitleg: "Typ wat je wil en de AI maakt er een kleurplaat van — printen en inkleuren maar!",
        suffix: ", black and white line art coloring page for kids, clean bold outlines, white background, no shading, no color",
        placeholder: "bijv. een dinosaurus die voetbalt",
        voorbeelden: ["een schattige eenhoorn", "een ruimteschip met aliens", "een kasteel met een draak", "een onderwaterwereld met vissen"],
        w: 768,
        h: 1024,
      }}
    />
  );
}
