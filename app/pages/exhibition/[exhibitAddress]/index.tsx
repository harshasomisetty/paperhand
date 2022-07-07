import { PublicKey, Connection, AccountInfo } from "@solana/web3.js";
import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program } from "@project-serum/anchor";
import { useRouter } from "next/router";
import { Metaplex, Nft } from "@metaplex-foundation/js";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { Exhibition, IDL as EXHIBITION_IDL } from "@/target/types/exhibition";
import * as ExhibitionJson from "@/target/idl/exhibition.json";

import { getProvider } from "@/utils/provider";
import NftList from "@/components/NftList";

const EXHIBITION_PROGRAM_ID = new PublicKey(
  ExhibitionJson["metadata"]["address"]
);

// TODO check if exhibit even exists
const ExploreProjects = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState("");
  const [redeemTokenVal, setRedeemTokenVal] = useState<number>();
  const [nftList, setNftList] = useState<Nft[]>([]);
  const { wallet, publicKey } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  // console.log("zero wall", wallet);
  useEffect(() => {
    async function fetchData() {
      let provider = await getProvider(wallet);
      console.log("idl json", ExhibitionJson);
      let Exhibition = new Program(
        EXHIBITION_IDL,
        EXHIBITION_PROGRAM_ID,
        provider
      );

      const metaplex = Metaplex.make(connection);

      let exhibit = new PublicKey(exhibitAddress);

      let exhibitBal = await connection.getBalance(exhibit);
      if (exhibitBal > 0) {
        let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
        setExhibitSymbol(exhibitInfo.exhibitSymbol);

        let allArtifactAccounts = (
          await connection.getTokenAccountsByOwner(exhibit, {
            programId: TOKEN_PROGRAM_ID,
          })
        ).value;

        let artifactMints = [];
        for (let i = 0; i < allArtifactAccounts.length; i++) {
          let key = allArtifactAccounts[i].pubkey;

          let tokenAccount = await getAccount(connection, key);
          artifactMints.push(tokenAccount.mint);
        }

        console.log("setting nfts");
        let allNfts = await metaplex.nfts().findAllByMintList(artifactMints);
        setNftList(allNfts);
      }

      if (publicKey) {
        // get user redeem token bal
        let [redeemMint] = await PublicKey.findProgramAddress(
          [Buffer.from("redeem_mint"), exhibit.toBuffer()],
          EXHIBITION_PROGRAM_ID
        );

        let userRedeemWallet = await getAssociatedTokenAddress(
          redeemMint,
          publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        let postUserRedeemTokenBal = await getAccount(
          connection,
          userRedeemWallet
        );
        setRedeemTokenVal(Number(postUserRedeemTokenBal.amount));
      }
    }
    if (wallet && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress]);
  return (
    <div>
      <h2>Explore the {exhibitSymbol} Exhibit</h2>
      <h3>List of NFTs deposited in exhibit</h3>
      <div>
        <NftList
          nftList={nftList}
          exhibitKey={exhibitAddress}
          extraInfo={true}
        />
        {publicKey && (
          <>
            <p>redeem bal: {redeemTokenVal}</p>
            {/* <Button>sdf</Button> */}
          </>
        )}
      </div>
    </div>
  );
};

export default ExploreProjects;
