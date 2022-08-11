import React, { useEffect, useState } from "react";
import Link from "next/link";

import { PublicKey } from "@solana/web3.js";
import {
  getAllExhibitArtifacts,
  getAllNftImages,
  getExhibitAccountData,
} from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export default function ExhibitCard({ exhibit }: { exhibit: PublicKey }) {
  const [exhibitData, setExhibitData] = useState();
  const [exhibitImages, setExhibitImages] = useState([]);
  const { connection } = useConnection();
  const { wallet } = useWallet();

  useEffect(() => {
    async function fetchData() {
      let fetchedData = await getExhibitAccountData(exhibit, wallet);
      setExhibitData(fetchedData);
      let nfts = await getAllExhibitArtifacts(exhibit, connection);

      let images = await getAllNftImages(nfts);
      setExhibitImages(images);
    }

    fetchData();
  }, [wallet]);

  return (
    <div className="card card-compact w-60 bg-base-300 shadow-xl">
      {exhibitData && (
        <div className="card-body">
          {exhibitImages && (
            <div className="stack">
              {exhibitImages.map((image: string, ind) => (
                <img src={image} key={ind} />
              ))}
            </div>
          )}
          <div className="card-title">{exhibitData.exhibitSymbol} Exhibit</div>
          <Link href={"/exhibition/" + exhibit.toString()}>
            <button className="btn btn-primary">View Exhibit</button>
          </Link>
        </div>
      )}
    </div>
  );
}
