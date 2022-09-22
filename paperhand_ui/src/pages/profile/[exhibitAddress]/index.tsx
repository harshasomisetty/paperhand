import InitVisitCard from "@/components/InitVisitCard";
import NftList from "@/components/NftList";
import { NftProvider } from "@/context/NftContext";
import { getNftDerivedAddresses } from "@/utils/accountDerivation";
import { getAllNftImages } from "@/utils/retrieveData";
import { Metaplex } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ProfileExhibitPage() {
  // TODO check if exhibit already exists, if not, allow user to create exhibit
  // then go to exhibit page

  const [nftColPics, setNftColPics] = useState<string[]>([]);
  const [colNfts, setColNfts] = useState<Nft[]>([]);
  const [colSymbol, setColSymbol] = useState([]);

  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  const mx = Metaplex.make(connection);

  useEffect(() => {
    const fetch = async () => {
      const nftList = await mx.nfts().findAllByOwner(publicKey);

      let filteredNfts = [];
      // setNftList(nftList);
      let colLists = {};
      let colNames = {};
      for (let nft of nftList!) {
        let { exhibit } = await getNftDerivedAddresses(nft);
        if (exhibit.toString() == exhibitAddress) {
          filteredNfts.push(nft);
        }
      }

      setColNfts(filteredNfts);
      setColSymbol(filteredNfts[0].symbol);

      let images = await getAllNftImages(filteredNfts);
      setNftColPics(images);
    };
    if (publicKey) {
      fetch();
    }
  }, [publicKey]);

  if (!colNfts[0] || !colSymbol) {
    return <p>loading data</p>;
  }

  return (
    <NftProvider>
      <div className="grid grid-cols-2">
        <NftList nftList={colNfts} title={"Your " + colSymbol + "s"} />
        <div className="flex flex-col  items-center pt-14">
          <InitVisitCard nft={colNfts[0]} exhibitSymbol={colSymbol} />
        </div>
      </div>
    </NftProvider>
  );
}
