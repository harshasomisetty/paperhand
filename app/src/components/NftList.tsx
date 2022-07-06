import NftCard from "@/components/NftCard";
import { Project } from "@/utils/interfaces";

import { Nft } from "@metaplex-foundation/js";

interface NftListProps {
  nftList: Nft[];
  exhibitKey: String;
}
export default function NftList({ nftList, exhibitKey }: NftListProps) {
  return (
    <div className="grid grid-cols-3 justify-items-center auto-cols-max">
      {nftList.map((nft: Nft, ind) => (
        <NftCard nft={nft} exhibitKey={exhibitKey} key={ind} />
      ))}
    </div>
  );
}
