import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  getAllExhibitArtifacts,
  getAllNftImages,
  getExhibitAccountData,
} from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import DisplayImages from "./DisplayImages";
import { useRouter } from "next/router";
import { Nft } from "@metaplex-foundation/js";
import { NftContext } from "@/context/NftContext";

const CarnivalInfoCard = ({
  carnivalNfts,
  exhibitSymbol,
}: {
  carnivalNfts: Nft[];
  exhibitSymbol: string;
}) => {
  const { wallet } = useWallet();
  const [exhibitImages, setExhibitImages] = useState<string[]>([]);

  const { nftPrices, groupDetails } = useContext(NftContext);

  useEffect(() => {
    async function fetchData() {
      if (carnivalNfts) {
        let images = await getAllNftImages(carnivalNfts);
        setExhibitImages(images);
      }
    }
    fetchData();
  }, [wallet, carnivalNfts]);

  return (
    <div className="card card-side border border-neutral-focus bg-base-300 shadow-xl min-w-max m-7 p-4">
      <div className="avatar">
        <div className="w-32 rounded-full">
          <DisplayImages images={exhibitImages} />
        </div>
      </div>

      <div className="card-body">
        <div>
          <h2 className="card-title text-2xl">{exhibitSymbol}</h2>
          <p>Listed: {exhibitImages.length}</p>
          {nftPrices && (
            <p>
              Floor:{" "}
              {Number(
                (typeof Object.values(nftPrices)[0] === "string"
                  ? Number(groupDetails[Object.values(nftPrices)[0]].startPrice)
                  : Object.values(nftPrices)[0]) / LAMPORTS_PER_SOL
              ).toFixed(2)}{" "}
              ◎
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarnivalInfoCard;
