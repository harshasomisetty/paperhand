import { useEffect, useState } from "react";

export default function DisplayImages({ images }: { images: string[] }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timerId = setInterval(() => {
      // Use a functional state update to correctly increment the count
      setCount((count) => count + 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const image = images[count % images.length];
  return <> {images && <img src={image} />}</>;
}
