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

export default function ExhibitCard({ exhibit }: { exhibit: PublicKey }) {
  const [exhibitData, setExhibitData] = useState();
  const [exhibitImages, setExhibitImages] = useState([]);
  const { connection } = useConnection();
  const router = useRouter();
  let url = router.route;

  let base = router.route;
  if (base === "/home") {
    base = "/exhibition";
  }

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
        <a href={base + "/" + exhibit.toString()}>
          <div className="card-body">
            <DisplayImages images={exhibitImages} />
            <div className="card-title">
              {exhibitData.exhibitSymbol} Exhibit
            </div>
            <button className="btn btn-primary">Enter</button>
          </div>
        </a>
      )}
    </div>
  );
}
