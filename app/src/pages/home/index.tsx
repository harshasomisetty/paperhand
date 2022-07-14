import { Metaplex } from "@metaplex-foundation/js";
import { useEffect, useState } from "react";
import { NftProvider } from "@/context/NftContext";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import UserView from "@/views/UserView";
import { EXHIBITION_PROGRAM_ID } from "@/utils/constants";
import ExhibitList from "@/components/ExhibitList";

export default function Home() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [nftList, setNftList] = useState(null);

  const [exhibits, setExhibits] = useState<PublicKey[]>([]);

  const mx = Metaplex.make(connection);
  useEffect(() => {
    const fetch = async () => {
      const nftList = await mx.nfts().findAllByOwner(publicKey);
      setNftList(nftList);

      let allExhibitAccounts = await connection.getProgramAccounts(
        EXHIBITION_PROGRAM_ID
      );

      let exhibitPubkeys: PublicKey[] = [];

      allExhibitAccounts.forEach((exhibitAccount) =>
        exhibitPubkeys.push(exhibitAccount.pubkey)
      );

      setExhibits(exhibitPubkeys);
    };
    if (publicKey) {
      fetch();
    }
  }, [publicKey]);
  return (
    <div className="flex w-full">
      <div className="grid w-1/2 bg-base-300">
        <h2>Deposit your NFTs</h2>
        {publicKey ? (
          <>
            <NftProvider>
              <UserView nftList={nftList} />
            </NftProvider>
          </>
        ) : (
          <p>Connect your Wallet to view your NFTs</p>
        )}
      </div>

      <div className="divider divider-horizontal" />

      <div className="grid w-1/2 bg-base-300">
        <h2>Explore all Exhibits</h2>
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
      </div>
    </div>
  );
}
