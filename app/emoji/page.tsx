import AiMaker from "../components/AiMaker";

export default function Page() {
  return (
    <AiMaker
      cfg={{
        titel: "Emoji maker",
        icoon: "😎",
        uitleg: "Verzin je eigen emoji en de AI tekent hem!",
        suffix: ", single 3d emoji icon, glossy, expressive, centered, plain light background, apple emoji style",
        placeholder: "bijv. een lachende patat",
        voorbeelden: ["een verliefde robot", "een boze wolk", "een chille cactus", "een superheld-banaan"],
        w: 768,
        h: 768,
      }}
    />
  );
}
