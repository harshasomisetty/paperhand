import * as React from "react";
import Layout from "../../components/Layout";
import ExploreExhibits from "../../components/ExploreExhibits";
import { NextPage } from "next";
import { useWallet } from "@solana/wallet-adapter-react";

const HomePage: NextPage = () => {
  const { publicKey } = useWallet();

  if (!publicKey) {
    return (
      <Layout title="Exhibition">
        <h1 className="text-center">Exhibition</h1>
        <p className="text-center">plis connect wallet</p>
      </Layout>
    );
  } else {
    return (
      <Layout title="Exhibition">
        <h1 className="text-center">Exhibition</h1>

        <p className="text-center">Wallet is Connected</p>
        <ExploreExhibits />
      </Layout>
    );
  }
};

export default HomePage;
