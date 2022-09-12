import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Nft } from "@metaplex-foundation/js";
import { NftContext } from "@/context/NftContext";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getNftDerivedAddresses } from "@/utils/accountDerivation";
import { getAccount } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import { checkIfAccountExists } from "@/utils/retrieveData";

export default function NftCard({
  nft,
  nftImage,
  index,
  price,
  size,
}: {
  nft: Nft;
  nftImage: string;
  index: number;
  price?: number | string;
  size?: number;
}) {
  const {
    chosenNfts,
    chooseNft,
    removeNft,
    addNft,
    groupDetails,
    setGroupDetails,
    nftPrices,
    setNftPrices,
  } = useContext(NftContext);
  const { connection } = useConnection();

  const [exhibitKey, setExhibitKey] = useState();
  const [boothKey, setBoothKey] = useState();

  useEffect(() => {
    async function fetchData() {
      let { exhibit, voucherMint, nftArtifact } = await getNftDerivedAddresses(
        nft
      );

      if (await checkIfAccountExists(nftArtifact, connection)) {
        let parsedArtifact = await getAccount(connection, nftArtifact);
        setExhibitKey(exhibit);
        setBoothKey(parsedArtifact.delegate);
      } else {
        // let parsedArtifact = await getAccount(connection, nftArtifact);
        // console.log("parsed arti", parsedArtifact);
        // setExhibitKey(exhibit);
        // setBoothKey(parsedArtifact.delegate);
      }
    }
    if (nft && nft.metadata) {
      fetchData();
    }
  }, [nft]);

  // if (!boothKey) {
  // return <p>no booth key</p>;
  // }

  function imageClick() {
    let oldChosen = { ...chosenNfts };
    let oldDetails = { ...groupDetails };
    let oldNftPrices = { ...nftPrices };

    if (boothKey) {
      let boothDeet = oldDetails[boothKey.toString()];

      let newBoothDeet = boothDeet;

      if (price) {
        if (oldChosen[nft.mint.toString()]) {
          oldNftPrices[nft.mint.toString()] = boothKey.toString();

          newBoothDeet.startPrice =
            Number(newBoothDeet.startPrice) - Number(newBoothDeet.delta);
        } else {
          oldNftPrices[nft.mint.toString()] = Number(newBoothDeet.startPrice);

          newBoothDeet.startPrice =
            Number(newBoothDeet.startPrice) + Number(newBoothDeet.delta);
        }

        oldDetails[boothKey.toString()] = newBoothDeet;
        setGroupDetails(oldDetails);
        setNftPrices(oldNftPrices);
      }
    }
    if (oldChosen[nft.mint.toString()]) {
      removeNft(nft);
    } else {
      addNft(nft);
    }
  }

  return (
    <div
      className={`card card-compact w-min bg-base-300 cursor-pointer shadow-xl  border-transparent border hover:opacity-75 ${
        chosenNfts[nft.mint.toString()] ? "border-primary-focus" : "opacity-50"
      }
      `}
      onClick={imageClick}
    >
      {nftImage ? (
        <div className="flex justify-self-start">
          <img src={nftImage} alt={nft.name} width={size} />
        </div>
      ) : (
        <p>loading image</p>
      )}

      <div className="card-body">
        <div>
          <div>
            <h2 className="card-title">{nft.name}</h2>
            <div className="badge badge-primary">{nft.symbol}</div>
          </div>

          <div className="flex flex-row justify-between">
            {price && (
              <p className="">
                {Number(
                  (typeof price === "string"
                    ? Number(groupDetails[price].startPrice)
                    : price) / LAMPORTS_PER_SOL
                )
                  .toFixed(2)
                  .toString() + "◎"}
              </p>
            )}

            {exhibitKey && (
              <div className="">
                <Link
                  href={"/exhibition/" + exhibitKey + "/" + nft.mint.toString()}
                >
                  <div className="badge badge-ghost hover:badge-secondary text-xs">
                    Details
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
