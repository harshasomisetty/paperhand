import { PublicKey } from "@solana/web3.js";

let collectionImages: string[] = [
  "https://arweave.net/rSfYYA2vmF9RuJY98ipN7O50VI_yB1lsD1bjBv-vEjo",
];

export default function ExploreBanner({
  exhibitList,
}: {
  exhibitList: PublicKey[];
}) {
  return (
    <div className="card lg:card-side flex-shrink-0 w-fit border border-neutral-focus shadow-lg bg-base-300 p-4">
      {exhibitList.length > 0 ? (
        <>
          <figure>
            <img
              src={collectionImages[0]}
              alt="Album"
              width={250}
              height={250}
            />
          </figure>
          <div className="card-body">
            <h2 className="card-title">Visit the {} col</h2>
            <p>Click the button to listen on Spotiwhy app.</p>
            <div className="card-actions justify-end">
              <button className="btn btn-primary">Visit</button>
            </div>
          </div>
        </>
      ) : (
        <p>No Collections Created Yet :(</p>
      )}
    </div>
  );
}
