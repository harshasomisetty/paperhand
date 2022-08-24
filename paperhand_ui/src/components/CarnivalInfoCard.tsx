import React, { useEffect, useState } from "react";
import Link from "next/link";

import { PublicKey } from "@solana/web3.js";
import {
  getAllExhibitArtifacts,
  getAllNftImages,
  getExhibitAccountData,
} from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import DisplayImages from "./DisplayImages";
import { useRouter } from "next/router";
import { Nft } from "@metaplex-foundation/js";

const CarnivalInfoCard = ({
  carnivalNfts,
  exhibitSymbol,
  floor,
}: {
  carnivalNfts: Nft[];
  exhibitSymbol: string;
  floor: number;
}) => {
  const { wallet } = useWallet();
  const [exhibitImages, setExhibitImages] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      console.log("info card nfts passed in count", carnivalNfts);
      if (carnivalNfts) {
        let images = await getAllNftImages(carnivalNfts);
        setExhibitImages(images);
      }
    }
    fetchData();
  }, [wallet]);
  return (
    <div className="card card-side bg-base-100 shadow-xl">
      <div className="card-body">
        {exhibitImages && (
          <div className="avatar">
            <div className="w-32 rounded-full">
              <DisplayImages images={exhibitImages} />
            </div>
          </div>
        )}
        {exhibitSymbol && <h2 className="card-title">{exhibitSymbol}</h2>}
        {exhibitImages && <p>Listed: {exhibitImages.length}</p>}
        {floor && <p>Floor: {floor.toString()}</p>}
      </div>
    </div>
  );
};

export default CarnivalInfoCard;
