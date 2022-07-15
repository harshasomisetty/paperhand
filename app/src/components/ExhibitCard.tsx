import React, { useEffect, useState } from "react";
import Link from "next/link";

import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  checkIfSwapExists,
  getAllExhibitArtifacts,
  getExhibitAccountData,
  getMarketData,
} from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { MarketData } from "@/utils/interfaces";

export default function ExhibitCard({ exhibit }: { exhibit: PublicKey }) {
  const [exhibitData, setExhibitData] = useState();
  const [nftList, setNftList] = useState<Nft[]>([]);
  const [marketData, setMarketData] = useState<MarketData>();
  const [exhibitImages, setExhibitImages] = useState([]);
  const { connection } = useConnection();
  const { wallet } = useWallet();

  useEffect(() => {
    async function fetchData() {
      let fetchedData = await getExhibitAccountData(exhibit, wallet);
      setExhibitData(fetchedData);
      let allNfts = await getAllExhibitArtifacts(exhibit, connection);

      if (await checkIfSwapExists(exhibit, connection)) {
        let mdata = await getMarketData(exhibit, connection);
        setMarketData(mdata);
      }

      let imagePromises = [];
      for (let nft of allNfts) {
        if (!nft.metadataTask.isRunning()) {
          imagePromises.push(nft.metadataTask.run());
        }
      }
      await Promise.all(imagePromises);
      let images = [];
      for (let nft of allNfts) {
        images.push(nft.metadata.image);
      }
      setExhibitImages(images);
      // console.log("ehxibt images", images);
    }

    fetchData();
  }, [wallet]);

  return (
    <div className="card card-compact w-56 bg-base-300 shadow-xl">
      {exhibitData && (
        <div className="card-body">
          {exhibitImages && (
            <div className="stack">
              {exhibitImages.map((image: string, ind) => (
                <img src={image} key={ind} />
              ))}
            </div>
          )}
          <div className="stats bg-base-300">
            <div className="stat">
              {marketData ? (
                <div className="stat-title">
                  Floor price:{" "}
                  {(
                    (Math.floor(
                      (marketData.voucher * marketData.sol) /
                        (marketData.voucher - 1)
                    ) -
                      marketData.sol) /
                    LAMPORTS_PER_SOL
                  ).toFixed(2)}{" "}
                  SOL
                </div>
              ) : (
                <div className="stat-title">Market not Initialized</div>
              )}
              <div className="card-title">
                {exhibitData.exhibitSymbol} Exhibit
              </div>
              <div className="stat-desc">{exhibitData.artifactCount} NFTs</div>
            </div>
          </div>
          <Link href={"/exhibition/" + exhibit.toString()}>
            <button className="btn btn-primary">View Exhibit</button>
          </Link>
        </div>
      )}
    </div>
  );
}
