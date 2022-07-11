import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Nft } from "@metaplex-foundation/js";
import { NftContext } from "@/context/NftContext";

interface NftCardProps {
  nft: Nft;
  exhibitKey?: String;
  index: number;
  extraInfo: boolean;
}
export default function NftCard({
  nft,
  exhibitKey,
  index,
  extraInfo,
}: NftCardProps) {
  const [nftImage, setNftImage] = useState();
  const { selectedNft, setSelectedNft } = useContext(NftContext);

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
      className={`card card-normal w-96 bg-base-100 cursor-pointer shadow-xl border-transparent hover:border-4 ${
        selectedNft && selectedNft.mint.toString() === nft.mint.toString()
          ? "border-4 opacity-75"
          : ""
      }`}
      onClick={() => {
        console.log("nft index: ", index);
        setSelectedNft(nft);
      }}
    >
      <figure>
        <img src={nftImage} alt={nft.name} />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{nft.name}</h2>
        <p>
          <span style={{ fontWeight: "bold" }}>{nft.symbol}</span> collection
        </p>
        {extraInfo && (
          <div className="card-actions justify-end">
            <Link
              href={"/exhibition/" + exhibitKey + "/" + nft.mint.toString()}
            >
              <button className="btn btn-info">Click for NFT info</button>
            </Link>
          </div>
        )}
        {/* <p>{selectedNft.mint === nft.mint}</p> */}
      </div>
    </div>
  );
}
