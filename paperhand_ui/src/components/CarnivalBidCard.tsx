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
import router, { useRouter } from "next/router";
import { Nft } from "@metaplex-foundation/js";
import { NftContext } from "@/context/NftContext";
import { instructionSolToNft } from "@/utils/instructions/carnival";

const CarnivalBidCard = ({
  carnivalNfts,
  exhibitSymbol,
}: {
  carnivalNfts: Nft[];
  exhibitSymbol: string;
}) => {
  const { publicKey, wallet, signTransaction } = useWallet();
  const [exhibitImages, setExhibitImages] = useState<string[]>([]);
  const [cart, setCart] = useState<number>(0);

  const { connection } = useConnection();
  const router = useRouter();

  const { exhibitAddress } = router.query;

  const {
    chosenNfts,
    clearNfts,
    nftPrices,
    setNftPrices,
    groupDetails,
    setGroupDetails,
  } = useContext(NftContext);

  useEffect(() => {
    let prices = nftPrices;
    let total = 0;

    Object.values(prices).forEach((price) => {
      if (typeof price == "number") {
        total = total + price;
      }
    });
    setCart(total / LAMPORTS_PER_SOL);
  }, [chosenNfts]);

  async function executeCarnivalSolToNft() {
    console.log("sol to nft execute");
    console.log(
      "wallet",
      wallet,
      publicKey,
      Object.values(chosenNfts),
      connection,
      signTransaction
    );
    await instructionSolToNft(
      wallet,
      publicKey,
      Object.values(chosenNfts),
      connection,
      signTransaction
    );
    // router.reload(window.location.pathname);
  }
  // TODO Add SOL COST, how many selected nfts
  return (
    <>
      {publicKey && (
        <div className="card card-side border border-neutral-focus bg-base-300 shadow-xl min-w-max m-7 p-4">
          <div className="card-body space-y-7">
            <h2 className="card-title">Buy NFTs</h2>
            <div className="flex flex-col space-y-7">
              <div className="stat">
                <div className="stat-value text-error">{cart} SOL</div>
                <div className="stat-value text-success">
                  {Object.keys(chosenNfts).length} {exhibitSymbol}s
                </div>
              </div>
              {Object.keys(chosenNfts).length > 0 ? (
                <button
                  className="btn btn-success"
                  onClick={executeCarnivalSolToNft}
                >
                  Market Buy
                </button>
              ) : (
                <button className="btn" disabled="disabled">
                  Pick NFT to Buy
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CarnivalBidCard;
