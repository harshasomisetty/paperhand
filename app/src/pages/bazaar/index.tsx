import * as React from "react";
import Layout from "../../components/Layout";
import { NextPage } from "next";
import { useWallet } from "@solana/wallet-adapter-react";
const HomePage: NextPage = () => {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return (
      <Layout title="Bazaar">
        <h1 className="text-center">Bazaar</h1>
        <p className="text-center">plis connect wallet</p>
      </Layout>
    );
  } else {
    return (
      <Layout title="Bazaar">
        <h1 className="text-center">Bazaar</h1>
        <p className="text-center">Wallet is Connected</p>
        {/* <p>{creatorAdd}</p> */}
      </Layout>
    );
  }
};

export default HomePage;
