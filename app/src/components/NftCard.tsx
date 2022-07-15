import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Nft } from "@metaplex-foundation/js";
import { NftContext } from "@/context/NftContext";

interface NftCardProps {
  nft: Nft;
  nftImage: string;
  exhibitKey?: String;
  index: number;
}
export default function NftCard({
  nft,
  nftImage,
  exhibitKey,
  index,
}: NftCardProps) {
  const { selectedNft, setSelectedNft } = useContext(NftContext);

  return (
    <div
      className={`card card-compact w-40 bg-base-100 cursor-pointer shadow-xl border-transparent hover:border-4 ${
        selectedNft && selectedNft.mint.toString() === nft.mint.toString()
          ? "border-4 opacity-75"
          : ""
      }`}
      onClick={() => {
        console.log("nft index: ", index);
        setSelectedNft(nft);
      }}
    >
      {nftImage ? (
        <figure>
          <img src={nftImage} alt={nft.name} />
        </figure>
      ) : (
        <p>loading image</p>
      )}

      <div className="card-body flex flex-row justify-between">
        <div>
          <h2 className="card-title">{nft.name}</h2>
          {!exhibitKey && (
            <p>
              <span style={{ fontWeight: "bold" }}>{nft.symbol}</span>{" "}
              collection
            </p>
          )}
        </div>
        {exhibitKey && (
          <div className="card-actions">
            <Link
              href={"/exhibition/" + exhibitKey + "/" + nft.mint.toString()}
            >
              <button className="btn btn-info">info</button>
            </Link>
          </div>
        )}
        {/* <p>{selectedNft.mint === nft.mint}</p> */}
      </div>
    </div>
  );
}
