import { PublicKey } from "@solana/web3.js";
import { useState, useEffect } from "react";
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

import {
  checkIfAccountExists,
  getAllExhibitArtifacts,
  getUserData,
} from "@/utils/retrieveData";
import { NftProvider } from "@/context/NftContext";
import SingleExhibitView from "@/views/SingleExhibitView";
import SwapView from "@/views/SwapView";
import { UserData } from "@/utils/interfaces";

const ExploreProjects = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState<string>();
  const [nftList, setNftList] = useState<Nft[]>([]);
  const [userData, setUserData] = useState<UserData>();

  const { wallet, publicKey } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);
      let exhibitExists = await checkIfAccountExists(exhibit, connection);

      if (exhibitExists) {
        let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
        setExhibitSymbol(exhibitInfo.exhibitSymbol);
        let allNfts = await getAllExhibitArtifacts(exhibit, connection);
        setNftList(allNfts);
        let uData = await getUserData(exhibit, publicKey, connection);
        setUserData(uData);
      }
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  return (
    <>
      {userData ? (
        <>
          <div className="grid grid-cols-2">
            <NftProvider>
              <SingleExhibitView
                nftList={nftList}
                exhibitSymbol={exhibitSymbol}
                userData={userData}
              />
            </NftProvider>
            <SwapView />
          </div>
        </>
      ) : (
        <p>Loading data</p>
      )}
    </>
  );
};

export default ExploreProjects;
