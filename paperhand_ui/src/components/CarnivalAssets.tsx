import NftList from "@/components/NftList";
import BoothView from "@/components/BoothView";
import { Nft } from "@metaplex-foundation/js";
import { useContext } from "react";
import { NftContext } from "@/context/NftContext";

const CarnivalAssets = ({
  boothNfts,
  userNftList,
  exhibitSymbol,
  tab,
  setTab,
}: {
  boothNfts: Nft[];
  userNftList: Nft[];
  exhibitSymbol: string;
  tab: number;
  setTab: (a: number) => {};
}) => {
  const { clearNfts } = useContext(NftContext);

  return (
    <div className="flex flex-col items-center col-span-2">
      <ul className="menu menu-horizontal justify-self-center bg-base-100 w-56">
        <li className={`${tab == 0 && "bordered"}`}>
          <a
            onClick={() => {
              setTab(0);
              clearNfts();
            }}
          >
            Buy
          </a>
        </li>
        <li className={`${tab == 1 && "bordered"}`}>
          <a
            onClick={() => {
              setTab(1);
              clearNfts();
            }}
          >
            Sell
          </a>
        </li>
        <li className={`${tab == 2 && "bordered"}`}>
          <a
            onClick={() => {
              setTab(2);
              clearNfts();
            }}
          >
            Booths
          </a>
        </li>
      </ul>
      {tab == 0 && <NftList nftList={boothNfts} title={"Carnival NFTS"} />}
      {tab == 1 && <NftList nftList={userNftList} title={"Your NFTS"} />}
      {tab == 2 && <BoothView exhibitSymbol={exhibitSymbol} />}
    </div>
  );
};

export default CarnivalAssets;
