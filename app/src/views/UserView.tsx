import NftList from "@/components/NftList";
import { NftContext } from "@/context/NftContext";
import { instructionDepositNft } from "@/utils/instructions";
import {
  checkIfAccountExists,
  checkIfExhibitExists,
  getExhibitAddress,
} from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";

interface HomeViewProps {
  nftList: Nft[] | null;
}
export default function UserView({ nftList }: HomeViewProps) {
  const { selectedNft, setSelectedNft } = useContext(NftContext);
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();

  const router = useRouter();
  async function depositNft() {
    console.log("depsoiting", selectedNft.name);

    await instructionDepositNft(
      wallet,
      publicKey,
      signTransaction,
      selectedNft,
      connection
    );
    router.reload(window.location.pathname);
  }

  const [selectedList, setSelectedList] = useState(true);
  const [nftColLists, setNftColLists] = useState();
  const [nftColPics, setNftColPics] = useState();

  useEffect(() => {
    async function fetchData() {
      let colLists = {};
      for (let nft of nftList!) {
        if (nft.symbol in colLists) {
          colLists[nft.symbol].push(nft);
        } else {
          colLists[nft.symbol] = [nft];
        }
      }
      setNftColLists(colLists);

      let colImages = {};
      for (let nftSymbol of Object.keys(colLists)) {
        let nfts = colLists[nftSymbol].slice(0, 3);
        let imagePromises = [];
        for (let nft of nfts) {
          if (!nft.metadataTask.isRunning()) {
            imagePromises.push(nft.metadataTask.run());
          }
        }
        await Promise.all(imagePromises);
        let images = [];
        for (let nft of nfts) {
          images.push(nft.metadata.image);
        }
        colImages[nftSymbol] = images;
      }
      setNftColPics(colImages);
    }
    if (nftList) {
      fetchData();
    }
  }, [nftList]);

  return (
    <>
      {nftColLists ? (
        <div className="flex flex-row gap-4">
          {Object.keys(nftColLists).map((nftSymbol: string, ind) => (
            <>
              <div className="card w-56 bg-base-100 shadow-xl h-fit" key={ind}>
                {nftColPics && (
                  <div className="stack px-5 pt-5">
                    {nftColPics[nftSymbol].map((image: string, ind) => (
                      <img src={image} alt={nftSymbol} key={ind} />
                    ))}
                  </div>
                )}
                <div className="card-body">
                  <a href={`#${nftSymbol}-modal`}>
                    <button className="btn btn-primary">
                      Your {nftSymbol}s
                    </button>
                  </a>
                  <div className="modal" id={`${nftSymbol}-modal`}>
                    <div className="modal-box relative">
                      <h3 className="font-bold text-lg">
                        {nftSymbol} Exhibit!
                      </h3>
                      <NftList nftList={nftColLists[nftSymbol]} />

                      <div className="btn-group gap-3 justify-end">
                        {selectedNft && (
                          <>
                            <div className="modal-action" onClick={depositNft}>
                              <a href="#" className="btn btn-success">
                                Deposit {selectedNft.name}
                              </a>
                            </div>
                          </>
                        )}
                        <div className="modal-action">
                          <a href="#" className="btn btn-error">
                            Cancel
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ))}
        </div>
      ) : (
        <p>Loading data</p>
      )}
    </>

    // <div>
    //   <NftList nftList={nftList} />
    // </div>
  );
}
