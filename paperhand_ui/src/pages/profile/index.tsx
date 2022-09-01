import { Metaplex } from "@metaplex-foundation/js";
import { useEffect, useState } from "react";
import { NftProvider } from "@/context/NftContext";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import UserNftList from "@/components/UserNftList";
import { EXHIBITION_PROGRAM_ID } from "@/utils/constants";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { getNftDerivedAddresses } from "@/utils/accountDerivation";
import { getAllNftImages } from "@/utils/retrieveData";
import DisplayImages from "@/components/DisplayImages";
import { useRouter } from "next/router";

export default function ProfilePage() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [nftList, setNftList] = useState(null);

  const [nftColLists, setNftColLists] = useState();
  const [nftColPics, setNftColPics] = useState();
  const [nftColNames, setNftColNames] = useState({});

  const router = useRouter();

  let base = router.route;

  const mx = Metaplex.make(connection);

  useEffect(() => {
    const fetch = async () => {
      const nftList = await mx.nfts().findAllByOwner(publicKey);
      setNftList(nftList);

      let colLists = {};
      let colNames = {};
      for (let nft of nftList!) {
        let { exhibit } = await getNftDerivedAddresses(nft);
        // colExhibits.push(exhibit.toString());
        colNames[exhibit.toString()] = nft.symbol;

        if (exhibit.toString() in colLists) {
          colLists[exhibit.toString()].push(nft);
        } else {
          colLists[exhibit.toString()] = [nft];
        }
      }
      setNftColLists(colLists);
      setNftColNames(colNames);

      let colImages = {};

      for (let exhibitKey of Object.keys(colLists)) {
        let nfts = colLists[exhibitKey].slice(0, 3);
        let images = await getAllNftImages(nfts);
        colImages[exhibitKey] = images;
      }
      setNftColPics(colImages);
    };
    if (publicKey) {
      fetch();
    }
  }, [publicKey]);

  if (!nftColLists || !nftColPics) {
    return <p>Loading data</p>;
  }

  return (
    <div className="card flex-shrink-0 w-full border border-neutral-focus shadow-lg bg-base-300 p-4">
      <h2 className="text-2xl font-extrabold m-2 mb-4">Your NFTs</h2>
      {publicKey ? (
        <div className="flex flex-row gap-4">
          {Object.keys(nftColLists).map((exhibitString: string, ind) => (
            <>
              <div
                className="card card-compact w-52 shadow-xl h-fit bg-base-300"
                key={ind}
              >
                {nftColPics && (
                  <DisplayImages images={nftColPics[exhibitString]} />
                )}
                <div className="card-body">
                  <a href={base + "/" + exhibitString}>
                    {" "}
                    <button className="btn btn-primary">
                      Your {nftColNames[exhibitString]}s
                    </button>
                  </a>
                </div>
              </div>
            </>
          ))}
        </div>
      ) : (
        <div className="border ">
          <p>Connect your Wallet to view your NFTs</p>
          <WalletMultiButton />
        </div>
      )}
    </div>
  );
}
