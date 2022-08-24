import React, { useContext, useEffect, useState } from "react";
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
import { NftContext } from "@/context/NftContext";

const CarnivalBidCard = ({ carnivalNfts }: { carnivalNfts: Nft[] }) => {
  const { wallet } = useWallet();
  const [exhibitImages, setExhibitImages] = useState<string[]>([]);

  const { chosenNfts, clearNfts } = useContext(NftContext);

  useEffect(() => {
    async function fetchData() {}
    fetchData();
  }, []);

  return (
    <div className="card flex-shrink-0 w-full max-w-sm border border-neutral-focus shadow-lg bg-base-300">
      <p>Bid Card all booths: {Object.keys(carnivalNfts).length}</p>
      <div className="card-body space-y-7">
        <div className="flex flex-col space-y-7">
          <div className="shadow flex flex-row items-center">
            <div className="stat">
              <div className="stat-title">
                Market Sell {Object.keys(chosenNfts).length} NFTs
              </div>
            </div>
          </div>
          {Object.keys(chosenNfts).length > 0 ? (
            <button className="btn btn-error">Market Sell</button>
          ) : (
            <button className="btn" disabled="disabled">
              Pick NFT To market Sell
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarnivalBidCard;
