import NftCard from "@/components/NftCard";
import { Project } from "@/utils/interfaces";
import { useNftContext } from "@/context/NftContext";
import { Nft } from "@metaplex-foundation/js";

interface NftListProps {
  nftList: Nft[] | null;
  exhibitKey?: String;
  extraInfo?: boolean;
}
export default function NftList({
  nftList,
  exhibitKey,
  extraInfo = false,
}: NftListProps) {
  // const { nftPubkey, setNftPubkey } = useNftContext();

  return (
    <div className="flex flex-row justify-items-center auto-cols-max">
      {nftList &&
        nftList.map((nft: Nft, ind) => (
          <NftCard
            nft={nft}
            exhibitKey={exhibitKey}
            key={ind}
            index={ind}
            extraInfo={extraInfo}
          />
        ))}
    </div>
  );
}
