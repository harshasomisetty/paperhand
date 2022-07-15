import NftCard from "@/components/NftCard";
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
      let imagePromises = [];
      for (let nft of nftList) {
        if (!nft.metadataTask.isRunning()) {
          imagePromises.push(nft.metadataTask.run());
        }
      }
      await Promise.all(imagePromises);
      let images = [];
      for (let nft of nftList) {
        images.push(nft.metadata.image);
      }
      setNftImages(images);
      // console.log("nft list images", images);
    }
    fetchData();
  }, []);
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
