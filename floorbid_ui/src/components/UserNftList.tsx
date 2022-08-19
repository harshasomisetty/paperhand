import NftList from "@/components/NftList";
import { NftContext } from "@/context/NftContext";
import { instructionInitCheckoutExhibit } from "@/utils/instructions/checkout";

import { getAllNftImages, getBidOrderData } from "@/utils/retrieveData";
import { Nft } from "@metaplex-foundation/js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useContext, useEffect, useState } from "react";
import DisplayImages from "./DisplayImages";
import { instructionBidFloor } from "@/utils/instructions/checkout";
import { getNftDerivedAddresses } from "@/utils/accountDerivation";

export default function UserNftList({ nftList }: { nftList: Nft[] | null }) {
  const { chosenNfts, chooseNft, clearNfts, addNft, removeNft } =
    useContext(NftContext);
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const [allPrices, setAllPrices] = useState<number[]>([]);

  const router = useRouter();
  async function executeInitCheckoutAndExhibit() {
    // console.log("creating checkout ", selectedNft.name);
    // await instructionInitCheckoutExhibit(
    //   wallet,
    //   publicKey,
    //   signTransaction,
    //   connection,
    //   selectedNft
    // );
  }

  async function executeBidFloor() {
    console.log("bid floor");
    let nft = chosenNfts[Object.keys(chosenNfts)[0]];

    let { exhibit } = await getNftDerivedAddresses(nft);

    await instructionBidFloor(
      wallet,
      publicKey,
      exhibit,
      signTransaction,
      connection,
      chosenNfts
    );

    // router.reload(window.location.pathname);
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

  useEffect(() => {
    async function fetchData() {
      let nft = chosenNfts[Object.keys(chosenNfts)[0]];
      let { exhibit } = await getNftDerivedAddresses(nft);

      console.log("ehxibit", exhibit.toString());
      let { prices } = await getBidOrderData(exhibit, connection, wallet);
      console.log("prices", prices);

      setAllPrices(prices);
    }
    if (Object.keys(chosenNfts).length > 0) {
      fetchData();
    }
  }, [chosenNfts]);

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
                      <div className="sticky top-0 p-2 pb-4 z-20 bg-base-100 border-b border-accent rounded-sm mb-4">
                        <h3 className="font-bold text-lg ">
                          {nftSymbol} Exhibit
                        </h3>
                      </div>
                      <NftList nftList={nftColLists[nftSymbol]} />

                      <div className="sticky bottom-0 left-0 right-0 p-2 pt-4 mt-4 z-20 bg-base-100 border-t border-accent btn-group gap-3 flex flex-row items-end justify-end space-x-6">
                        {Object.keys(chosenNfts).length > 0 && (
                          <>
                            <div className="shadow shadow-base-300 ">
                              <div className="stat-title">
                                {" "}
                                Market Sell {0} {nftSymbol}s
                              </div>
                              <div className="stat-value text-success">
                                +{" "}
                                {allPrices
                                  .slice(0, Object.keys(chosenNfts).length)
                                  .reduce((a, b) => a + b, 0)}{" "}
                                SOL
                              </div>
                            </div>

                            <div
                              className="modal-action"
                              onClick={() => {
                                executeBidFloor();
                                clearNfts();
                              }}
                            >
                              <a
                                href="#"
                                className="btn btn-success btn-outline"
                              >
                                Sell
                              </a>
                            </div>
                          </>
                        )}
                        <div className="modal-action" onClick={clearNfts}>
                          <a href="#" className="btn btn-error btn-outline">
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
