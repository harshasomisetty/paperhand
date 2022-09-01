import InitVisitCard from "@/components/InitVisitCard";
import NftList from "@/components/NftList";
import { getNftDerivedAddresses } from "@/utils/accountDerivation";
import { getAllNftImages } from "@/utils/retrieveData";
import { Metaplex } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function ProfileExhibitPage() {
  // TODO check if exhibit already exists, if not, allow user to create exhibit
  // then go to exhibit page

  const [nftColPics, setNftColPics] = useState([]);
  const [colNfts, setColNfts] = useState([]);
  const [colSymbol, setColSymbol] = useState([]);

  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const router = useRouter();
  const { exhibitAddress } = router.query;

  // async function executeInitCheckoutAndExhibit() {
  //   console.log("init checkout exhibit");

  //   let nft = chosenNfts[Object.keys(chosenNfts)[0]];

  //   console.log("creating checkout ", nft.name);
  //   await instructionInitCheckoutExhibit(
  //     wallet,
  //     publicKey,
  //     signTransaction,
  //     connection,
  //     nft
  //   );
  // }

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

  return (
    <div className="grid grid-cols-2 items-center">
      <NftList nftList={colNfts} title={"Your " + colSymbol + "s"} />
      <InitVisitCard />
    </div>
  );
}
