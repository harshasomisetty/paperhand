import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { NextPage } from "next";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";

import ExhibitList from "@/components/ExhibitList";
import * as ExhibitionJson from "@/target/idl/exhibition.json";
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
    </>
  );
};

export default CarnivalPage;
