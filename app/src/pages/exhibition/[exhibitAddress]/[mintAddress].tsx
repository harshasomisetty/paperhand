import { PublicKey, Connection, AccountInfo } from "@solana/web3.js";
import { useState, useEffect } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Program } from "@project-serum/anchor";
import { useRouter } from "next/router";
import { Metaplex, Nft } from "@metaplex-foundation/js";
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";

import { Creator } from "@metaplex-foundation/mpl-token-metadata";
import { IDL as EXHIBITION_IDL } from "@/target/types/exhibition";
import * as ExhibitionJson from "@/target/idl/exhibition.json";

import { getProvider } from "@/utils/provider";
import NftList from "@/components/NftList";

const EXHIBITION_PROGRAM_ID = new PublicKey(
  ExhibitionJson["metadata"]["address"]
);

const NftPage = () => {
  const [nftData, setNftData] = useState<Nft>();
  const { connection } = useConnection();

  const router = useRouter();
  const { exhibitAddress, mintAddress } = router.query;
  useEffect(() => {
    async function fetchData() {
      const metaplex = Metaplex.make(connection);
      let mintKey = new PublicKey(mintAddress);
      const nft = await metaplex.nfts().findByMint(mintKey);
      setNftData(nft);
    }
    if (!nftData && mintAddress) {
      fetchData();
    }
  });
  return (
    <>
      {nftData ? (
        <div className="hero min-h-screen bg-base-200">
          <div className="hero-content flex-col lg:flex-row">
            <img
              src={nftData.metadata.image}
              alt={nftData.name}
              className="max-w-sm rounded-lg shadow-2xl"
            />
            <div>
              {/* <button class="btn btn-primary">Get Started</button> */}
              <h1 className="text-5xl font-bold">{nftData.name}</h1>
              <h2>{nftData.symbol} Collection</h2>
              <p>mint: {nftData.mint.toString()}</p>
              <p>uri: {nftData.uri}</p>
              <p>creators</p>
              <ul>
                {nftData.creators.map((creator, ind) => (
                  <li key={ind}> {creator.address.toString()} </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p>Nft data not loaded</p>
        </div>
      )}
    </>
  );
};

export default NftPage;
