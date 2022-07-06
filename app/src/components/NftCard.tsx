import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Nft } from "@metaplex-foundation/js";

interface NftCardProps {
  nft: Nft;
  exhibitKey: String;
}
export default function NftCard({ nft, exhibitKey }: NftCardProps) {
  const [task, setTask] = useState(false);
  useEffect(() => {
    async function fetchData() {
      if (!nft.metadataTask.isRunning()) {
        console.log("starting task");
        await nft.metadataTask.run();
        console.log(nft.metadata.image);
        setTask(true);
      } else {
        console.log("already running");
      }
    }
    fetchData();
  }, []);
  return (
    <Link href={"/exhibition/" + exhibitKey + "/" + nft.name}>
      <div className="flex flex-col items-center place-content-around border bg-gray-800 bg-opacity-50 hover:bg-opacity-100 rounded-xl m-2 p-2 truncate overflow-hidden w-40 h-48">
        <p>{nft.name}</p>
        <img src={nft.metadata.image} alt={nft.name} />
      </div>
    </Link>
  );
}
