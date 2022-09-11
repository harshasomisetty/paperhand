import { useEffect, useState } from "react";

export default function DisplayImages({
  images,
  sleep,
}: {
  images: string[];
  sleep?: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timerId = setInterval(
      async () => {
        // Use a functional state update to correctly increment the count
        function getRandomInt(min, max) {
          return Math.floor(Math.random() * (max - min + 1) + min);
        }
        await new Promise((r) => setTimeout(r, sleep ? sleep : 1000));

        setCount((count) => count + 1);
      },
      sleep ? sleep : 1000
    );

    return () => clearInterval(timerId);
  }, []);

  const image = images[count % images.length];
  return <>{images && images.length > 0 && <img src={image} />}</>;
}
