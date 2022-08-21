import { Metaplex } from "@metaplex-foundation/js";
import { useEffect, useState } from "react";
import { NftProvider } from "@/context/NftContext";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import UserNftList from "@/components/UserNftList";
import { EXHIBITION_PROGRAM_ID } from "@/utils/constants";
import ExhibitList from "@/components/ExhibitList";

// TODO add in display of changes account balance after the transaction is completed
// TODO make the nft withdrawing process more cleaner
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
    <div className="flex flex-col w-full space-y-4 ">
      <div className="grid m-4">
        <div className="card flex-shrink-0 w-full border border-neutral-focus shadow-lg bg-base-300 p-4">
          <h2 className="text-2xl font-extrabold m-2 mb-4">
            Explore Collections
          </h2>
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

      <div className="divider divide-neutral"></div>

      <div className="card flex-shrink-0 w-full border border-neutral-focus shadow-lg bg-base-300 p-4">
        <div className="grid m-4">
          <h2 className="text-2xl font-extrabold m-2 mb-4">Your NFTs</h2>
          {publicKey ? (
            <>
              <NftProvider>
                <UserNftList nftList={nftList} />
              </NftProvider>
            </>
          ) : (
            <p>Connect your Wallet to view your NFTs</p>
          )}
        </div>
      </div>
    </div>
  );
}
