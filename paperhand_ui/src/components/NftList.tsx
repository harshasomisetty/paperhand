import NftCard from "@/components/NftCard";
import { NftContext } from "@/context/NftContext";
import { getCarnivalAccounts } from "@/utils/accountDerivation";
import {
  getAllBooths,
  getBoothNfts,
  getOpenBoothId,
} from "@/utils/carnival_data";
import { getAllNftImages } from "@/utils/retrieveData";
import { Metaplex, Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";

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
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();

  const router = useRouter();
  const { exhibitAddress } = router.query;

  const { nftPrices, setNftPrices, groupDetails, setGroupDetails } =
    useContext(NftContext);

  const mx = Metaplex.make(connection);
  useEffect(() => {
    // fetch data is run twice, so need to see if metadata task is currently running
    async function fetchData() {
      let images = await getAllNftImages(nftList);
      setNftImages(images);

      let exhibit = new PublicKey(exhibitAddress);
      let { carnival } = await getCarnivalAccounts(exhibit);

      let numBooths = await getOpenBoothId(carnival, connection, wallet);

      let boothInfos = await getAllBooths(
        connection,
        exhibit,
        numBooths,
        wallet
      );

      // nft maps to mint
      let nftsToBooth: Record<string, string> = {};
      let boothNfts: Record<string, Nft[]> = {};

      let tempGroupDetails: {
        [groupKey: string]: { startPrice: number; delta: number; fee: number };
      } = {};

      for (let index of Object.keys(boothInfos)) {
        let booth = boothInfos[index].publicKey;
        let boothInfo = boothInfos[index].data;

        let fetchedNfts = await getBoothNfts(connection, mx, exhibit, booth);

        for (let nft of fetchedNfts) {
          nftsToBooth[nft.mint.toString()] = booth.toString();
        }
        tempGroupDetails[booth.toString()] = {
          startPrice: boothInfo.spotPrice,
          delta: boothInfo.delta,
          fee: boothInfo.fee,
        };
        boothNfts[booth.toString()] = fetchedNfts;
      }

      setNftPrices(nftsToBooth);
      setGroupDetails(tempGroupDetails);
    }
    if (exhibitAddress && wallet) {
      fetchData();
    }
  }, [nftList, exhibitAddress]);

  return (
    <div className="card flex-shrink-0 w-full border border-neutral-focus shadow-lg bg-base-300">
      <div className="flex flex-col p-4 m-2">
        {title && <h1 className="text-xl font-extrabold p-2">{title}</h1>}
        <div className="flex flex-row flex-wrap gap-4 place-items-stretch auto-cols-max">
          {nftList.length > 0 ? (
            <>
              {nftImages &&
                nftList.map((nft: Nft, ind) => (
                  <div>
                    {nftPrices ? (
                      <>
                        <NftCard
                          nft={nft}
                          nftImage={nftImages[ind]}
                          key={ind}
                          price={nftPrices[nft.mint.toString()]}
                          index={ind}
                        />
                      </>
                    ) : (
                      <NftCard
                        nft={nft}
                        nftImage={nftImages[ind]}
                        key={ind}
                        index={ind}
                      />
                    )}
                  </div>
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
