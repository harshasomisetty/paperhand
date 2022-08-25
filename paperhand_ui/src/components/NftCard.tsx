import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Nft } from "@metaplex-foundation/js";
import { NftContext } from "@/context/NftContext";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getNftDerivedAddresses } from "@/utils/accountDerivation";
import { getAccount } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";

export default function NftCard({
  nft,
  nftImage,
  index,
  price,
}: {
  nft: Nft;
  nftImage: string;
  exhibitKey?: string;
  index: number;
  price?: number | string;
}) {
  const { chosenNfts, chooseNft, removeNft, addNft, groupDetails } =
    useContext(NftContext);
  const { connection } = useConnection();

  const [exhibitKey, setExhibitKey] = useState();
  const [boothKey, setBoothKey] = useState();
  // console.log("nft carf", index, price);

  useEffect(() => {
    async function fetchData() {
      console.log("pre sending nft", nft, nft.metadata.symbol);

      let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
        nft
      );
      let parsedArtifact = await getAccount(connection, nftArtifact);

      setExhibitKey(exhibit);
      setBoothKey(parsedArtifact.delegate);
    }
    if (nft && nft.metadata) {
      fetchData();
    }
  }, [nft]);

  return (
    <div
      className={`card card-compact w-40 bg-base-300 cursor-pointer shadow-xl border-transparent border hover:border-4 hover:opacity-75 ${
        chosenNfts[nft.mint.toString()] ? "border-primary-focus" : "opacity-50"
      }
`}
      onClick={() => {
        let oldChosen = { ...chosenNfts };
        let oldDetails = { ...groupDetails };
        /* console.log("old details", oldDetails); */
        /* console.log("clicked nft", nft); */

        let boothDeet = oldDetails[boothKey.toString()];

        if (oldChosen[nft.mint.toString()]) {
          console.log("backwards booth deet", boothDeet);
          let newBoothDeet = boothDeet;
          newBoothDeet.startPrice =
            newBoothDeet.startPrice - newBoothDeet.delta;
          oldDetails[boothKey.toString()] = newBoothDeet;
          console.log("backwards after", newBoothDeet);
          // oldDetails[]
          removeNft(nft);
          // TODO Lock in nft price
        } else {
          console.log("forwards booth deet", boothDeet);
          let newBoothDeet = boothDeet;
          console.log(
            "prices? ",
            Number(newBoothDeet.startPrice + newBoothDeet.delta)
          );
          newBoothDeet.startPrice =
            newBoothDeet.startPrice + newBoothDeet.delta;
          oldDetails[boothKey.toString()] = newBoothDeet;
          console.log("backwards after", newBoothDeet);
          addNft(nft);
        }

        /* chooseNft(nft); */
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
              {Number(
                (typeof price === "string"
                  ? Number(groupDetails[price].startPrice)
                  : price) / LAMPORTS_PER_SOL
              ).toFixed(2)}{" "}
              ◎
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
function removeNft(pickedNft: any) {
  throw new Error("Function not implemented.");
}

function addNft(pickedNft: any) {
  throw new Error("Function not implemented.");
}
