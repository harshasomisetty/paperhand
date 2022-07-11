import { PublicKey } from "@solana/web3.js";
import { useState, useEffect, useContext } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { Nft } from "@metaplex-foundation/js";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddress,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { getExhibitProgramAndProvider } from "@/utils/constants";

import NftList from "@/components/NftList";
import {
  checkIfAccountExists,
  getAllExhibitArtifacts,
  getUserVoucherTokenBal,
} from "@/utils/retrieveData";
import { NftContext, NftProvider } from "@/context/NftContext";
import SingleExhibitView from "@/views/SingleExhibitView";
import SwapView from "@/views/SwapView";

// TODO check if exhibit even exists
const ExploreProjects = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState();
  const [nftList, setNftList] = useState<Nft[]>([]);
  const { wallet, publicKey } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  useEffect(() => {
    async function fetchData() {
      console.log("fetching");

      let { Exhibition } = await getExhibitProgramAndProvider(wallet);

      let exhibit = new PublicKey(exhibitAddress);

      let exhibitExists = await checkIfAccountExists(exhibit, connection);
      if (exhibitExists) {
        let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
        setExhibitSymbol(exhibitInfo.exhibitSymbol);

        let allNfts = await getAllExhibitArtifacts(exhibit, connection);
        setNftList(allNfts);
      }
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  return (
    <>
      {publicKey ? (
        <div className="grid grid-cols-2">
          <NftProvider>
            <SingleExhibitView
              nftList={nftList}
              exhibitSymbol={exhibitSymbol}
            />
          </NftProvider>
          <SwapView />
        </div>
      ) : (
        <p> Please connect Wallet</p>
      )}
    </>
  );
};

export default ExploreProjects;
