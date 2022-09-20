import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";

import ExhibitList from "@/components/ExhibitList";
import * as ExhibitionJson from "@/target/idl/exhibition.json";
import ExistingCollections from "@/components/ExistingCollections";
const EXHIBITION_PROGRAM_ID = new PublicKey(
  ExhibitionJson["metadata"]["address"]
);

const CarnivalPage: NextPage = () => {
  const { publicKey } = useWallet();
  const { connection } = useConnection();

  const [exhibits, setExhibits] = useState<PublicKey[]>([]);
  useEffect(() => {
    async function fetchData() {
      let allExhibitAccounts = await connection.getProgramAccounts(
        EXHIBITION_PROGRAM_ID
      );

      let exhibitPubkeys: PublicKey[] = [];

      allExhibitAccounts.forEach((exhibitAccount) =>
        exhibitPubkeys.push(exhibitAccount.pubkey)
      );

      setExhibits(exhibitPubkeys);
    }
    fetchData();
  }, []);
  return (
    <>
      <h2 className="text-2xl font-extrabold m-2">solana's pseudo sudoswap</h2>
      {publicKey ? (
        <div>
          {exhibits.length > 0 ? (
            <ExhibitList exhibits={exhibits} />
          ) : (
            <p>No projects created yet! </p>
          )}
        </div>
      ) : (
        <p className="text-center">Please connect wallet</p>
      )}
      <div>
        <div className="overflow-x-auto w-full">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Listings</th>
                <th>Floor Price</th>
                <th>Best Offer</th>
                {/* <th>Offer TVL</th> */}
                {/* <th>Volume</th> */}
              </tr>
            </thead>
            <ExistingCollections exhibits={exhibits} />
          </table>
        </div>
      </div>
    </>
  );
};

export default CarnivalPage;
