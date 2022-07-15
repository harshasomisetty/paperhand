import React, { useEffect, useState } from "react";
import Link from "next/link";

import { PublicKey } from "@solana/web3.js";
import {
  checkIfSwapExists,
  getAllExhibitArtifacts,
  getExhibitAccountData,
  getMarketData,
} from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

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
    }

    fetchData();
  }, [wallet]);

  return (
    <Link href={"/exhibition/" + exhibit.toString()}>
      <div className="card card-compact w-64 bg-base-100 shadow-xl hover:bg-opacity-100">
        {exhibitData && (
          <div className="card-body">
            {exhibitImages && (
              <div className="stack">
                {exhibitImages.map((image: string, ind) => (
                  <img src={image} alt={"sdf"} key={ind} />
                ))}
              </div>
            )}
            <div className="stats ">
              <div className="stat">
                <div className="stat-title">
                  {exhibitData.artifactCount} NFTs
                </div>
                <div className="card-title">
                  {exhibitData.exhibitSymbol} Exhibit
                </div>
              </div>
            </div>
            <button className="btn btn-info">View</button>
          </div>
        )}
      </div>
    </Link>
  );
}
