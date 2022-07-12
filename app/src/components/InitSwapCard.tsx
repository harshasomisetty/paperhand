import { getExhibitProgramAndProvider } from "@/utils/constants";
import { getUserVoucherTokenBal } from "@/utils/retrieveData";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
const InitSwapCard = () => {
  const { connection } = useConnection();
  const { wallet, publicKey, signTransaction } = useWallet();
  const [userData, setUserData] = useState<number[] | null>();
  const router = useRouter();

  const { exhibitAddress } = router.query;
  useEffect(() => {
    async function fetchData() {
      let exhibit = new PublicKey(exhibitAddress);
      let userTokenVoucherBal = await getUserVoucherTokenBal(
        exhibit,
        publicKey,
        connection
      );
      let userSol = await connection.getBalance(publicKey);
      console.log("balances: ", userTokenVoucherBal, userSol);
      setUserData([
        Number(userTokenVoucherBal),
        Number(userSol) / LAMPORTS_PER_SOL,
      ]);
    }

    if (wallet && publicKey && exhibitAddress) {
      fetchData();
    }
  }, [wallet, exhibitAddress, publicKey]);
  return (
    <>
      {userData ? (
        <div className="card flex-shrink-0 w-full max-w-sm border shadow-lg bg-base-100">
          <div className="card-body">
            <h2 className="card-title">Init Bazaar for this Exhibit!</h2>
            <div className="form-control">
              <p>Sol Balance: {userData[1]}</p>
              <input
                type="text"
                placeholder="Starting Sol Amount"
                className="input input-bordered"
              />
            </div>

            <div className="form-control">
              <p>Voucher Balance: {userData[0]}</p>
              <input
                type="text"
                placeholder="Starting Voucher Amount"
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <button className="btn btn-primary">Activate Bazaar</button>
            </div>
          </div>
        </div>
      ) : (
        <p>Loading Market Data</p>
      )}
    </>
  );
};

export default InitSwapCard;
