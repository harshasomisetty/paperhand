import NftCard from "@/components/NftCard";
import { getAllNftImages } from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useEffect, useState } from "react";

export default function NftList({
  nftList,
  exhibitKey,
}: {
  nftList: Nft[] | null;
  exhibitKey?: string;
}) {
  const [nftImages, setNftImages] = useState<string[]>();

  useEffect(() => {
    // fetch data is run twice, so need to see if metadata task is currently running
    async function fetchData() {
      let images = await getAllNftImages(nftList);
      setNftImages(images);
      // console.log("nft list images", images);
    }
    fetchData();
  }, [nftList]);
  return (
    <div className="flex flex-row flex-wrap gap-4 justify-items-center auto-cols-max">
      {nftList &&
        nftImages &&
        nftList.map((nft: Nft, ind) => (
          <NftCard
            nft={nft}
            nftImage={nftImages[ind]}
            exhibitKey={exhibitKey}
            key={ind}
            index={ind}
          />
        ))}
    </div>
  );
}
