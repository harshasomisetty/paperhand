import React, { useEffect, useState } from "react";
import Link from "next/link";

import { PublicKey } from "@solana/web3.js";
import { getExhibitAccountData } from "@/utils/retrieveData";
import { useWallet } from "@solana/wallet-adapter-react";
interface ExhibitCardProps {
  exhibit: PublicKey;
}
export default function ExhibitCard({ exhibit }: ExhibitCardProps) {
  const [exhibitData, setExhibitData] = useState();

  const { wallet } = useWallet();
  useEffect(() => {
    async function fetchData() {
      let fetchedData = await getExhibitAccountData(exhibit, wallet);
      setExhibitData(fetchedData);
      console.log(fetchedData);
    }

    fetchData();
  }, [wallet]);

  return (
    <Link href={"/exhibition/" + exhibit.toString()}>
      <div className="card w-96 bg-base-100 shadow-xl hover:bg-opacity-100">
        {/* <div className="flex flex-col items-center place-content-around border bg-gray-800 bg-opacity-50 hover:bg-opacity-100 rounded-xl m-2 p-2 truncate overflow-hidden w-40 h-48"> */}
        {exhibitData && (
          <div className="card-body">
            <h2 className="card-title">{exhibitData.exhibitSymbol} Exhibit</h2>
            <p>pubkey: {exhibit.toString()}</p>
            <p>{exhibitData.artifactCount} deposited NFTs</p>
            <div className="card-actions justify-end">
              <button className="btn btn-info">View</button>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
