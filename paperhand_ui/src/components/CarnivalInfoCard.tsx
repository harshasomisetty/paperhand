const CarnivalInfoCard = ({}) => {
  return (
    <div className="card card-side bg-base-100 shadow-xl">
      <figure></figure>
      <div className="card-body">
        <p>exhibitSymbol Carnival</p>
        <h2 className="card-title">New movie is released!</h2>
        <div className="card-actions justify-end">
          <button className="btn btn-primary">Watch</button>
        </div>
      </div>
    </div>
  );
};

export default CarnivalInfoCard;
