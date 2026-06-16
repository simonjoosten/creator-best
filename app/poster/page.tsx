import AiMaker from "../components/AiMaker";

export default function Page() {
  return (
    <AiMaker
      cfg={{
        titel: "Poster maker",
        icoon: "🖼️",
        uitleg: "Maak een coole poster voor aan je muur.",
        suffix: ", epic movie poster art, dramatic lighting, cinematic, highly detailed",
        placeholder: "bijv. een astronaut op een buitenaardse planeet",
        voorbeelden: ["een superheld in de stad", "een racewagen in de regen", "een magisch bos bij nacht", "een drakenrijder"],
        w: 768,
        h: 1024,
      }}
    />
  );
}
