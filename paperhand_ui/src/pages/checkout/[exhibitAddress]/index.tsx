import { PublicKey } from "@solana/web3.js";
import { useState, useEffect, useContext } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import {
  bundlrStorage,
  keypairIdentity,
  Metaplex,
  Nft,
} from "@metaplex-foundation/js";

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
import PanicCard from "@/components/PanicCard";

const CheckoutPage = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");
  const [userNftList, setUserNftList] = useState<Nft[]>([]);
  const [exhibitNftList, setExhibitNftList] = useState<Nft[]>([]);
  const [userData, setUserData] = useState<UserData>(null);

  const [bidSide, setBidSide] = useState<boolean>(true);

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
        let exhibitNfts = await getAllExhibitArtifacts(exhibit, connection);
        setExhibitNftList(exhibitNfts);
        let uData = await getUserData(exhibit, publicKey, connection);
        setUserData(uData);
      }

      const allUserNfts = await mx.nfts().findAllByOwner(publicKey);

      const curNfts = [];
      for (let nft of allUserNfts!) {
        if (nft.symbol == exhibitInfo.exhibitSymbol) {
          curNfts.push(nft);
        }
      }
      setUserNftList(curNfts);
    }
    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);

  const PanicMenu = () => {
    return (
      <ul
        className="menu menu-horizontal bg-base-300 rounded-box border border-neutral-focus"
        onClick={() => {
          setBidSide(!bidSide);
        }}
      >
        <li>
          <a className={`${bidSide && "active"}`}>Bid NFT</a>
        </li>
        <li>
          <a className={`${!bidSide && "active"}`}>Panic Sell NFT</a>
        </li>
      </ul>
    );
  };

  return (
    <>
      {exhibitSymbol && (
        <NftProvider>
          <div className="grid grid-cols-2">
            {bidSide ? (
              <>
                <div className="opacity-50 pointer-events-none">
                  <NftList
                    nftList={exhibitNftList}
                    title={"Place Bid to Get One of these NFTs!"}
                  />
                </div>
                <div className="flex flex-col border rounded-md border-base-300 p-4 m-2 items-center">
                  <PanicMenu />
                  <BidCard userNftList={userNftList} />
                  <Orderbook />
                </div>
              </>
            ) : (
              <>
                <NftList nftList={userNftList} title={"Your NFTs"} />
                <div className="flex flex-col border rounded-md border-base-300 p-4 m-2 items-center">
                  <PanicMenu />
                  <PanicCard userNftList={userNftList} />
                  <Orderbook />
                </div>
              </>
            )}
          </div>
        </NftProvider>
      )}
    </>
  );
};

export default CheckoutPage;
