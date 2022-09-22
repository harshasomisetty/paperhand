import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { EXHIBITION_PROGRAM_ID } from "@/utils/constants";
import {
  checkIfAccountExists,
  getAllExhibitArtifacts,
  getAllNftImages,
  getCarnivalAccountData,
} from "@/utils/retrieveData";
import { getCarnivalAccounts } from "@/utils/accountDerivation";
import DisplayImages from "@/components/DisplayImages";
import { getAllBooths, getOpenBoothId } from "@/utils/carnival_data";
import Link from "next/link";
import ExistingCollections from "@/components/ExistingCollections";

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
        let { carnival } = await getCarnivalAccounts(
          allExhibitAccounts[i].pubkey
        );

        if (await checkIfAccountExists(carnival, connection)) {
          let fetchedData = await getCarnivalAccountData(carnival, wallet);
          let nfts = await getAllExhibitArtifacts(
            allExhibitAccounts[i].pubkey,
            connection
          );

          let numBooths = await getOpenBoothId(carnival, connection, wallet);

          let fetchedBoothInfos = await getAllBooths(
            connection,
            allExhibitAccounts[i].pubkey,
            numBooths,
            wallet
          );

          let floor = Number.MAX_VALUE;
          let ceil = Number.MIN_VALUE;
          for (let index of Object.keys(fetchedBoothInfos)) {
            let data = fetchedBoothInfos[index].data;
            let tempFloor = Number(data.spotPrice);
            let tempCeil = tempFloor + Number(data.delta);

            if (tempFloor < floor) {
              floor = tempFloor;
            }

            if (tempCeil > ceil) {
              ceil = tempCeil;
            }
          }

          let images = await getAllNftImages(nfts);
          exhibitsData[allExhibitAccounts[i].pubkey.toString()] = {
            nftListings: fetchedData.nftListings,
            images: images,
            floor: floor,
            ceil: ceil,
            symbol: fetchedData.exhibitSymbol,
          };
        }
      }

      setExhibits(exhibitsData);
    }
    if (wallet) {
      fetchData();
    }
  }, [wallet]);

  return (
    <div>
      <div className="overflow-x-auto w-full">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Listings</th>
              <th>Floor Price</th>
              <th>Best Offer</th>
              {/* <th>Offer TVL</th> */}
              {/* <th>Volume</th> */}
            </tr>
          </thead>
          <tbody>
            {Object.keys(exhibits).map((pubkey, ind) => (
              <Link href={"/carnival/" + pubkey}>
                <tr className="hover cursor-pointer" key={ind}>
                  <td>
                    <div className="flex items-center space-x-3">
                      <p>{ind + 1}</p>
                      <div className="avatar">
                        <div className="mask mask-squircle w-12 h-12">
                          <DisplayImages images={exhibits[pubkey].images} />
                        </div>
                      </div>
                      <p>{exhibits[pubkey].symbol}</p>
                    </div>
                  </td>
                  <td>{Number(exhibits[pubkey].nftListings)}</td>
                  <td>
                    {(
                      Number(exhibits[pubkey].floor) / LAMPORTS_PER_SOL
                    ).toFixed(3)}{" "}
                    ◎
                  </td>
                  <td>
                    {(Number(exhibits[pubkey].ceil) / LAMPORTS_PER_SOL).toFixed(
                      3
                    )}{" "}
                    ◎
                  </td>
                </tr>
              </Link>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
