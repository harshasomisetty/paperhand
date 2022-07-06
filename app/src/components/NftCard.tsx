import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Nft } from "@metaplex-foundation/J's";

interface NftCardProps {
  nft: Nft;
  exhibitKey: String;
}
export default function NftCard({ nft, exhibitKey }: NftCardProps) {
  const [nftImage, setNftImage] = useState();

  useEffect(() => {
    // fetch data is run twice, so need to see if metadata task is currently running
    async function fetchData() {
      if (!nft.metadataTask.isRunning()) {
        await nft.metadataTask.run();
      }
      setNftImage(nft.metadata.image);
    }
    fetchData();
  }, []);
  return (
    <Link href={"/exhibition/" + exhibitKey + "/" + nft.name}>
      <div className="flex flex-col items-center place-content-around border bg-gray-800 bg-opacity-50 hover:bg-opacity-100 rounded-xl m-2 p-2 truncate overflow-hidden w-40 h-48">
        <p>{nft.name}</p>
        <img src={nftImage} alt={nft.name} />
      </div>
    </Link>
  );
}
