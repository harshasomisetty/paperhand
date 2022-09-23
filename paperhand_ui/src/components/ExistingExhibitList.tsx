import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  checkIfAccountExists,
  getAllExhibitArtifacts,
  getAllNftImages,
  getCarnivalAccountData,
} from "@/utils/retrieveData";
import DisplayImages from "@/components/DisplayImages";
import { getAllBooths, getOpenBoothId } from "@/utils/carnival_data";
import Link from "next/link";

export default function ExistingExhibitList({ exhibits, base }) {
  return (
    <div>
      <div className="overflow-x-auto w-full">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Names</th>
              <th>Listings</th>
              <th>Floor Price</th>
              <th>Best Offer</th>
              {/* <th>Offer TVL</th> */}
              {/* <th>Volume</th> */}
            </tr>
          </thead>
          <tbody>
            {Object.keys(exhibits).map((pubkey, ind) => (
              <Link href={"/" + base + "/" + pubkey}>
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
