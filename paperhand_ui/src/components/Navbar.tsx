import { useRouter } from "next/router";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { CgProfile } from "react-icons/cg";

import Link from "next/link";

const TABS: string[] = ["home", "exhibition", "nftamm", "checkout", "carnival"];
const Navbar = () => {
  const router = useRouter();

  return (
    <div className="navbar rounded-lg bg-neutral-focus border-rounded flex flex-row justify-between border-neutral ">
      <div className="navbar-start">
        <Link href="/">
          <div className="btn btn-ghost hover:btn-link normal-case font-light text-3xl">
            paperhand
          </div>
        </Link>
      </div>
      <div className="navbar-center">
        <ul className="menu menu-horizontal p-0">
          {TABS.slice(1).map((tabName) => (
            <li
              className={`${
                router.pathname.slice(1).split("/")[0] === tabName
                  ? "border-b rounded-none border-primary"
                  : ""
              } `}
              key={tabName}
            >
              <Link href={"/" + tabName}>
                <div>{tabName}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="navbar-end flex flex-row space-x-2 ">
        <Link href={"/profile"}>
          <div className="btn btn-ghost btn-circle">
            <CgProfile size={25} />
          </div>
        </Link>
        <WalletMultiButton />
      </div>
    </div>
  );
};

export default Navbar;
