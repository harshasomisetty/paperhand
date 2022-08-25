import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Nft } from "@metaplex-foundation/js";
import { NftContext } from "@/context/NftContext";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getNftDerivedAddresses } from "@/utils/accountDerivation";
import { getAccount } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import BN from "bn.js";

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
  const {
    chosenNfts,
    chooseNft,
    removeNft,
    addNft,
    groupDetails,
    nftPrices,
    setNftPrices,
  } = useContext(NftContext);
  const { connection } = useConnection();

  const [exhibitKey, setExhibitKey] = useState();
  const [boothKey, setBoothKey] = useState();
  // console.log("nft carf", index, price);

  useEffect(() => {
    async function fetchData() {
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

        let newBoothDeet = boothDeet;

        let oldNftPrices = { ...nftPrices };

        if (oldChosen[nft.mint.toString()]) {
          console.log("backwards booth deet", boothDeet);
          newBoothDeet.startPrice =
            newBoothDeet.startPrice - newBoothDeet.delta;

          console.log("backwards after", newBoothDeet);
          oldNftPrices[nft.mint.toString()] = boothKey.toString();

          removeNft(nft);
        } else {
          console.log("forwards booth deet", boothDeet);

          console.log(
            "prices? ",
            Number(newBoothDeet.startPrice + newBoothDeet.delta)
          );

          // TODO Lock in nft price

          console.log("locking in pirce", Number(newBoothDeet.startPrice));
          oldNftPrices[nft.mint.toString()] = Number(newBoothDeet.startPrice);
          console.log(
            "type of error?",
            typeof oldNftPrices[nft.mint.toString()],
            oldNftPrices[nft.mint.toString()]
          );
          setNftPrices(oldNftPrices);

          newBoothDeet.startPrice = new BN(
            Number(newBoothDeet.startPrice) + Number(newBoothDeet.delta)
          );

          console.log(
            "forwards after",
            Number(newBoothDeet.startPrice),
            Number(newBoothDeet.delta)
          );
          addNft(nft);
        }

        /* oldDetails[boothKey.toString()] = newBoothDeet; */

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
