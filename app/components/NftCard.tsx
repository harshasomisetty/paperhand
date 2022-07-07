import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Nft } from "@metaplex-foundation/J's";

interface NftCardProps {
  nft: Nft;
  exhibitKey: String;
  selected: boolean;
  extraInfo: boolean;
}
export default function NftCard({
  nft,
  exhibitKey,
  selected,
  extraInfo,
}: NftCardProps) {
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
    <div
      className={`flex flex-col items-center place-content-around border bg-gray-800 bg-opacity-50 hover:bg-opacity-100 rounded-xl m-2 p-2 truncate overflow-hidden w-min ${
        selected ? "border-red-200" : ""
      }`}
    >
      {exhibitKey && <p>wallet</p>}
      <p>{nft.name}</p>
      <img src={nftImage} alt={nft.name} />
      {extraInfo && (
        <Link href={"/exhibition/" + exhibitKey + "/" + nft.mint.toString()}>
          <button className=" border-2 border-black m-2 px-4 py-2 cursor-pointer text-black hover:text-white">
            Click for NFT info
          </button>
        </Link>
      )}
    </div>
  );
}
