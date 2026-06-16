import AiMaker from "../components/AiMaker";

export default function Page() {
  return (
    <AiMaker
      cfg={{
        titel: "Sticker maker",
        icoon: "🌟",
        uitleg: "Maak je eigen vrolijke sticker met de AI.",
        suffix: ", cute kawaii sticker, die-cut, thick white border, vibrant colors, glossy, simple background",
        placeholder: "bijv. een blije taco met zonnebril",
        voorbeelden: ["een blije avocado", "een coole kat met zonnebril", "een regenboog-eenhoorn", "een dansende donut"],
        w: 768,
        h: 768,
      }}
    />
  );
}
