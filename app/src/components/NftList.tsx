import NftCard from "@/components/NftCard";
import { Nft } from "@metaplex-foundation/js";

interface NftListProps {
  nftList: Nft[] | null;
  exhibitKey?: String;
}
export default function NftList({ nftList, exhibitKey }: NftListProps) {
  return (
    <div className="flex flex-row flex-wrap gap-4 justify-items-center auto-cols-max">
      {nftList &&
        nftList.map((nft: Nft, ind) => (
          <NftCard nft={nft} exhibitKey={exhibitKey} key={ind} index={ind} />
        ))}
    </div>
  );
}
