import { Metaplex } from "@metaplex-foundation/js";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";

import NftList from "@/components/NftList";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export default function Home() {
  const { connection } = useConnection();
  const { wallet, publicKey, sendTransaction } = useWallet();
  const [nftList, setNftList] = useState(null);
  const mx = Metaplex.make(connection);

  useEffect(() => {
    const fetch = async () => {
      // const list = await mx.nfts().findAllByOwner(new PublicKey(address));
      console.log(publicKey.toString());
      const list = await mx.nfts().findAllByOwner(publicKey);
      setNftList(list);
    };
    // execute();
    if (publicKey) {
      fetch();
    }
  }, [publicKey]);
  return (
    <>
      {publicKey ? (
        <div>
          <p>Your NFTs</p>
          <NftList nftList={nftList} />
        </div>
      ) : (
        <p> Please connect Wallet</p>
      )}
    </>
  );
}
