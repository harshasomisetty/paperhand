import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { EXHIBITION_PROGRAM_ID } from "@/utils/constants";
import ExhibitList from "@/components/ExhibitList";
import ExplainBanner from "@/components/ExplainBanner";
import {
  checkIfAccountExists,
  getAllExhibitArtifacts,
  getAllNftImages,
  getCarnivalAccountData,
  getExhibitAccountData,
} from "@/utils/retrieveData";
import { getCarnivalAccounts } from "@/utils/accountDerivation";
import DisplayImages from "@/components/DisplayImages";

export default function Collections() {
  const { connection } = useConnection();
  const [exhibits, setExhibits] = useState({});
  const { wallet } = useWallet();

  useEffect(() => {
    async function fetchData() {
      let allExhibitAccounts = await connection.getProgramAccounts(
        EXHIBITION_PROGRAM_ID
      );

      let exhibitsData = {};

      for (let i = 0; i < allExhibitAccounts.length; i++) {
        console.log("exhibit?", allExhibitAccounts[i]);
        let { carnival } = await getCarnivalAccounts(
          allExhibitAccounts[i].pubkey
        );

        if (await checkIfAccountExists(carnival, connection)) {
          let fetchedData = await getCarnivalAccountData(carnival, wallet);
          console.log("fetched data", fetchedData);
          let nfts = await getAllExhibitArtifacts(
            allExhibitAccounts[i].pubkey,
            connection
          );

          let images = await getAllNftImages(nfts);
          exhibitsData[allExhibitAccounts[i].pubkey.toString()] = {
            nftListings: fetchedData.nftListings,
            images: images,
          };
        }
      }

      console.log("exhibits data", exhibitsData);
      setExhibits(exhibitsData);
    }
    if (wallet) {
      fetchData();
    }
  }, [wallet]);

  return (
    <div>
      <p>collection page</p>

      <div className="overflow-x-auto w-full">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Listings</th>
              <th>Floor Price</th>
              <th>Best Offer</th>
              <th>Offer TVL</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(exhibits).map((pubkey, ind) => (
              <tr className="hover" key={ind}>
                <td>
                  <div className="flex items-center space-x-3">
                    <div className="avatar">
                      <div className="mask mask-squircle w-12 h-12">
                        <DisplayImages images={exhibits[pubkey].images} />
                      </div>
                    </div>
                    <p>{pubkey}</p>
                  </div>
                </td>
                <td>{Number(exhibits[pubkey].nftListings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
