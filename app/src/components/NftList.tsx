import NftCard from "@/components/NftCard";
import { Nft } from "@metaplex-foundation/js";

export default function NftList({
  nftList,
  exhibitKey,
}: {
  nftList: Nft[] | null;
  exhibitKey?: string;
}) {
  return (
    <div className="flex flex-row flex-wrap gap-4 justify-items-center auto-cols-max">
      {nftList &&
        nftList.map((nft: Nft, ind) => (
          <NftCard nft={nft} exhibitKey={exhibitKey} key={ind} index={ind} />
        ))}
    </div>
  );
}
