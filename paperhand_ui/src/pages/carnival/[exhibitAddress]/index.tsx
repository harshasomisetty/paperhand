import { AccountInfo, PublicKey } from "@solana/web3.js";
import { useState, useEffect } from "react";
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
  getAllBooths,
  getBoothNfts,
  getOpenBoothId,
} from "@/utils/carnival_data";
import { getCarnivalAccounts } from "@/utils/accountDerivation";
import CarnivalInfoCard from "@/components/CarnivalInfoCard";
import CarnivalBidCard from "@/components/CarnivalBidCard";
import { NftProvider } from "@/context/NftContext";
import CarnivalAssets from "@/components/CarnivalAssets";

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
        <CarnivalAssets
          boothNfts={boothNfts}
          userNftList={userNftList}
          exhibitSymbol={exhibitSymbol}
          tab={tab}
          setTab={setTab}
        />
      </div>
    </NftProvider>
  );
};

export default CarnivalPage;
