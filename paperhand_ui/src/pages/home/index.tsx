import { Metaplex } from "@metaplex-foundation/js";
import { useEffect, useState } from "react";
import { NftProvider } from "@/context/NftContext";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { EXHIBITION_PROGRAM_ID } from "@/utils/constants";
import ExhibitList from "@/components/ExhibitList";
import ExploreBanner from "@/components/ExploreBanner";
import ExplainBanner from "@/components/ExplainBanner";

// TODO add in display of changes account balance after the transaction is completed
export default function Home() {
  const { connection } = useConnection();
  const [exhibits, setExhibits] = useState<PublicKey[]>([]);

  useEffect(() => {
    const fetch = async () => {
      let allExhibitAccounts = await connection.getProgramAccounts(
        EXHIBITION_PROGRAM_ID
      );

      let exhibitPubkeys: PublicKey[] = [];

      allExhibitAccounts.forEach((exhibitAccount) =>
        exhibitPubkeys.push(exhibitAccount.pubkey)
      );

      setExhibits(exhibitPubkeys);
    };
    fetch();
  }, []);
  return (
    <div className="flex flex-col w-full space-y-4 ">
      {/* <ExploreBanner exhibitList={exhibits} /> */}
      <ExplainBanner />

      <div className="divider divide-neutral"></div>
      <ExhibitList exhibits={exhibits} />
    </div>
  );
}
