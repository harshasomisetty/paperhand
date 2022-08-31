import { Metaplex } from "@metaplex-foundation/js";
import { useEffect, useState } from "react";
import { NftProvider } from "@/context/NftContext";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import UserNftList from "@/components/UserNftList";
import { EXHIBITION_PROGRAM_ID } from "@/utils/constants";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function ProfilePage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [nftList, setNftList] = useState(null);

  const mx = Metaplex.make(connection);

  useEffect(() => {
    const fetch = async () => {
      const nftList = await mx.nfts().findAllByOwner(publicKey);
      setNftList(nftList);

      // let allExhibitAccounts = await connection.getProgramAccounts(
      //   EXHIBITION_PROGRAM_ID
      // );

      // let exhibitPubkeys: PublicKey[] = [];

      // allExhibitAccounts.forEach((exhibitAccount) =>
      //   exhibitPubkeys.push(exhibitAccount.pubkey)
      // );

      // setExhibits(exhibitPubkeys);
    };
    if (publicKey) {
      fetch();
    }
  }, [publicKey]);

  return (
    <div className="card flex-shrink-0 w-full border border-neutral-focus shadow-lg bg-base-300 p-4">
      <h2 className="text-2xl font-extrabold m-2 mb-4">Your NFTs</h2>
      {publicKey ? (
        <>
          <NftProvider>
            <UserNftList nftList={nftList} />
          </NftProvider>
        </>
      ) : (
        <div className="border ">
          <p>Connect your Wallet to view your NFTs</p>
          <WalletMultiButton />
        </div>
      )}
    </div>
  );
}
