// https://medium.com/linum-labs/intro-to-bonding-curves-and-shapes-bf326bc4e11a

pub enum CurveType {
    Linear,
    Exponential,
    // Sigmoid,
    // Taxation
}

// function that can be plugged into, provided details of cur inventory, delta, fee, etc that can calculate next bid/ask
