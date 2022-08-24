import "@/styles/globals.css";
import React from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { AppProps } from "next/app";
import { FC, useMemo } from "react";
// Use require instead of import since order matters
require("@solana/wallet-adapter-react-ui/styles.css");
import { BiArrowBack } from "react-icons/bi";

import Navbar from "@/components/Navbar";
import { useRouter } from "next/router";

// const logo = require("./logo.png");
const MyApp = ({ Component, pageProps }: AppProps) => {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const router = useRouter();
  const { asPath } = useRouter();
  const network = WalletAdapterNetwork.Devnet;
  // const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const endpoint = useMemo(() => "http://localhost:8899");
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SlopeWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    [network]
  );

  return (
    <div className="min-h-screen p-3" data-theme="dracula">
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <Navbar />
            <BiArrowBack
              size={40}
              onClick={() =>
                router.push(asPath.substring(0, asPath.lastIndexOf("/")))
              }
              className="cursor-pointer"
            />
            <Component {...pageProps} />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </div>
  );
};

export default MyApp;
