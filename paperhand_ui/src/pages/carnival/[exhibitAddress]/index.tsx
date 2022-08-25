import { AccountInfo, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
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
import BoothView from "@/components/BoothView";
import CarnivalBidCard from "@/components/CarnivalBidCard";
import { NftContext, NftProvider } from "@/context/NftContext";

const CarnivalPage = () => {
  const [exhibitSymbol, setExhibitSymbol] = useState<string>("");

  const { wallet, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  const [floor, setFloor] = useState<number>(1);
  const [boothNfts, setBoothNfts] = useState<Nft[]>([]);
  const [boothInfos, setBoothInfos] = useState<
    Record<number, { publicKey: PublicKey; account: AccountInfo<Buffer> }>
  >({});
  const [userNftList, setUserNftList] = useState<Nft[]>([]);
  const [tab, setTab] = useState(0);

  const { chosenNfts, clearNfts, nftPrices, groupDetails } =
    useContext(NftContext);

  // TODO dict of chosen nfts that map from mint to price
  // TODO dict of nft mint that maps to booth
  // TODO Dict of booth mint to nftList, price, delta, etc
  // TODO function that takes in booth details, and spits out new price depending on buy or sell
  // TODO on user selects nft, update booth details, calculate new price array, update lists

  const mx = Metaplex.make(connection);
  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);

      let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
      setExhibitSymbol(exhibitInfo.exhibitSymbol);
      let { carnival } = await getCarnivalAccounts(exhibit);

      // console.log("booth info", carnival, connection, wallet);
      let numBooths = await getOpenBoothId(carnival, connection, wallet);

      let fetchedBoothInfos = await getAllBooths(
        connection,
        exhibit,
        numBooths,
        wallet
      );

      setBoothInfos(fetchedBoothInfos);

      let boothNftObj = {};

      for (let index of Object.keys(fetchedBoothInfos)) {
        let booth = fetchedBoothInfos[index].publicKey;

        let fetchedNfts = await getBoothNfts(connection, mx, exhibit, booth);

        boothNftObj[booth.toString()] = fetchedNfts;
      }

      let allBoothNfts = Object.keys(boothNftObj).reduce(function (res, v) {
        return res.concat(boothNftObj[v]);
      }, []);

      setBoothNfts(allBoothNfts);

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

  // useEffect(() => {
  //   setNftPrices({});
  // }, [chosenNfts]);

  return (
    <NftProvider>
      <div className="grid grid-cols-3">
        <div className="flex flex-col items-stretch col-span-1">
          <CarnivalInfoCard
            carnivalNfts={boothNfts}
            exhibitSymbol={exhibitSymbol}
            floor={floor}
          />
          <CarnivalBidCard
            exhibitSymbol={exhibitSymbol}
            carnivalNfts={Object.keys(boothNfts).reduce(function (res, v) {
              return res.concat(boothNfts[v]);
            }, [])}
          />
        </div>
        <div className="flex flex-col items-center col-span-2">
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
              Booths
            </a>
          </div>
          {tab == 0 && <NftList nftList={boothNfts} title={"Carnival NFTS"} />}
          {tab == 1 && <NftList nftList={userNftList} title={"Your NFTS"} />}
          {tab == 2 && <BoothView exhibitSymbol={exhibitSymbol} />}
        </div>
      </div>
    </NftProvider>
  );
};

export default CarnivalPage;
