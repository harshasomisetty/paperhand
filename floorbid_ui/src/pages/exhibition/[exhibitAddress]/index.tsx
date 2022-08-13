import { PublicKey } from "@solana/web3.js";
import { useState, useEffect, useContext } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { Metaplex, Nft } from "@metaplex-foundation/js";
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
import { NftContext, NftProvider } from "@/context/NftContext";
import { UserData } from "@/utils/interfaces";
import Orderbook from "@/components/Orderbook";
import NftList from "@/components/NftList";
import BidCard from "@/components/BidCard";

const ExploreProjects = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");
  const [nftList, setNftList] = useState<Nft[]>([]);
  const [userData, setUserData] = useState<UserData>(null);

  const [bidSide, setBidSide] = useState<boolean>(true);

  const { selectedNft } = useContext(NftContext);

  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  const mx = Metaplex.make(connection);
  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);
      let exhibitExists = await checkIfAccountExists(exhibit, connection);

      let exhibitInfo;
      if (exhibitExists) {
        exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
        setExhibitSymbol(exhibitInfo.exhibitSymbol);
        // let allNfts = await getAllExhibitArtifacts(exhibit, connection);
        // setNftList(allNfts);
        let uData = await getUserData(exhibit, publicKey, connection);
        setUserData(uData);
      }

      const allNftList = await mx.nfts().findAllByOwner(publicKey);

      const curNfts = [];
      for (let nft of allNftList!) {
        if (nft.symbol == exhibitInfo.exhibitSymbol) {
          curNfts.push(nft);
        }
      }
      setNftList(curNfts);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  async function withdrawNft() {
    console.log("withdrawing nft");

    await instructionWithdrawNft(
      wallet,
      publicKey,
      signTransaction,
      selectedNft,
      connection
    );
    router.reload(window.location.pathname);
  }

  return (
    <>
      {exhibitSymbol && (
        <NftProvider>
          <div className="grid grid-cols-3">
            <Orderbook />
            {userData ? (
              <BidCard bidSide={bidSide} setBidSide={setBidSide} />
            ) : (
              <p>Loading market data</p>
            )}
            <NftList nftList={nftList} />
          </div>
        </NftProvider>
      )}
    </>
  );
};

export default ExploreProjects;
