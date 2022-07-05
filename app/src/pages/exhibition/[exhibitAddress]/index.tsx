import { PublicKey, Connection, AccountInfo } from "@solana/web3.js";
import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program } from "@project-serum/anchor";
import { useRouter } from "next/router";
import { Metaplex, Nft } from "@metaplex-foundation/js";
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";

import { IDL as EXHIBITION_IDL } from "@/target/types/exhibition";
import * as ExhibitionJson from "@/target/idl/exhibition.json";

import { getProvider } from "@/utils/provider";
import ProjectList from "@/components/ProjectList";
import { Project } from "@/utils/interfaces";

const connection = new Connection("http://localhost:8899", "processed");
const EXHIBITION_PROGRAM_ID = new PublicKey(
  ExhibitionJson["metadata"]["address"]
);

// TODO check if exhibit even exists
const ExploreProjects = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState("");
  const [NFTs, setNFTs] = useState<Nft[]>([]);
  const { wallet, publicKey, sendTransaction } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  console.log("zero wall", wallet);
  useEffect(() => {
    async function fetchData() {
      let provider = await getProvider(wallet);
      let Exhibition = new Program(
        EXHIBITION_IDL,
        EXHIBITION_PROGRAM_ID,
        provider
      );

      const metaplex = Metaplex.make(provider.connection);

      let exhibit = new PublicKey(exhibitAddress);

      let exhibitBal = await connection.getBalance(exhibit);
      if (exhibitBal > 0) {
        let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
        setExhibitSymbol(exhibitInfo.exhibitSymbol);

        let allArtifactAccounts = await connection.getTokenAccountsByOwner(
          exhibit,
          {
            programId: TOKEN_PROGRAM_ID,
          }
        );

        let artifactKeys = [];
        allArtifactAccounts.value.forEach((x, i) => {
          // console.log("Artifact", x.pubkey.toString());
          artifactKeys.push(x.pubkey);
        });

        let artifactMints = [];
        artifactKeys.forEach(async (key, i) => {
          let tokenAccount = await getAccount(provider.connection, key);
          // console.log("TOKEN ACCOUNT", tokenAccount.mint.toString());
          artifactMints.push(tokenAccount.mint);
        });

        console.log("setting nfts");
        let allNFTs = await metaplex.nfts().findAllByMintList(artifactMints);
        console.log(allNFTs);
        setNFTs(allNFTs);
      }
    }
    if (wallet && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress]);
  return (
    <div>
      {wallet ? (
        <div>
          <h2>Explore this Exhibit</h2>
          <p>exhibitSymbol: {exhibitSymbol}</p>
          {NFTs.map((nft) => (
            <p>{nft.name}</p>
          ))}
        </div>
      ) : (
        <p>wallet not connected</p>
      )}
    </div>
  );
};

export default ExploreProjects;
