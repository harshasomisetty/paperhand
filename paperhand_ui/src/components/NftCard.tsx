import React, { useContext } from "react";
import Link from "next/link";
import { Nft } from "@metaplex-foundation/js";
import { NftContext } from "@/context/NftContext";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export default function NftCard({
  nft,
  nftImage,
  exhibitKey,
  index,
  price,
}: {
  nft: Nft;
  nftImage: string;
  exhibitKey?: String;
  index: number;
  price?: number;
}) {
  const { chosenNfts, chooseNft, setChosenNfts } = useContext(NftContext);

  return (
    <div
      className={`card card-compact w-40 bg-base-300 cursor-pointer shadow-xl border-transparent border hover:border-4 hover:opacity-75 ${
        chosenNfts[nft.mint.toString()] ? "border-primary-focus" : "opacity-50"
      }
`}
      onClick={() => {
        console.log("nft index: ", index);
        chooseNft(nft);
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
          <div className="stat">
            <div className="stat-value">
              {Number(price / LAMPORTS_PER_SOL).toFixed(2)} ◎
            </div>
          </div>
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
      </div>
    </div>
  );
}
