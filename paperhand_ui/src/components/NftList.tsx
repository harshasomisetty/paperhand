import NftCard from "@/components/NftCard";
import { getAllNftImages } from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useEffect, useState } from "react";

export default function NftList({
  nftList,
  exhibitKey,
  title,
}: {
  nftList: Nft[] | null;
  exhibitKey?: string;
  title?: string;
}) {
  const [nftImages, setNftImages] = useState<string[]>();

  useEffect(() => {
    // fetch data is run twice, so need to see if metadata task is currently running
    async function fetchData() {
      let images = await getAllNftImages(nftList);
      setNftImages(images);
    }
    fetchData();
  }, [nftList]);
  return (
    <div className="card flex-shrink-0 w-full border border-neutral-focus shadow-lg bg-base-300">
      <div className="flex flex-col p-4 m-2" backgrou>
        {title && <h1 className="text-xl font-extrabold p-2">{title}</h1>}
        <div className="flex flex-row flex-wrap gap-4 justify-items-center auto-cols-max">
          {nftList.length > 0 ? (
            <>
              {nftImages &&
                nftList.map((nft: Nft, ind) => (
                  <NftCard
                    nft={nft}
                    nftImage={nftImages[ind]}
                    exhibitKey={exhibitKey}
                    key={ind}
                    index={ind}
                  />
                ))}
            </>
          ) : (
            <p>No NFTs!</p>
          )}
        </div>
      </div>
    </div>
  );
}
