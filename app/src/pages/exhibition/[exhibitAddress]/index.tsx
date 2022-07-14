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
  const [userTokenVoucher, setUserTokenVoucher] = useState<number>(0);
  const { wallet, publicKey } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      console.log("fetching in exhibit/exhibtAddress");
      let exhibit = new PublicKey(exhibitAddress);
      let exhibitExists = await checkIfAccountExists(exhibit, connection);

      if (exhibitExists) {
        let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
        setExhibitSymbol(exhibitInfo.exhibitSymbol);
        let allNfts = await getAllExhibitArtifacts(exhibit, connection);
        setNftList(allNfts);

        let userTokenVoucherBal = await getUserVoucherTokenBal(
          exhibit,
          publicKey,
          connection
        );
        setUserTokenVoucher(userTokenVoucherBal);
      }
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  return (
    <>
      <div className="grid grid-cols-2">
        <NftProvider>
          <SingleExhibitView
            nftList={nftList}
            exhibitSymbol={exhibitSymbol}
            userTokenVoucherBal={userTokenVoucher}
          />
        </NftProvider>
        <SwapView />
      </div>
    </>
  );
};

export default ExploreProjects;
