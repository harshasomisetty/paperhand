import { useEffect, useState } from "react";

export default function DisplayImages({ images }: { images: string[] }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timerId = setInterval(async () => {
      // Use a functional state update to correctly increment the count
      function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
      }
      await new Promise((r) => setTimeout(r, getRandomInt(3, 6) * 2000));

      setCount((count) => count + 1);
    }, 2000);

    return () => clearInterval(timerId);
  }, []);

  const image = images[count % images.length];
  return <> {images && <img src={image} />}</>;
}
