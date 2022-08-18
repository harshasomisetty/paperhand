import NftList from "@/components/NftList";
import { NftContext } from "@/context/NftContext";
import { instructionInitCheckoutExhibit } from "@/utils/instructions/checkout";

import { getAllNftImages } from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import DisplayImages from "./DisplayImages";

export default function UserNftList({ nftList }: { nftList: Nft[] | null }) {
  const { selectedNft } = useContext(NftContext);
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();

  const router = useRouter();
  async function executeInitCheckoutAndExhibit() {
    console.log("creating checkout ", selectedNft.name);

    await instructionInitCheckoutExhibit(
      wallet,
      publicKey,
      signTransaction,
      connection,
      selectedNft
    );

    router.reload(window.location.pathname);
  }

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
        console.log("in symbol", nftSymbol);
        let nfts = colLists[nftSymbol].slice(0, 3);
        let images = await getAllNftImages(nfts);
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
              <div
                className="card card-compact w-52 shadow-xl h-fit bg-base-300"
                key={ind}
              >
                {nftColPics && <DisplayImages images={nftColPics[nftSymbol]} />}
                <div className="card-body">
                  <button
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = "#" + nftSymbol + "-modal";
                    }}
                  >
                    Your {nftSymbol}s
                  </button>
                  <div className="modal" id={`${nftSymbol}-modal`}>
                    <div className="modal-box relative">
                      <h3 className="font-bold text-lg p-2 pb-4">
                        {nftSymbol} Exhibit
                      </h3>
                      <NftList nftList={nftColLists[nftSymbol]} />

                      <div className="btn-group gap-3 justify-end">
                        {selectedNft && (
                          <>
                            <div
                              className="modal-action"
                              onClick={executeInitCheckoutAndExhibit}
                            >
                              <a href="#" className="btn btn-success">
                                Market Sell {selectedNft.name}
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
  );
}
