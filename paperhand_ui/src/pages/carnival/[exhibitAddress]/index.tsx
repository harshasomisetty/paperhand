import { AccountInfo, PublicKey } from "@solana/web3.js";
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
import { checkIfAccountExists } from "@/utils/retrieveData";
import {
  getAllBooths,
  getBoothNfts,
  getOpenBoothId,
} from "@/utils/carnival_data";
import { getCarnivalAccounts } from "@/utils/accountDerivation";
import NftList from "@/components/NftList";
import CarnivalInfoCard from "@/components/CarnivalInfoCard";
import BoothList from "@/components/BoothList";
import CarnivalBidCard from "@/components/CarnivalBidCard";
import { NftProvider } from "@/context/NftContext";

const CarnivalPage = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");

  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  const [booths, setBooths] = useState({});
  const [floor, setFloor] = useState<number>(1);
  const [boothNfts, setBoothNfts] = useState<Nft[]>([]);

  const [userNftList, setUserNftList] = useState<Nft[]>([]);
  const [tab, setTab] = useState(2);

  const mx = Metaplex.make(connection);
  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);

      let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
      setExhibitSymbol(exhibitInfo.exhibitSymbol);
      let { carnival } = await getCarnivalAccounts(exhibit);

      let numBooths = await getOpenBoothId(carnival, connection, wallet);

      let boothInfos = await getAllBooths(
        connection,
        exhibit,
        numBooths,
        wallet
      );

      console.log("booth infos", boothInfos[0].data);
      setBooths(boothInfos);

      for (let index of Object.keys(boothInfos)) {
        let booth = boothInfos[index].publicKey;

        let fetchedNfts = await getBoothNfts(connection, mx, exhibit, booth);

        setBoothNfts(fetchedNfts);
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

  return (
    <NftProvider>
      <div className="grid grid-cols-2">
        <div className="flex flex-col justify-between w-1/2">
          <CarnivalInfoCard
            carnivalNfts={boothNfts}
            exhibitSymbol={exhibitSymbol}
            floor={floor}
          />
          <CarnivalBidCard carnivalNfts={boothNfts} />
        </div>
        <div className="flex flex-col items-center ">
          <div className="tabs justify-self-center">
            <a
              className={`tab tab-lifted ${tab == 0 && "tab-active"}`}
              onClick={() => setTab(0)}
            >
              Buy
            </a>
            <a
              className={`tab tab-lifted ${tab == 1 && "tab-active"}`}
              onClick={() => setTab(1)}
            >
              Sell
            </a>
            <a
              className={`tab tab-lifted ${tab == 2 && "tab-active"}`}
              onClick={() => setTab(2)}
            >
              Pools
            </a>
          </div>
          {tab == 0 && <NftList nftList={boothNfts} title={"Carnival NFTS"} />}
          {tab == 1 && <NftList nftList={userNftList} title={"Your NFTS"} />}
          {tab == 2 && (
            <BoothList boothList={booths} exhibitSymbol={exhibitSymbol} />
          )}
        </div>
      </div>
    </NftProvider>
  );
};

export default CarnivalPage;
