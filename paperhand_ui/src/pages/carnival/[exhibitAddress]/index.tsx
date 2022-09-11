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

  const mx = Metaplex.make(connection);
  useEffect(() => {
    async function fetchData() {
      let { Exhibition } = await getExhibitProgramAndProvider(wallet);
      let exhibit = new PublicKey(exhibitAddress);

      let exhibitInfo = await Exhibition.account.exhibit.fetch(exhibit);
      setExhibitSymbol(exhibitInfo.exhibitSymbol);
      let { carnival } = await getCarnivalAccounts(exhibit);

      let numBooths = await getOpenBoothId(carnival, connection, wallet);

      let fetchedBoothInfos = await getAllBooths(
        connection,
        exhibit,
        numBooths,
        wallet
      );

      setBoothInfos(fetchedBoothInfos);

      let actualFloor = Number.MAX_VALUE;
      for (let index of Object.keys(fetchedBoothInfos)) {
        let data = fetchedBoothInfos[index].data;
        let tempFloor = Number(data.spotPrice);

        if (tempFloor < actualFloor) {
          actualFloor = tempFloor;
        }
      }
      setFloor(actualFloor);

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
            buy={tab == 0 ? true : false}
          />
        </div>
        <div className="flex flex-col items-center col-span-2">
          <ul className="menu menu-horizontal justify-self-center bg-base-100 w-56">
            <li className={`${tab == 0 && "bordered"}`}>
              <a onClick={() => setTab(0)}>Buy</a>
            </li>
            <li className={`${tab == 1 && "bordered"}`}>
              <a onClick={() => setTab(1)}>Sell</a>
            </li>
            <li className={`${tab == 2 && "bordered"}`}>
              <a onClick={() => setTab(2)}>Booths</a>
            </li>
          </ul>
          {tab == 0 && <NftList nftList={boothNfts} title={"Carnival NFTS"} />}
          {tab == 1 && <NftList nftList={userNftList} title={"Your NFTS"} />}
          {tab == 2 && <BoothView exhibitSymbol={exhibitSymbol} />}
        </div>
      </div>
    </NftProvider>
  );
};

export default CarnivalPage;
