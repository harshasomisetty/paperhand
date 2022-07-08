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

import NftList from "@/components/NftList";
import {
  checkIfAccountExists,
  getAllExhibitArtifacts,
  getUserRedeemTokenBal,
} from "@/utils/retrieveData";

// TODO check if exhibit even exists
const ExploreProjects = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState("");
  const [redeemTokenVal, setRedeemTokenVal] = useState<number>();
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

        let userRedeemTokenBal = await getUserRedeemTokenBal(
          exhibit,
          publicKey,
          connection
        );
        setRedeemTokenVal(Number(userRedeemTokenBal));
      }
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);
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
