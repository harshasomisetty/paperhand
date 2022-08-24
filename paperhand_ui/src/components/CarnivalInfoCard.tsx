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
      if (carnivalNfts) {
        let images = await getAllNftImages(carnivalNfts);
        setExhibitImages(images);
      }
    }
    fetchData();
  }, [wallet, carnivalNfts]);

  if (!exhibitImages || !exhibitSymbol || !floor) {
    return <p>Loading Images!</p>;
  }
  return (
    <div className="card card-side bg-base-300 shadow-xl min-w-max m-7 p-4">
      <div className="avatar">
        <div className="w-32 rounded-full">
          <DisplayImages images={exhibitImages} />
        </div>
      </div>

      <div className="card-body">
        <div>
          <h2 className="card-title text-2xl">{exhibitSymbol}</h2>
          <p>Listed: {exhibitImages.length}</p>
          <p>Floor: {floor.toString()} ◎</p>
        </div>
      </div>
    </div>
  );
};

export default CarnivalInfoCard;
