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
  const [tab, setTab] = useState(0);

  const [prices, setPrices] = useState<number[]>([]);

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

      let numBooths = await getOpenBoothId(carnival, connection, wallet);

      let boothInfos = await getAllBooths(
        connection,
        exhibit,
        numBooths,
        wallet
      );

      setBooths(boothInfos);

      // nft maps to mint
      let nftsToBooth: Record<string, string> = {};
      let boothNfts: Record<string, Nft[]> = {};
      let tempPrices = [];
      let i = 1;

      for (let index of Object.keys(boothInfos)) {
        let booth = boothInfos[index].publicKey;

        let fetchedNfts = await getBoothNfts(connection, mx, exhibit, booth);

        for (let nft of fetchedNfts) {
          nftsToBooth[nft.mint.toString()] = booth.toString();
          tempPrices.push(i * LAMPORTS_PER_SOL);
          i = i + 1;
        }
        boothNfts[booth.toString()] = fetchedNfts;
      }

      setPrices(tempPrices);

      setBoothNfts(boothNfts);

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
      <div className="grid grid-cols-3">
        <div className="flex flex-col w-1/2">
          <CarnivalInfoCard
            carnivalNfts={Object.keys(boothNfts).reduce(function (res, v) {
              return res.concat(boothNfts[v]);
            }, [])}
            exhibitSymbol={exhibitSymbol}
            floor={floor}
          />
          <CarnivalBidCard
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
          {tab == 0 && (
            <NftList
              nftList={Object.keys(boothNfts).reduce(function (res, v) {
                return res.concat(boothNfts[v]);
              }, [])}
              title={"Carnival NFTS"}
              prices={prices}
            />
          )}
          {tab == 1 && <NftList nftList={userNftList} title={"Your NFTS"} />}
          {tab == 2 && (
            <BoothList
              boothList={booths}
              exhibitSymbol={exhibitSymbol}
              title={"Existing Booths"}
            />
          )}
        </div>
      </div>
    </NftProvider>
  );
};

export default CarnivalPage;
