import AiMaker from "../components/AiMaker";

export default function Page() {
  return (
    <AiMaker
      cfg={{
        titel: "Logo maker",
        icoon: "✏️",
        uitleg: "Maak een logo voor je team, kanaal of game.",
        suffix: ", modern minimalist logo, vector style, clean, simple shapes, centered, flat design",
        placeholder: "bijv. een logo voor mijn game-kanaal 'NightFox'",
        voorbeelden: ["een vos voor een gamekanaal", "een raket voor een YouTube-kanaal", "een wolf-esports-logo", "een pizzarestaurant"],
        w: 768,
        h: 768,
      }}
    />
  );
}
