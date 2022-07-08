import { Metaplex } from "@metaplex-foundation/js";
import { useEffect, useState } from "react";

import NftList from "@/components/NftList";
import { NftProvider } from "@/context/NftContext";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export default function Home() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [nftList, setNftList] = useState(null);
  const mx = Metaplex.make(connection);

  useEffect(() => {
    const fetch = async () => {
      const nftList = await mx.nfts().findAllByOwner(publicKey);
      setNftList(nftList);
    };
    if (publicKey) {
      fetch();
    }
  }, [publicKey]);
  return (
    <>
      {publicKey ? (
        <div>
          <p>Select one of your NFTs to Deposit into an Exhibit</p>
          <NftProvider>
            <NftList nftList={nftList} />
          </NftProvider>
        </div>
      ) : (
        <p> Please connect Wallet</p>
      )}
    </>
  );
}
