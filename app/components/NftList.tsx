import NftCard from "@/components/NftCard";
import { Project } from "@/utils/interfaces";

import { Nft } from "@metaplex-foundation/js";

interface NftListProps {
  nftList: Nft[] | null;
  exhibitKey?: String;
  selected?: number;
  extraInfo?: boolean;
}
export default function NftList({
  nftList,
  exhibitKey,
  selected,
  extraInfo = false,
}: NftListProps) {
  return (
    <div className="flex flex-row justify-items-center auto-cols-max">
      {nftList &&
        nftList.map((nft: Nft, ind) => (
          <NftCard
            nft={nft}
            exhibitKey={exhibitKey}
            key={ind}
            selected={`${ind === selected ? true : false}`}
            extraInfo={extraInfo}
          />
        ))}
    </div>
  );
}
